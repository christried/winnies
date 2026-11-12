// The CSS keyframes this phase once synchronised are gone; R1's motion engine replaces this composable.
const PULSE_MS = 1500;

const origin = Date.now();

/**
 * A CSS animation-delay that drops a pulsing element into one shared rhythm.
 * @param active Whether this element is currently pulsing.
 * @returns A reactive CSS time for `animation-delay`.
 */
export function usePulseDelay(active: MaybeRefOrGetter<boolean>) {
  const delay = ref("0ms");

  function resync() {
    delay.value = `-${(Date.now() - origin) % PULSE_MS}ms`;
  }

  watch(() => toValue(active), (isActive) => {
    if (isActive)
      resync();
  });

  onMounted(() => {
    if (toValue(active))
      resync();
  });

  return delay;
}
