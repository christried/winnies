/**
 * A clock for the tab title alone, ticking every second whether the tab is
 * visible or not ({@link useNow} stops on tabbing away)
 * @param serverNow Postgres' current time in milliseconds.
 * @returns A read-only timestamp that updates once a second, hidden or not.
 */
export function useTitleNow(serverNow?: number) {
  const now = useState("timer:title-now", () => serverNow ?? Date.now());
  const clock = useServerClock();

  let interval: ReturnType<typeof setInterval> | null = null;

  function onVisible() {
    if (!document.hidden)
      now.value = clock.now();
  }

  if (import.meta.client) {
    onMounted(() => {
      now.value = clock.now();
      interval = setInterval(() => (now.value = clock.now()), 1000);
      document.addEventListener("visibilitychange", onVisible);
    });

    onUnmounted(() => {
      if (interval)
        clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    });
  }

  return readonly(now);
}
