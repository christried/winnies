import type { LoopName, WinniesMotion } from "./types";
// When an ambient loop runs: the half of `v-loop` that needs no Vue (#301). The engine's `m.loop` decides whether a loop
// may exist (tier, reduced motion, `--ambient-motion`) and builds it; this host decides when to start it, when to pause
// it because nobody sees it, when to cancel it and when to bring it back. Plain Web Animations on the compositor: no
// timer, no await and no animation frame (rule 8 of `04-motion-and-sound.md`).
import { LOOPS, loopTier } from "./loops";

/** What a loop's owner asks for. Falsy means no loop. */
export type LoopSpec = LoopName | { name: LoopName; delay?: number } | false | null | undefined;

/** The browser, as the host needs it, so tests supply their own. */
export interface LoopEnv {
  /** True while the tab is hidden. */
  hidden: () => boolean;
  /** Calls back when the tab's visibility changes; returns the stop function. */
  onVisibilityChange: (cb: () => void) => () => void;
  /** Calls back with the element's visibility: once with the initial state, then on every change; returns the stop function. */
  observe: (el: HTMLElement, cb: (visible: boolean) => void) => () => void;
}

/** The shared origin on `document.timeline`, in milliseconds: every loop of one name is aligned to it. */
export const LOOP_ORIGIN = 0;

function noop() {}

/**
 * The real browser: IntersectionObserver and `visibilitychange`, each touched only when called. Without an
 * IntersectionObserver (or a document) an element is reported visible once and never again, and the tab is never hidden.
 *
 * @returns the environment
 */
export function browserLoopEnv(): LoopEnv {
  return {
    hidden: () => typeof document !== "undefined" && document.visibilityState === "hidden",
    onVisibilityChange: (cb) => {
      if (typeof document === "undefined")
        return noop;
      document.addEventListener("visibilitychange", cb);
      return () => document.removeEventListener("visibilitychange", cb);
    },
    observe: (el, cb) => {
      if (typeof IntersectionObserver === "undefined") {
        cb(true);
        return noop;
      }
      const io = new IntersectionObserver((entries) => {
        // Entries come oldest first; the last one is where the element is now.
        const last = entries[entries.length - 1];
        if (last)
          cb(last.isIntersecting);
      });
      io.observe(el);
      return () => io.disconnect();
    },
  };
}

/** A loop's name and start offset, the form two specs are compared in. */
interface NormalSpec {
  name: LoopName;
  delay: number;
}

function isLoopName(name: unknown): name is LoopName {
  return typeof name === "string" && Object.hasOwn(LOOPS, name);
}

/**
 * Reads a spec into a name and a delay.
 *
 * @param spec what the owner asked for
 * @returns the pair; null for a falsy spec (no loop); undefined for a name that is not a loop, which nothing acts on
 */
function normalise(spec: LoopSpec): NormalSpec | null | undefined {
  if (!spec)
    return null;
  const name = typeof spec === "string"
    ? spec
    : spec.name;
  if (!isLoopName(name))
    return undefined;
  return {
    name,
    delay: typeof spec === "string"
      ? 0
      : spec.delay ?? 0,
  };
}

/**
 * Whether two specs ask for the same loop: the same name and delay, and a falsy spec equal to another falsy one.
 *
 * @param a one spec
 * @param b the other
 * @returns true when handing the host the second after the first would change nothing
 */
export function sameLoopSpec(a: LoopSpec, b: LoopSpec): boolean {
  const x = normalise(a);
  const y = normalise(b);
  if (!x || !y)
    return x === y;
  return x.name === y.name && x.delay === y.delay;
}

/** The elements whose loops a host keeps in step, and the calls that change them. */
export interface LoopHost {
  /** Starts, switches or (falsy spec) removes the element's loop. Same name and delay as now: does nothing. */
  set: (el: HTMLElement, spec: LoopSpec) => void;
  /** Cancels the element's loop and forgets it. */
  remove: (el: HTMLElement) => void;
  /** Elements being watched. */
  readonly size: number;
}

