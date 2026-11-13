import type { MotionCfg, MotionEnv, WinniesMotion } from "../../app/utils/motion/types";
// A fake DOM for the motion engine's unit tests. Vitest runs in `node` here, and neither jsdom nor happy-dom has the
// Web Animations API, so the engine is given elements that record what `animate()` was asked to do. The engine takes
// real DOM types, so each fake is produced by one cast inside this file. Shared by the engine's tests (#299) and the
// layer, `v-loop`, hook and clock tests that follow (#300 to #303).
import { createMotionEngine } from "../../app/utils/motion/engine";

/** One `animate()` call, in the order it happened. */
export interface AnimateCall {
  target: FakeElement;
  keyframes: Keyframe[];
  options: KeyframeAnimationOptions;
  animation: FakeAnimation;
}

type PlayState = "running" | "paused" | "finished" | "idle";

/**
 * The part of an `Animation` the recipes use. Time does not pass by itself: a test calls `finish()` to end it.
 * `cancel()` rejects `finished` with an AbortError as the browser does, and marks that promise handled as the browser
 * does, so only a `.then` chain without a `.catch` shows up as an unhandled rejection.
 */
export class FakeAnimation {
  readonly finished: Promise<FakeAnimation>;
  onfinish: (() => void) | null = null;
  oncancel: (() => void) | null = null;
  playbackRate = 1;
  startTime: number | null = null;
  playState: PlayState = "running";
  cancelled = false;
  readonly effect: { getComputedTiming: () => { fill: string } };
  private resolveFinished!: (a: FakeAnimation) => void;
  private rejectFinished!: (e: unknown) => void;

  constructor(
    readonly target: FakeElement,
    readonly keyframes: Keyframe[],
    readonly options: KeyframeAnimationOptions,
  ) {
    this.finished = new Promise((resolve, reject) => {
      this.resolveFinished = resolve;
      this.rejectFinished = reject;
    });
    this.finished.catch(() => {});
    this.effect = {
      getComputedTiming: () => ({ fill: this.options.fill ?? "auto" }),
    };
  }

  /** Ends the animation: resolves `finished` and runs `onfinish`. */
  finish() {
    if (this.playState !== "running" && this.playState !== "paused")
      return;
    this.playState = "finished";
    this.resolveFinished(this);
    this.onfinish?.();
  }

  /** Cancels it: rejects `finished` unless it already finished, and runs `oncancel`. */
  cancel() {
    if (this.playState === "idle")
      return;
    const wasActive = this.playState === "running" || this.playState === "paused";
    this.playState = "idle";
    this.cancelled = true;
    if (wasActive)
      this.rejectFinished(new DOMException("The animation was aborted", "AbortError"));
    this.oncancel?.();
  }

  pause() {
    this.playState = "paused";
  }

  play() {
    this.playState = "running";
  }
}

/** The bounding box a fake element reports. */
export interface FakeRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** What `fakeElement` can be told. */
export interface FakeElementInit {
  rect?: FakeRect;
  offsetWidth?: number;
  offsetHeight?: number;
  children?: FakeElement[];
  dataset?: Record<string, string>;
  /** True when the element sits inside `[data-motion-preset="calm"]`. */
  calmPreset?: boolean;
  /** The harness-wide call log; a new one when omitted. */
  log?: AnimateCall[];
  /** Another element's document, so both create elements into the same log. */
  doc?: FakeDocument;
}

/** A fake element: an `HTMLElement` to the engine, with the recording the tests read. */
export type FakeElement = HTMLElement & {
  calls: AnimateCall[];
  animations: FakeAnimation[];
};

/** The window a fake layer's document reports. */
export interface FakeWindow {
  innerWidth: number;
  innerHeight: number;
  requestAnimationFrame: (cb: () => void) => number;
}

/** A fake document: it makes elements that log into one shared array. */
export interface FakeDocument {
  log: AnimateCall[];
  defaultView: FakeWindow;
  createElement: (tag: string) => FakeElement;
  /** Runs the callbacks queued with `requestAnimationFrame`. */
  flushFrames: () => void;
}

/** A fake element that is also the particle layer: it owns the document that makes particles. */
export type FakeLayer = FakeElement & { flushFrames: () => void };

const CALM_SELECTOR = "[data-motion-preset=\"calm\"]";

/**
 * Builds a DOMRect-shaped box.
 *
 * @param left x of the left edge
 * @param top y of the top edge
 * @param width box width
 * @param height box height
 * @returns an object with the DOMRect fields the engine reads
 */
export function fakeRect(left: number, top: number, width: number, height: number): DOMRect {
  return {
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
    x: left,
    y: top,
    toJSON: () => ({}),
  };
}

/**
 * Builds a fake document.
 *
 * @param log the array every `animate()` call of its elements is pushed to
 * @param width the window's `innerWidth`
 * @param height the window's `innerHeight`
 * @returns the document
 */
