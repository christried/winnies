/**
 * Handles a Winnie completion: Timer stopping and celebration
 */
export function useCompletion() {
  const winnieStore = useWinnieStore();

  watch(
    () => [winnieStore.currentWinnieId, winnieStore.isComplete] as const,
    ([winnieId, complete], [previousId, previousComplete]) => {
      if (winnieId !== previousId)
        return;

      if (complete && previousComplete === false) {
        winnieStore.refreshCurrentWinnie();

        celebrate();
      }
    },
    // Can set `immediate: true` if we want to celebrate() upon opening an already won Winnie
  );
}

/** Runs the celebration unless the visitor asked for less motion. */
async function celebrate() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches)
    return;

  const { default: confetti } = await import("canvas-confetti");
  // TODO: Make more fancy firework stuff: https://www.kirilv.com/canvas-confetti/
  confetti({ particleCount: 400, spread: 250 });
}
