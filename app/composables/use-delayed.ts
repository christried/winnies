import { ACCEPTED_LOADING_DELAY } from "~~/shared/constants";

/**
 * True only once a condition has held for long enough to be worth showing.
 * In practice used to avoid showing skeletons if there's no data behind it.
 * @param source The condition to watch, usually a pending flag.
 * @param delayMs How long it must stay true before this reports true.
 * @returns A ref that lags the source.
 */
export function useDelayed(source: Ref<boolean>, delayMs = ACCEPTED_LOADING_DELAY) {
  const delayed = ref(false);
  let timer: ReturnType<typeof setTimeout> | undefined;

  watch(source, (active) => {
    clearTimeout(timer);

    if (!active)
      return (delayed.value = false);

    timer = setTimeout(() => (delayed.value = true), delayMs);
  }, { immediate: true });

  onScopeDispose(() => clearTimeout(timer));

  return delayed;
}