// What the host keeps per element.
interface Entry extends NormalSpec {
  /** Null while the engine gates the loop: reduced motion, a tier that is off, the Calm preset. */
  anim: Animation | null;
  /** Whether the element is on screen; true until the observer says otherwise, so the loop starts at once. */
  visible: boolean;
  /** Whether the host paused `anim`. */
  paused: boolean;
  stopObserving: () => void;
}

/**
 * Builds the host of one engine's loops. It listens to the tab and to the engine only while it holds an element: an
 * Overlay runs for hours, and a listener left behind is a leak. It is reusable after it empties.
 *
 * @param m the surface's engine
 * @param env the browser; the real one when omitted
 * @returns the host, empty and attached to nothing until the first `set`
 */
export function createLoopHost(m: WinniesMotion, env: LoopEnv = browserLoopEnv()): LoopHost {
  const entries = new Map<HTMLElement, Entry>();
  let detach: (() => void) | null = null;

  // Which animation plays when: a hidden tab or an element off-screen pauses; the reverse resumes. A resumed loop
  // jumps to the phase it would have had if it had run all along, so same-named loops stay in step however long each
  // was off. `play()` comes first, because assigning a `startTime` is what moves the clock.
  function applyPause(entry: Entry) {
    const { anim } = entry;
    if (!anim)
      return;
    const pause = env.hidden() || !entry.visible;
    if (pause && !entry.paused) {
      anim.pause();
      entry.paused = true;
    }
    else if (!pause && entry.paused) {
      anim.play();
      anim.startTime = LOOP_ORIGIN;
      entry.paused = false;
    }
  }

  function start(el: HTMLElement, entry: Entry) {
    entry.anim = m.loop(el, entry.name, { delay: entry.delay });
    entry.paused = false;
    if (!entry.anim)
      return;
    entry.anim.startTime = LOOP_ORIGIN;
    applyPause(entry);
  }

  function cancel(entry: Entry) {
    if (entry.anim)
      m.stopLoop(entry.anim);
    entry.anim = null;
    entry.paused = false;
  }

  function applyAll() {
    entries.forEach(applyPause);
  }

  // The engine changed: reduced motion, a tier, or the tokens. Whatever it cancelled comes back when it may.
  function onEngine() {
    entries.forEach((entry, el) => {
      if (!m.on(loopTier(entry.name))) {
        cancel(entry);
        return;
      }
      if (!entry.anim || entry.anim.playState === "idle") {
        start(el, entry);
        return;
      }
      // A token refresh can change `playbackRate` (the dialect switch); one origin puts old and new loops in step
      // again. A paused loop is left alone: assigning `startTime` would run it, and its resume aligns it anyway.
      if (!entry.paused)
        entry.anim.startTime = LOOP_ORIGIN;
    });
  }

  function attach() {
    const stopTab = env.onVisibilityChange(applyAll);
    const stopEngine = m.subscribe(onEngine);
    detach = () => {
      stopTab();
      stopEngine();
    };
  }

  function remove(el: HTMLElement) {
    const entry = entries.get(el);
    if (!entry)
      return;
    cancel(entry);
    entry.stopObserving();
    entries.delete(el);
    if (!entries.size) {
      detach?.();
      detach = null;
    }
  }

  function set(el: HTMLElement, spec: LoopSpec) {
    const next = normalise(spec);
    if (next === undefined)
      return;
    if (next === null) {
      remove(el);
      return;
    }
    const entry = entries.get(el);
    if (entry) {
      if (entry.name === next.name && entry.delay === next.delay)
        return;
      cancel(entry);
      Object.assign(entry, next);
      start(el, entry);
      return;
    }
    const added: Entry = {
      ...next,
      anim: null,
      visible: true,
      paused: false,
      stopObserving: noop,
    };
    entries.set(el, added);
    if (!detach)
      attach();
    start(el, added);
    // The observer may call back at once, so the entry is in the map before it is asked to observe.
    added.stopObserving = env.observe(el, (visible) => {
      added.visible = visible;
      applyPause(added);
    });
  }

  return {
    set,
    remove,
    get size() {
      return entries.size;
    },
  };
}