export function fakeDocument(log: AnimateCall[] = [], width = 1000, height = 800): FakeDocument {
  let frames: (() => void)[] = [];
  const doc: FakeDocument = {
    log,
    defaultView: {
      innerWidth: width,
      innerHeight: height,
      requestAnimationFrame: (cb) => {
        frames.push(cb);
        return frames.length;
      },
    },
    createElement: () => buildElement({ doc }),
    flushFrames: () => {
      const run = frames;
      frames = [];
      run.forEach(cb => cb());
    },
  };
  return doc;
}

function buildElement(init: FakeElementInit): FakeElement {
  const doc = init.doc ?? fakeDocument(init.log);
  const calls: AnimateCall[] = [];
  const animations: FakeAnimation[] = [];
  const children: FakeElement[] = [
    ...(init.children ?? []),
  ];
  let parent: FakeElement | null = null;
  const rect = init.rect ?? { left: 0, top: 0, width: 0, height: 0 };
  const el = {
    calls,
    animations,
    children,
    style: {} as Record<string, string | number>,
    dataset: { ...init.dataset },
    textContent: "",
    offsetWidth: init.offsetWidth ?? 0,
    offsetHeight: init.offsetHeight ?? 0,
    ownerDocument: doc,
    setParent: (p: FakeElement | null) => {
      parent = p;
    },
    animate: (keyframes: Keyframe[], options: KeyframeAnimationOptions = {}) => {
      const animation = new FakeAnimation(el, keyframes, options);
      animations.push(animation);
      const call = {
        target: el,
        keyframes,
        options,
        animation,
      };
      calls.push(call);
      doc.log.push(call);
      return animation;
    },
    // What the browser lists: running or paused animations, and finished ones that still hold their end state. With
    // `subtree`, those of every descendant too.
    getAnimations: (opts?: { subtree?: boolean }): FakeAnimation[] => [
      ...animations.filter((a) => {
        if (a.playState === "idle")
          return false;
        if (a.playState === "finished")
          return a.options.fill === "forwards" || a.options.fill === "both";
        return true;
      }),
      ...(opts?.subtree
        ? children.flatMap(c => (c as unknown as { getAnimations: (o: { subtree: boolean }) => FakeAnimation[] }).getAnimations({ subtree: true }))
        : []),
    ],
    getBoundingClientRect: () => fakeRect(rect.left, rect.top, rect.width, rect.height),
    closest: (selector: string) => (init.calmPreset && selector === CALM_SELECTOR
      ? el
      : null),
    appendChild: (child: FakeElement) => {
      children.push(child);
      (child as unknown as { setParent: (p: FakeElement | null) => void }).setParent(el);
      return child;
    },
    remove: () => {
      const siblings = parent?.children as unknown as FakeElement[] | undefined;
      const at = siblings?.indexOf(el) ?? -1;
      if (at >= 0)
        siblings?.splice(at, 1);
      parent = null;
    },
  } as unknown as FakeElement;
  return el;
}

/**
 * Builds a fake element.
 *
 * @param init its box, children, dataset and whether it sits in a Calm preset
 * @returns the element, to hand to a recipe
 */
export function fakeElement(init: FakeElementInit = {}): FakeElement {
  return buildElement(init);
}

/**
 * Builds the particle layer: an element whose document makes more fake elements, and whose animation frames run when
 * `flushFrames()` is called.
 *
 * @param init the layer's size and the call log
 * @param init.width the layer's width, also the window's `innerWidth`
 * @param init.height the layer's height, also the window's `innerHeight`
 * @param init.log the array every `animate()` call is pushed to
 * @returns the layer
 */
export function fakeLayer(init: { width: number; height: number; log?: AnimateCall[] }): FakeLayer {
  const doc = fakeDocument(init.log, init.width, init.height);
  const layer = buildElement({
    doc,
    rect: {
      left: 0,
      top: 0,
      width: init.width,
      height: init.height,
    },
    offsetWidth: init.width,
    offsetHeight: init.height,
  }) as FakeLayer;
  layer.flushFrames = doc.flushFrames;
  return layer;
}

/** Token name to value, as `getComputedStyle(el).getPropertyValue` would give it. */
export type TokenMap = Record<string, string>;

/** A fake environment: a settable style map, `linear()` support, a media query and `<html>` attributes. */
export interface FakeEnv extends MotionEnv {
  linear: boolean;
  mediaMatches: boolean;
  /** Replaces the tokens the engine reads. */
  styleOf: (map: TokenMap) => void;
  /** Flips the media query and tells its listeners. */
  changeMedia: (matches?: boolean) => void;
  /** Sets (or with null removes) an attribute and tells the attribute observers. */
  setAttr: (name: string, value: string | null) => void;
  readonly mediaListeners: number;
  readonly attrObservers: number;
}

