let interval: ReturnType<typeof setInterval> | null = null;
let intervalConsumers = 0;

/**
 * The shared clock every timer in the app pulls the time from. Ticks every second.
 * @param serverNow Postgres' current time in milliseconds.
 * @returns A read-only timestamp that updates while the tab is visible.
 */
export function useNow(serverNow?: number) {
  const now = useState("timer:now", () => serverNow ?? Date.now());

  const clock = useServerClock();
  const winnieStore = useWinnieStore();

  function start() {
    if (interval)
      return;

    now.value = clock.now();
    interval = setInterval(() => (now.value = clock.now()), 1000);
  }

  function stop() {
    if (!interval)
      return;

    clearInterval(interval);
    interval = null;
  }

  function onVisibilityChange() {
    if (document.hidden)
      return stop();

    start();
    winnieStore.refreshCurrentWinnie();
  }

  function onFocus() {
    winnieStore.refreshCurrentWinnie();
  }

  // only runs client side :)
  if (import.meta.client) {
    onMounted(() => {
      intervalConsumers++;
      start();
      document.addEventListener("visibilitychange", onVisibilityChange);
      window.addEventListener("focus", onFocus);
    });

    onUnmounted(() => {
      intervalConsumers--;
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", onFocus);

      if (intervalConsumers === 0)
        stop();
    });
  }

  return readonly(now);
}
