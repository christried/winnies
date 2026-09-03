import type { Serialize, Simplify } from "nitropack/types";
import type { SelectChallenge, SelectWinnie } from "~~/server/db/schema";

/** A Winnie as it arrives as JSON, so its timestamps are ISO strings. */
export type WinnieRow = Simplify<Serialize<SelectWinnie>>;
/** A Challenge as it arrives as JSON, so its timestamps are ISO strings. */
export type ChallengeRow = Simplify<Serialize<SelectChallenge>>;

export interface WinnieWithChallenges extends WinnieRow {
  challenges: ChallengeRow[];
}

export const useWinnieStore = defineStore("winnies", () => {
  const winnies = ref<WinnieRow[]>([]);
  const currentWinnie = ref<WinnieWithChallenges | null>(null);
  const currentWinnieId = useCookie<string | null>("winnies:current-id", {
    default: () => null,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });

  const pending = ref(false);

  // Inline-rename editor state
  const renaming = ref(false);
  const renameDraft = ref("");

  const challenges = computed(() => sortChallenges(currentWinnie.value?.challenges ?? []));

  const editingChallengeId = ref<string | null>(null);

  const totalCount = computed(() => challenges.value.length);
  const wonCount = computed(() => challenges.value.filter(c => c.status === "won").length);
  const runningCount = computed(() => challenges.value.filter(c => c.runningSince !== null).length);

  const percentComplete = computed(() =>
    totalCount.value === 0 ? 0 : Math.round((wonCount.value / totalCount.value) * 100));

  const isComplete = computed(() => isWinnieComplete(challenges.value));

  const request = useRequestFetch();

  // WINNIE LEVEL ACTIONS

  /**
   * Fills the store for the signed-in user.
   * Also selects the last used (cookie) Winnie if available otherwise first in list
   * otherwise null so the picker button does not render.
   */
  async function init() {
    try {
      winnies.value = await request<WinnieRow[]>("/api/winnies");
    }
    catch {
      winnies.value = []; // hopefully fixes the signed out SSR failure in Vercel?
      currentWinnieId.value = null;
      return;
    }

    const saved = currentWinnieId.value;
    const stillExists = saved && winnies.value.some(w => w.id === saved);

    if (stillExists)
      await selectWinnie(saved);
    else if (winnies.value.length)
      await selectWinnie(winnies.value[0]!.id);
    else
      currentWinnieId.value = null;
  }

  /**
   * Adds a Winnie the server has just created and makes it the active one.
   * @param created The row returned by POST /api/winnies, not the values that were typed.
   */
  function addWinnie(created: WinnieRow) {
    winnies.value.unshift(created);
    currentWinnie.value = { ...created, challenges: [] };
    currentWinnieId.value = created.id;
  }

  /**
   * Loads one Winnie with its challenges and makes it the active one.
   * @silent If not silent (default), will set the pending flag to true which will render skeletons delayed.
   */
  async function selectWinnie(id: string, { silent = false } = { }) {
    if (!silent) {
      pending.value = true;
    }

    try {
      currentWinnie.value = await request<WinnieWithChallenges>(`/api/winnies/${id}`);
      currentWinnieId.value = id;
    }
    finally {
      if (!silent) {
        pending.value = false;
      }
    }
  }

  /**
   * Removes a Winnie the server has deleted and falls back to whatever remains.
   * @param deletedWinnieId The Winnie that no longer exists.
   */
  async function removeWinnie(deletedWinnieId: string) {
    winnies.value = winnies.value.filter(winnie => winnie.id !== deletedWinnieId);

    if (currentWinnie.value?.id !== deletedWinnieId)
      return;

    currentWinnie.value = null;
    currentWinnieId.value = null;

    if (winnies.value.length)
      await selectWinnie(winnies.value[0]!.id);
  }

  /** Replaces one Winnie with the server's version of it. */
  function replaceWinnie(updatedWinnie: WinnieRow) {
    const index = winnies.value.findIndex(w => w.id === updatedWinnie.id);

    if (index !== -1)
      winnies.value[index] = updatedWinnie;

    if (currentWinnie.value?.id === updatedWinnie.id)
      Object.assign(currentWinnie.value, updatedWinnie);
  }

  /** Signals to open the inline name editor */
  function startRename() {
    renameDraft.value = currentWinnie.value?.name ?? "";
    renaming.value = true;
  }

  /** Signals to close the inline name editor */
  function stopRename() {
    renaming.value = false;
  }

  // WINNIE TIMER ACTIONS

  let currentRefreshCall: Promise<void> | null = null;
  /** Reloads the active Winnie, integrating successive calls into one request. */
  function refreshCurrentWinnie() {
    if (!currentWinnieId.value)
      return Promise.resolve();

    // Nullish Coalescing Assignment (cool)
    currentRefreshCall ??= selectWinnie(currentWinnieId.value, { silent: true })
      .finally(() => (currentRefreshCall = null));

    return currentRefreshCall;
  }

  const timerInFlight = ref(false);

  /** Starts or stops the total timer optimistically, then syncs after server feedback. */
  async function toggleTotalTimer() {
    const winnie = currentWinnie.value;

    if (!winnie || timerInFlight.value)
      return;

    const clock = useServerClock();
    const fallbackSnapshot = {
      totalRunningSince: winnie.totalRunningSince,
      challenges: winnie.challenges.map(c => ({ ...c })),
    };

    const startingTimer = winnie.totalRunningSince === null;

    if (startingTimer) {
      winnie.totalRunningSince = new Date(clock.now()).toISOString();
    }
    // stopping the Timer
    else {
      const now = clock.now();

      winnie.totalAccumulatedSeconds = elapsedSeconds(
        { accumulatedSeconds: winnie.totalAccumulatedSeconds, runningSince: winnie.totalRunningSince },
        now,
      );
      winnie.totalRunningSince = null;

      // stop all Challenge timers as well
      for (const challenge of winnie.challenges) {
        challenge.accumulatedSeconds = elapsedSeconds(challenge, now);
        challenge.runningSince = null;
      }
    }

    timerInFlight.value = true;

    try {
      const updatedWinnieData = await $fetch(`/api/winnies/${winnie.id}/timer`, {
        method: "POST",
        body: { action: startingTimer ? "start" : "stop" },
      });

      if (updatedWinnieData.winnie)
        resyncWinnie(updatedWinnieData.winnie);

      clock.sync(new Date(updatedWinnieData.serverNow).getTime());
    }
    catch (error) {
      Object.assign(winnie, fallbackSnapshot);
      toastApiError(error);
    }
    finally {
      timerInFlight.value = false;
    }
  }

  /**
   * Takes the server Winnie after changes on several rows.
   * @param updated The Winnie with its challenges, as the timer routes return it.
   */
  function resyncWinnie(updated: WinnieWithChallenges) {
    const { challenges, ...row } = updated;

    currentWinnie.value = updated;
    replaceWinnie(row);
  }

  // CHALLENGE LEVEL ACTIONS

  /**
   * Adds a challenge the server has just created to the current Winnie.
   * @param created The row returned by POST /api/winnies/:id/challenges.
   */
  function addChallenge(created: ChallengeRow) {
    currentWinnie.value?.challenges.push(created);
  }

  /** Replaces one challenge with the server version of it. */
  function replaceChallenge(updatedChallenge: ChallengeRow) {
    const challengeList = currentWinnie.value?.challenges;
    const index = challengeList?.findIndex(challenge => challenge.id === updatedChallenge.id) ?? -1;

    if (challengeList && index !== -1)
      challengeList[index] = updatedChallenge;
  }
  /** Removes a challenge the server has deleted. */
  function removeChallenge(deletedId: string) {
    const winnie = currentWinnie.value;

    if (!winnie)
      return;

    winnie.challenges = winnie.challenges.filter(challenge => challenge.id !== deletedId);
  }

  /** Resets a Challenge timer to 0 in the store after the server reset it. */
  function resetChallengeTimer(challengeId: string) {
    const target = currentWinnie.value?.challenges.find(challenge => challenge.id === challengeId);

    if (target) {
      target.accumulatedSeconds = 0;
      target.runningSince = null;
    }
  }

  /** Inserts a server-duplicated challenge */
  function insertDuplicateChallenge(created: ChallengeRow) {
    const challengeList = currentWinnie.value?.challenges;

    if (!challengeList)
      return;

    // Drop in same slot as done on server
    for (const challenge of challengeList) {
      if (challenge.position >= created.position)
        challenge.position += 1;
    }

    challengeList.push(created);
  }

  /** Applies a reordering to the store. */
  function applyChallengeOrder(ids: string[]) {
    const challengeList = currentWinnie.value?.challenges;

    if (!challengeList)
      return;

    const indexById = new Map(ids.map((id, index) => [id, index]));

    for (const challenge of challengeList) {
      const nextPosition = indexById.get(challenge.id);

      if (nextPosition !== undefined)
        challenge.position = nextPosition;
    }
  }

  /** Wins or Un-Wins a Challenge. */
  async function toggleWin(challengeId: string) {
    const challenge = currentWinnie.value?.challenges.find(c => c.id === challengeId);

    if (!challenge)
      return;

    try {
      const updatedChallenge = await $fetch(`/api/challenges/${challengeId}`, {
        method: "PATCH",
        // DB Query decides if Challenge is Active/Todo if it's un-winning and sets Counter away from maximum if needed
        // Means Frontend can just go win or un-win here :)
        body: { status: challenge.status === "won" ? "active" : "won" },
      });

      replaceChallenge(updatedChallenge);
    }
    catch (error) {
      toastApiError(error);
    }
  }

  // CHALLENGE TIMER ACTIONS

  /** Ids of challenges which are currently toggling their timers so this cant be done twice by accident */
  const challengesBeingToggled = ref(new Set<string>());

  /** Starts or stops one challenge, starting the total too when needed. */
  async function toggleChallengeTimer(challengeId: string) {
    const winnie = currentWinnie.value;
    const challenge = winnie?.challenges.find(c => c.id === challengeId);

    if (!winnie || !challenge || challenge.status === "won" || isComplete.value
      || challengesBeingToggled.value.has(challengeId)) {
      return;
    }

    const clock = useServerClock();
    const fallbackSnapshot = {
      challenge: { ...challenge },
      totalRunningSince: winnie.totalRunningSince,
    };

    const starting = challenge.runningSince === null;

    if (starting) {
      const optimisticNow = new Date(clock.now()).toISOString();
      challenge.runningSince = optimisticNow;
      challenge.status = "active";

      winnie.totalRunningSince ??= optimisticNow;
    }
    else {
      challenge.accumulatedSeconds = elapsedSeconds(challenge, clock.now());
      challenge.runningSince = null;
    }

    challengesBeingToggled.value.add(challengeId);

    try {
      const updatedWinnieData = await $fetch(`/api/challenges/${challengeId}/timer`, {
        method: "POST",
        body: { action: starting ? "start" : "stop" },
      });

      if ("winnie" in updatedWinnieData && updatedWinnieData.winnie)
        resyncWinnie(updatedWinnieData.winnie);

      clock.sync(new Date(updatedWinnieData.serverNow).getTime());
    }
    catch (error) {
      Object.assign(challenge, fallbackSnapshot.challenge);
      winnie.totalRunningSince = fallbackSnapshot.totalRunningSince;
      toastApiError(error);
    }
    finally {
      challengesBeingToggled.value.delete(challengeId);
    }
  }

  return {
    // WINNIE Exports
    winnies,
    currentWinnieId,
    currentWinnie,
    pending,
    renaming,
    renameDraft,
    init,
    addWinnie,
    selectWinnie,
    removeWinnie,
    replaceWinnie,
    startRename,
    stopRename,
    refreshCurrentWinnie,

    // WINNIE Timer Exports
    timerInFlight,
    toggleTotalTimer,

    // CHALLENGE Exports
    challenges,
    totalCount,
    wonCount,
    runningCount,
    percentComplete,
    isComplete,
    editingChallengeId,
    addChallenge,
    replaceChallenge,
    removeChallenge,
    insertDuplicateChallenge,
    resetChallengeTimer,
    applyChallengeOrder,
    toggleWin,

    // CHALLENGE Timer Exports
    challengesBeingToggled,
    toggleChallengeTimer,
  };
});