/**
 * Builds a fake environment.
 *
 * @param init the tokens it reads, whether `linear()` is supported and whether the media query matches
 * @param init.styles the token map the engine reads
 * @param init.linear whether `linear()` easings are supported; true when omitted
 * @param init.reduced whether the reduced-motion media query matches at the start
 * @returns the environment
 */
export function fakeEnv(init: { styles?: TokenMap; linear?: boolean; reduced?: boolean } = {}): FakeEnv {
  let styles: TokenMap = { ...init.styles };
  const attrs: Record<string, string> = {};
  const media = new Set<() => void>();
  const observers = new Set<() => void>();
  const env: FakeEnv = {
    linear: init.linear ?? true,
    mediaMatches: init.reduced ?? false,
    styleOf: (map) => {
      styles = { ...map };
    },
    changeMedia: (matches) => {
      if (matches !== undefined)
        env.mediaMatches = matches;
      [...media].forEach(cb => cb());
    },
    setAttr: (name, value) => {
      if (value === null)
        delete attrs[name];
      else
        attrs[name] = value;
      [...observers].forEach(cb => cb());
    },
    get mediaListeners() {
      return media.size;
    },
    get attrObservers() {
      return observers.size;
    },
    computedStyle: () => ({
      getPropertyValue: (name: string) => styles[name] ?? "",
    }),
    supportsLinear: () => env.linear,
    mediaReduced: () => env.mediaMatches,
    htmlMotion: () => attrs["data-motion"] ?? null,
    onMediaChange: (cb) => {
      media.add(cb);
      return () => media.delete(cb);
    },
    onAttrChange: (cb) => {
      observers.add(cb);
      return () => observers.delete(cb);
    },
  };
  return env;
}

function dur(table: Record<string, number>): TokenMap {
  return Object.fromEntries(Object.entries(table).map(([k, v]) => [`--dur-${k}`, `${v}ms`]));
}

/** The easings as `winnies-tokens.css` writes them (with spaces), which is what Workspace tokens hand the engine. */
export const EASE = {
  "spring": "cubic-bezier(.3, 1.7, .5, 1)",
  "hover": "cubic-bezier(.3, 1.8, .5, 1)",
  "out": "cubic-bezier(.15, .7, .3, 1)",
  "in": "cubic-bezier(.55, 0, .75, .2)",
  "in-out": "cubic-bezier(.45, 0, .55, 1)",
  "standard": "cubic-bezier(.2, 0, 0, 1)",
  "stepped": "steps(6, end)",
  "snappy": "linear(0, .2 4%, .6 10%, .88 16%, 1.02 22%, 1.06 28%, 1.04 36%, 1 46%, .995 60%, 1)",
  "bouncy": "linear(0, .3 6%, .8 13%, 1.1 20%, 1.15 25%, 1.1 30%, .97 40%, .95 46%, 1 56%, 1.02 64%, 1 78%, 1)",
  "soft": "linear(0, .12 5%, .4 14%, .7 24%, .92 34%, 1.02 44%, 1.03 52%, 1.01 66%, 1)",
} as const;

/** The resting keyframe the recipes start and end a hop on: the reference writes the transform as a bare `none`. */
export const NONE = { transform: "none" };

/** Jelly's keyframes as the reference writes them, for amplitude `a` (already multiplied by the gain). */
export function jellyKf(a: number): Keyframe[] {
  return [
    { transform: "scale(1,1)" },
    { transform: `scale(${1 + 0.07 * a},${1 - 0.12 * a})`, offset: 0.18 },
    { transform: `scale(${1 - 0.06 * a},${1 + 0.08 * a})`, offset: 0.42 },
    { transform: `scale(${1 + 0.03 * a},${1 - 0.03 * a})`, offset: 0.68 },
    { transform: "scale(1,1)" },
  ];
}

/** Workspace tokens, as `winnies-tokens.css` declares them on `:root`. */
export const WORKSPACE: TokenMap = {
  ...dur({
    "instant": 90,
    "fast": 160,
    "base": 240,
    "hover": 300,
    "toast": 360,
    "flick": 380,
    "modal": 420,
    "page-x": 460,
    "tick": 480,
    "travel": 560,
    "theme": 560,
    "land": 600,
    "jelly": 700,
    "minute": 720,
    "stamp": 900,
    "droop": 950,
    "burst": 1300,
    "hour": 1400,
    "cheer": 1800,
    "breathe": 2200,
    "celebrate": 2400,
    "wave": 2600,
    "highlight": 3000,
    "float": 4800,
    "shimmer": 9000,
    "page": 10000,
    "drift": 60000,
  }),
  "--ease-spring": EASE.spring,
  "--ease-hover": EASE.hover,
  "--ease-out": EASE.out,
  "--ease-in": EASE.in,
  "--ease-in-out": EASE["in-out"],
  "--ease-standard": EASE.standard,
  "--ease-stepped": EASE.stepped,
  "--spring-snappy": EASE.snappy,
  "--spring-bouncy": EASE.bouncy,
  "--spring-soft": EASE.soft,
  "--motion-gain": "1",
  "--tick-hop": "-6px",
  "--tick-squash": ".04",
  "--amb-rate": "1",
  "--particle-count": "24",
  "--ambient-motion": "running",
};

