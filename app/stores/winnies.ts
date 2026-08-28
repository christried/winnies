import type { SelectChallenge, SelectWinnie } from "~~/server/db/schema";

export interface WinnieWithChallenges extends SelectWinnie {
  challenges: SelectChallenge[];
}

export const useWinnieStore = defineStore("winnies", () => {
  const winnies = ref<SelectWinnie[]>([]);
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

  /** Fills the store for the signed-in user. */
  async function init() {
    winnies.value = await request<SelectWinnie[]>("/api/winnies");

    if (!currentWinnieId.value && winnies.value.length)
      await selectWinnie(winnies.value[0]!.id);
  }

  /** Replaces one Winnie with the server's version of it. */
  function replaceWinnie(updatedWinnie: SelectWinnie) {
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
    selectWinnie,
    replaceWinnie,
  };
});
