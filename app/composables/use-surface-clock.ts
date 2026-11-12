import type { InjectionKey, Ref } from "vue";
// A surface's one clock (#303, ADR-0003): a `setTimeout` chain aligned to the second of the server-corrected source,
// which keeps running in a hidden tab. Nothing reads it yet; #304 swaps `useNow`/`useTitleNow` for it. The core,
// `createSurfaceClock`, has no Nuxt in it, so the node tests drive it; `provideSurfaceClock` is the Nuxt-bound adapter
// the layouts call. Vue is imported explicitly, and nothing at module level holds state or touches a browser global:
// a module-level clock would be shared between server requests.
import { inject, onBeforeUnmount, onMounted, provide, readonly, ref } from "vue";

/** What a tick crossed. The same literals as `TickBeat` in `utils/motion/types.ts`, which this file must not import. */
export type ClockBeat = "sec" | "min" | "hour";

/** Where the clock reads the time from. */
export interface ClockSource {
  /** Milliseconds since the epoch, server-corrected; the product's is `useServerClock().now`. */
  now: () => number;
  /** Source seconds per real second, above 0, default 1. A story runs a clock fast with it. */
  rate?: number;
}

/** What a component sees of its surface's clock. */
export interface SurfaceClock {
  /** The source's reading at the latest tick, not snapped to the second: the old clocks held the raw reading too. */
  now: Readonly<Ref<number>>;
  /** The latest tick's beat; "sec" until the first tick. */
  beat: Readonly<Ref<ClockBeat>>;
  /** `document.hidden`; false on the server and until the clock is started. */
  hidden: Readonly<Ref<boolean>>;
  /** Real milliseconds between ticks, 1000 / rate. A function because the motion instance takes `() => number`. */
  interval: () => number;
  /** Calls back on every tick, after `now` and `beat` are set. Returns the unsubscribe. */
  onBeat: (cb: (beat: ClockBeat, now: number) => void) => () => void;
  /** Browser only. A second call does nothing. */
  start: () => void;
  /** Clears the timer and the visibility listener. A second call does nothing. */
  stop: () => void;
}

/** How the clock learns whether the tab is hidden. The document's by default. */
export interface ClockVisibility {
  hidden: () => boolean;
  /** Calls back on every change; returns the unsubscribe. */
  subscribe: (cb: () => void) => () => void;
}

/** What `createSurfaceClock` is built from. */
export interface SurfaceClockOptions {
  source: ClockSource;
  /** The ref to write the reading into; `ref(source.now())` by default. */
  now?: Ref<number>;
  visibility?: ClockVisibility;
}

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;

// Read lazily, so the module loads on the server and `start()` is the first thing to touch `document`.
const documentVisibility: ClockVisibility = {
  hidden: () => document.hidden,
  subscribe: (cb) => {
    document.addEventListener("visibilitychange", cb);
    return () => document.removeEventListener("visibilitychange", cb);
  },
};

/**
 * Builds a clock. Nothing runs until `start()`.
 *
 * @param options the source of the time, and optionally the ref to write and a stand-in for the document
 * @returns a clock that has not started yet
 * @throws {RangeError} when the source's rate is not a positive finite number
 */
