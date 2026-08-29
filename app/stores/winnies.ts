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
  const currentWinnieId = ref<string | null>(null);
  const pending = ref(false);

  const challenges = computed(() => sortChallenges(currentWinnie.value?.challenges ?? []));

  const totalCount = computed(() => challenges.value.length);
  const wonCount = computed(() => challenges.value.filter(c => c.status === "won").length);
  const runningCount = computed(() => challenges.value.filter(c => c.runningSince !== null).length);

  const percentComplete = computed(() =>
    totalCount.value === 0 ? 0 : Math.round((wonCount.value / totalCount.value) * 100));

  const isComplete = computed(() => isWinnieComplete(challenges.value));

  const request = useRequestFetch();

  // actions
  /** Fills the store for the signed-in user. */
  async function init() {
    winnies.value = await request<WinnieRow[]>("/api/winnies");

    if (!currentWinnieId.value && winnies.value.length)
      await selectWinnie(winnies.value[0]!.id);
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

  /** Loads one Winnie with its challenges and makes it the active one. */
  async function selectWinnie(id: string) {
    pending.value = true;

    try {
      currentWinnie.value = await request<WinnieWithChallenges>(`/api/winnies/${id}`);
      currentWinnieId.value = id;
    }
    finally {
      pending.value = false;
    }
  }

  /** Replaces one Winnie with the server's version of it. */
  function replaceWinnie(updatedWinnie: WinnieRow) {
    const index = winnies.value.findIndex(w => w.id === updatedWinnie.id);

    if (index !== -1)
      winnies.value[index] = updatedWinnie;

    if (currentWinnie.value?.id === updatedWinnie.id)
      Object.assign(currentWinnie.value, updatedWinnie);
  }

  return {
    winnies,
    currentWinnieId,
    currentWinnie,
    pending,
    challenges,
    totalCount,
    wonCount,
    runningCount,
    percentComplete,
    isComplete,
    init,
    addWinnie,
    selectWinnie,
    replaceWinnie,
  };
});
