/**
 * Sends counter changes once the clicking stops, never one request per click.
 * @param challengeId The challenge whose count is being written.
 * @returns `schedule` to queue a value, and `flush` to send it immediately.
 */
export function useCounterPersist(challengeId: string) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let queued: number | null = null;

  /** Sends the queued value now, if any, and reconciles the row with the server. */
  async function flush() {
    clearTimeout(timer);

    if (queued === null)
      return;

    const count = queued;
    queued = null;

    try {
      const updatedChallenge = await $fetch(`/api/challenges/${challengeId}/counter`, {
        method: "PATCH",
        body: { op: "set", count },
      });

      // The server may have clamped won the challenge so return values may be different.
      useWinnieStore().replaceChallenge(updatedChallenge);
    }
    catch (error) {
      toastApiError(error);
      await useWinnieStore().refreshCurrentWinnie();
    }
  }

  /**
   * Queues a value and schedules the flush - resetting the schedule on repeated calls.
   * @param count The absolute count to persist once the clicking stops.
   */
  function schedule(count: number) {
    queued = count;
    clearTimeout(timer);
    timer = setTimeout(flush, 400);
  }

  // Without this, a fast click then a tab-close loses the change, thanks Clanker
  onScopeDispose(flush);

  return { schedule, flush };
}
