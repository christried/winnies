import type { MotionDialect, MotionEnv, WinniesMotion } from "./types";
// One surface's motion instance: the engine, wired to the surface's root and particle layer, its config and the
// reduced-motion rule that the engine alone cannot keep. No Vue in here, so the node tests exercise it; the composable
// that provides it to a layout's components is `use-winnies-motion.ts` (#300).
import { createMotionEngine } from "./engine";

/** The tick interval until the surface clock supplies its own (#303). */
export const DEFAULT_TICK_INTERVAL_MS = 1000;

/** What a surface tells its motion instance: where its root and particle layer are, and what to tell the engine. */
export interface SurfaceMotionOptions {
  /** The surface's root element, inside `<body>`. */
  root: () => HTMLElement | null;
  /** The particle layer, null until it is mounted. */
  layer: () => HTMLElement | null;
  /** Read live on every engine call: a page sets its dialect after its layout is set up. */
  dialect: () => MotionDialect;
  /** The clock's tick interval; the surface clock passes its own here (#303). */
  interval?: () => number;
  /** Tests only; the browser's by default. */
  env?: Partial<MotionEnv>;
  /** What quieting may cancel; every plain Web Animation in the document by default. */
  animations?: () => Animation[];
}

/** One surface's engine and the two calls that bring it to life and take it down. */
export interface SurfaceMotion {
  m: WinniesMotion;
  /** Starts listening to the media query and the attributes. Browser only, and a second call does nothing. */
  start: () => void;
  /** Stops listening, cancels every animation and empties the particle layer. A second call does nothing. */
  dispose: () => void;
}

/**
 * Turns the `data-dialect` attribute's value into the engine's dialect.
 *
 * @param value the attribute's value, or nothing
 * @returns "broadcast" or "showcase", otherwise null
 */
export function parseDialect(value: string | null | undefined): MotionDialect {
  return value === "broadcast" || value === "showcase"
    ? value
    : null;
}

/**
 * The dialect `<body>` speaks right now.
 *
 * @returns the dialect, or null when there is none or there is no document (the server)
 */
export function bodyDialect(): MotionDialect {
  if (typeof document === "undefined")
    return null;
  return parseDialect(document.body.getAttribute("data-dialect"));
}

/**
 * Whether an animation is a plain Web Animation, which is what the engine's recipes create, and not a CSS animation or
 * transition, which belong to the stylesheet. Shared by quieting and by the transition hooks (#302).
 *
 * @param a any animation of the document
 * @returns true for an animation made by `el.animate()`
 */
export function isPlainAnimation(a: Animation): boolean {
  return !(typeof CSSAnimation !== "undefined" && a instanceof CSSAnimation)
    && !(typeof CSSTransition !== "undefined" && a instanceof CSSTransition);
}

/**
 * Every plain Web Animation in the document: what the engine's recipes create. CSS animations and transitions are the
 * stylesheet's, and the reduced-motion block already stills them. The whole document and not the surface's root,
 * because modals and toasts are teleported out of the root. That is safe because every animation is an engine recipe
 * (CODING_STANDARDS.md § Motion) and a page holds one surface.
 *
 * @returns the animations, empty when there is no document (the server)
 */
export function browserAnimations(): Animation[] {
  if (typeof document === "undefined")
    return [];
  return document.getAnimations().filter(isPlainAnimation);
}

/**
 * Builds the motion instance of one surface.
 *
 * @param o where the surface's root and particle layer are, and what it tells the engine
 * @returns the engine and the two calls that bring it to life and take it down
 */
export function createSurfaceMotion(o: SurfaceMotionOptions): SurfaceMotion {
  const animations = o.animations ?? browserAnimations;
  const m = createMotionEngine({
    root: o.root,
    fx: o.layer,
    cfg: () => ({
      // The engine follows the media query and <html data-motion> by itself; this flag is for a setting.
      reduced: false,
      dialect: o.dialect(),
      // Calm is off in 1.0; the Overlay settings of 6a will drive it.
      calm: false,
      interval: o.interval?.() ?? DEFAULT_TICK_INTERVAL_MS,
    }),
    env: o.env,
  });

  // The engine cancels its loops on reduce. One-shots it does not track, and a cancelled particle never fires
  // `onfinish`, so the particles are cancelled first and then taken out by hand.
  function quiet() {
    animations().forEach((a) => {
      // A finished animation that holds its end state (fill: forwards) is still listed; cancelling it would snap an
      // exited row back.
      if (a.playState === "running" || a.playState === "paused")
        a.cancel();
    });
    const layer = o.layer();
    if (layer)
      [...layer.children].forEach(c => c.remove());
  }

  let stopWatch: (() => void) | null = null;
  let unsubscribe: (() => void) | null = null;

  return {
    m,
    start() {
      if (stopWatch)
        return;
      stopWatch = m.watch();
      unsubscribe = m.subscribe(({ reduced }) => {
        if (reduced)
          quiet();
      });
    },
    dispose() {
      stopWatch?.();
      unsubscribe?.();
      stopWatch = null;
      unsubscribe = null;
      m.stopLoops();
      quiet();
    },
  };
}