/**
 * Overlays tokens on a base map.
 *
 * @param base the map to start from
 * @param overrides the tokens that replace or extend it
 * @returns a new map
 */
export function withTokens(base: TokenMap, overrides: TokenMap): TokenMap {
  return {
    ...base,
    ...overrides,
  };
}

/** What `[data-dialect="broadcast"]` redeclares. */
export const BROADCAST: TokenMap = withTokens(WORKSPACE, {
  "--motion-gain": "1.25",
  "--tick-hop": "-10px",
  "--tick-squash": "0",
  "--particle-count": "28",
  "--dur-burst": "1000ms",
});

/** What `[data-dialect="showcase"]` redeclares. */
export const SHOWCASE: TokenMap = withTokens(WORKSPACE, {
  "--motion-gain": "1.6",
  "--tick-hop": "-14px",
  "--tick-squash": ".1",
  "--amb-rate": "1.4",
  "--particle-count": "48",
});

/** What `[data-motion-preset="calm"]` redeclares. */
export const CALM: TokenMap = withTokens(WORKSPACE, {
  "--motion-gain": ".6",
  "--tick-hop": "-4px",
  "--tick-squash": "0",
  "--amb-rate": ".5",
  "--particle-count": "0",
});

/**
 * What the reduced-motion block redeclares: the 21 durations it zeroes, and the knobs. The six durations it leaves
 * (`breathe`, `wave`, `float`, `shimmer`, `page`, `drift`) keep their Workspace value.
 */
export const REDUCED: TokenMap = withTokens(WORKSPACE, {
  "--ambient-motion": "paused",
  "--motion-gain": "0",
  "--tick-hop": "0px",
  "--tick-squash": "0",
  "--particle-count": "0",
  ...Object.fromEntries([
    "instant",
    "fast",
    "base",
    "hover",
    "toast",
    "flick",
    "modal",
    "page-x",
    "tick",
    "travel",
    "theme",
    "land",
    "jelly",
    "minute",
    "stamp",
    "droop",
    "burst",
    "hour",
    "cheer",
    "celebrate",
    "highlight",
  ].map(k => [`--dur-${k}`, "0ms"])),
});

/** What `motionHarness` can be told. */
export interface HarnessInit {
  tokens?: TokenMap;
  cfg?: Partial<MotionCfg>;
  linear?: boolean;
  /** Pass a recording `cue` hook to the engine. Without it `cue()` schedules nothing. */
  cue?: boolean;
  width?: number;
  height?: number;
}

/** An engine wired to fakes, and everything a test reads from them. */
export interface MotionHarness {
  m: WinniesMotion;
  /** Every `animate()` call of every element, in order. */
  log: AnimateCall[];
  layer: FakeLayer;
  root: FakeElement;
  cfg: MotionCfg;
  env: FakeEnv;
  /** The `[name, id]` pairs the `cue` hook received. */
  cues: [string, string][];
  setCfg: (patch: Partial<MotionCfg>) => void;
  /** A fake element that logs into the same `log`. */
  el: (init?: FakeElementInit) => FakeElement;
}

/**
 * Builds the engine over fakes: Workspace tokens read once, `interval` 1000, not reduced, no dialect.
 *
 * @param init tokens, config and layer size to start from
 * @returns the engine and its fakes
 */
export function motionHarness(init: HarnessInit = {}): MotionHarness {
  const log: AnimateCall[] = [];
  const layer = fakeLayer({ width: init.width ?? 1000, height: init.height ?? 800, log });
  const root = fakeElement({ log });
  const cfg: MotionCfg = {
    reduced: false,
    dialect: null,
    interval: 1000,
    ...init.cfg,
  };
  const env = fakeEnv({ styles: init.tokens ?? WORKSPACE, linear: init.linear });
  const cues: [string, string][] = [];
  const m = createMotionEngine({
    root: () => root,
    fx: () => layer,
    cfg: () => cfg,
    ...(init.cue
      ? {
          cue: (name: string, id: string) => void cues.push([name, id]),
        }
      : {}),
    env,
  });
  m.refresh(root);
  return {
    m,
    log,
    layer,
    root,
    cfg,
    env,
    cues,
    setCfg: (patch) => {
      Object.assign(cfg, patch);
    },
    el: (elInit = {}) => fakeElement({ log, ...elInit }),
  };
}
