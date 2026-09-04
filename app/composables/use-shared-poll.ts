import type { FetchError } from "ofetch";

const POLL_INTERVAL_MS = 10000;
const MAX_BACKOFF_MS = 60000;

/**
 * Keeps a shared view current by polling.
 * @param slug The share slug being watched.
 * @param onData Called with each fresh payload, to push into the page's state.
 * @param isComplete Whether the Winnie is finished; a finished one never changes again.
 * @returns `lastUpdated` and `failing` for the freshness line, `gone` for the deleted state.
 */
export function useSharedPoll<T>(
  slug: string,
  onData: (data: T) => void,
  isComplete: Ref<boolean>,
) {
  const clock = useServerClock();
  const lastUpdated = ref(clock.now());
  const failing = ref(false);
  const gone = ref(false);
  const stopped = ref(false);

  let delay = POLL_INTERVAL_MS;
  let timer: ReturnType<typeof setTimeout> | undefined;

  async function poll() {
    if (stopped.value || document.hidden)
      return scheduleNextPoll();

    try {
      const data = await $fetch<T>(`/api/share/${slug}`) as T;

      onData(data);
      lastUpdated.value = clock.now();
      failing.value = false;
      delay = POLL_INTERVAL_MS;

      // Winnie has been completed
      if (isComplete.value)
        stopped.value = true;
    }
    catch (error) {
      // Winnie has been deleted
      if ((error as FetchError).statusCode === 404) {
        gone.value = true;
        stopped.value = true;
      }
      else {
        // A blip, not a deletion: keep the last card on screen and back off.
        failing.value = true;
        delay = Math.min(delay * 2, MAX_BACKOFF_MS);
      }
    }

    scheduleNextPoll();
  }

  function scheduleNextPoll() {
    clearTimeout(timer);

    if (!stopped.value)
      timer = setTimeout(poll, delay);
  }

  function onVisibilityChange() {
    if (!document.hidden)
      poll();
  }

  onMounted(() => {
    scheduleNextPoll();
    document.addEventListener("visibilitychange", onVisibilityChange);
  });

  onUnmounted(() => {
    clearTimeout(timer);
    document.removeEventListener("visibilitychange", onVisibilityChange);
  });

  return { lastUpdated, failing, gone };
}
