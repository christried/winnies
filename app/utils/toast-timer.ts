/** The three variants of a toast: the icon, the live-region role and the time it stays. */
export type ToastKind = "success" | "info" | "error";

/** Milliseconds before a toast dismisses itself; null stays until dismissed. Today's values (use-toast.ts before #315). */
export const TOAST_TTL: Record<ToastKind, number | null> = { success: 4000, info: 5000, error: null };

/** The controls of a running countdown. */
export interface ToastTimer {
  /** Stops the countdown; the time left is kept. No-op when paused, expired or stopped. */
  pause: () => void;
  /** Continues with the time left, not a fresh `ms`. No-op when running, expired or stopped. */
  resume: () => void;
  /** Never fires after this. */
  stop: () => void;
}

/**
 * The countdown of a toast. It runs from creation and calls `onExpire` once, unless it is stopped first. Hover and focus
 * pause it, so a toast someone is reading stays until they leave.
 *
 * @param ms the time before `onExpire`
 * @param onExpire what happens when the time has run out
 * @param now the clock, in milliseconds; a test passes one that reads its fake timers
 * @returns the controls
 */
export function createToastTimer(ms: number, onExpire: () => void, now: () => number = () => performance.now()): ToastTimer {
  let left = ms;
  let startedAt = now();
  let handle: ReturnType<typeof setTimeout> | undefined;
  // Neither running nor paused any more: expired or stopped.
  let over = false;

  function arm() {
    startedAt = now();
    handle = setTimeout(() => {
      handle = undefined;
      over = true;
      onExpire();
    }, left);
  }

  arm();

  return {
    pause() {
      if (over || handle === undefined)
        return;
      clearTimeout(handle);
      handle = undefined;
      left = Math.max(0, left - (now() - startedAt));
    },
    resume() {
      if (over || handle !== undefined)
        return;
      arm();
    },
    stop() {
      over = true;
      clearTimeout(handle);
      handle = undefined;
    },
  };
}