export function createSurfaceClock(options: SurfaceClockOptions): SurfaceClock {
  const { source } = options;
  const rate = source.rate ?? 1;
  if (!Number.isFinite(rate) || rate <= 0)
    throw new RangeError(`A clock's rate must be a positive finite number, got ${rate}.`);

  const now = options.now ?? ref(source.now());
  const beat = ref<ClockBeat>("sec");
  const hidden = ref(false);
  const visibility = options.visibility ?? documentVisibility;
  const listeners = new Set<(beat: ClockBeat, now: number) => void>();

  let running = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let unsubscribeVisibility: (() => void) | null = null;
  // The reading of the latest tick: the next tick measures the boundaries it crossed against it.
  let last = 0;

  // Every delay is computed from the source's own second boundary, never a fixed 1000: no drift to accumulate, a
  // `sync()` that moves the offset corrects itself at the next tick, and a late timer shortens the next delay.
  function arm() {
    if (timer !== null)
      clearTimeout(timer);
    const remaining = SECOND - (source.now() % SECOND);
    timer = setTimeout(fire, Math.max(1, remaining / rate));
  }

  function crossed(t: number): ClockBeat {
    if (Math.floor(t / HOUR) !== Math.floor(last / HOUR))
      return "hour";
    if (Math.floor(t / MINUTE) !== Math.floor(last / MINUTE))
      return "min";
    return "sec";
  }

  function fire() {
    timer = null;
    const t = source.now();
    const second = Math.floor(t / SECOND);
    const lastSecond = Math.floor(last / SECOND);
    if (second <= lastSecond) {
      // Early, or a frozen source: nothing to report. A source that went back (a `sync()` to an earlier time) makes
      // this the new reference, or the clock would stand still until the source caught up with the old one.
      if (second < lastSecond)
        last = t;
      arm();
      return;
    }
    const b = crossed(t);
    last = t;
    // The beat first, so a watcher on `now` reads this tick's beat.
    beat.value = b;
    now.value = t;
    try {
      [...listeners].forEach(cb => cb(b, t));
    }
    finally {
      // A listener that throws, or that stops the clock, must not leave the chain broken or running.
      if (running)
        arm();
    }
  }

  function onVisibilityChange() {
    hidden.value = visibility.hidden();
    // Back in view: the browser may have throttled the timer, so read the source at once instead of waiting for it.
    if (!hidden.value && running) {
      if (timer !== null)
        clearTimeout(timer);
      fire();
    }
  }

  return {
    now: readonly(now),
    beat: readonly(beat),
    hidden: readonly(hidden),
    interval: () => SECOND / rate,
    onBeat(cb) {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },
    start() {
      if (running)
        return;
      running = true;
      hidden.value = visibility.hidden();
      last = source.now();
      now.value = last;
      unsubscribeVisibility = visibility.subscribe(onVisibilityChange);
      arm();
    },
    stop() {
      running = false;
      if (timer !== null)
        clearTimeout(timer);
      timer = null;
      unsubscribeVisibility?.();
      unsubscribeVisibility = null;
    },
  };
}

export const WINNIES_CLOCK_KEY: InjectionKey<SurfaceClock> = Symbol("winnies-clock");

/**
 * Creates the surface's one clock and provides it to everything below the layout. Call it in the layout's
 * `<script setup>`, before any `await`: a provide after an await is lost.
 *
 * @param options a source and a ref to write, for stories and tests; the product passes none
 * @param options.source the time source; the server-corrected clock by default
 * @param options.now the ref the reading goes into; `useState("surface:now")` by default, so the server's value rides
 * the payload and a consumer hydrates without a mismatch
 * @returns the clock, for the layout's own use
 */
export function provideSurfaceClock(options: { source?: ClockSource; now?: Ref<number> } = {}): SurfaceClock {
  // Only when the option is absent, so a node test that passes both never touches Nuxt.
  const source = options.source ?? { now: useServerClock().now };
  const now = options.now ?? useState<number>("surface:now", () => source.now());
  const clock = createSurfaceClock({ source, now });
  provide(WINNIES_CLOCK_KEY, clock);
  // `onMounted` does not run on the server, so no timer is ever armed there.
  onMounted(clock.start);
  onBeforeUnmount(clock.stop);
  return clock;
}

/**
 * Picks the clock a component found, or says there is none.
 *
 * @param found what `inject` returned
 * @param strict true in development: a component outside a surface is a bug to see, not to survive
 * @returns the clock; when there is none and `strict` is false, an inert one that is never started
 */
export function resolveSurfaceClock(found: SurfaceClock | null, strict: boolean): SurfaceClock {
  if (found)
    return found;
  if (strict)
    throw new Error("useSurfaceClock() was called outside a surface. Render the component under a layout that calls provideSurfaceClock().");
  // A fresh clock on every call: one shared across requests would leak its subscribers.
  return createSurfaceClock({
    source: {
      now: () => 0,
    },
  });
}

/**
 * The clock of the surface a component renders under.
 *
 * @returns the clock, or the inert fallback outside a surface in production
 */
export function useSurfaceClock(): SurfaceClock {
  return resolveSurfaceClock(inject(WINNIES_CLOCK_KEY, null), import.meta.dev);
}
