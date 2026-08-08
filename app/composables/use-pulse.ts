const PULSE_MS = 1500; // keep in sync with --animate-pulse-run in main.css
const origin = Date.now();

export function usePulseDelay(): string {
  return `-${(Date.now() - origin) % PULSE_MS}ms`;
}
