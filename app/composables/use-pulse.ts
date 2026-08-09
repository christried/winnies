const PULSE_MS = 1500; // !IMPORTANT: Keep in sync with main.css

const origin = Date.now();

/**
 * Offset function that syncs an element that uses this composable into the rhythm
 * initiated above.
 * @returns A CSS time suitable for `animation-delay`
 */
export function usePulseDelay(): string {
  return `-${(Date.now() - origin) % PULSE_MS}ms`;
}
