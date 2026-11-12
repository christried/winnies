/** The three motion tiers: Ambient loops, Responsive feedback and Celebratory moments. */
export type Tier = "amb" | "resp" | "cel";

/**
 * The dialects the motion engine knows. Same values as `Dialect` in `use-dialect.ts`, declared again because that
 * file uses Nuxt auto-imports and this module must typecheck without Nuxt.
 */
export type MotionDialect = "broadcast" | "showcase" | null;

/** The reference's `D` table keys: one per `--dur-*` token, spelled as the token file spells them. */
export type DurationName
  = | "instant" | "fast" | "base" | "hover" | "toast" | "flick" | "modal" | "page-x" | "tick" | "travel" | "theme"
    | "land" | "jelly" | "minute" | "stamp" | "droop" | "burst" | "hour" | "cheer" | "breathe" | "celebrate" | "wave"
    | "highlight" | "float" | "shimmer" | "page" | "drift";

/** The easings the engine reads: the seven `--ease-*` tokens and the three `--spring-*` curves. */
export type EaseName
  = | "spring" | "hover" | "out" | "in" | "in-out" | "standard" | "stepped" | "snappy" | "bouncy" | "soft";

/** The numeric knobs the dialects, the Calm preset and reduced motion turn, plus the Ambient pause. */
export interface Knobs {
  gain: number;
  hop: number;
  squash: number;
  rate: number;
  particles: number;
  ambientPaused: boolean;
}

/** Durations in milliseconds, easings as CSS strings and the knobs, as read from the tokens. */
export interface Tokens {
  D: Record<DurationName, number>;
  E: Record<EaseName, string>;
  C: Knobs;
}

/**
 * What the engine is told about the surface on every use. It is read fresh on each call, never cached: `interval`
 * changes under a fast clock. `amb`, `resp`, `cel` and `calm` are dormant in 1.0: nothing sets them.
 */
export interface MotionCfg {
  amb?: boolean;
  resp?: boolean;
  cel?: boolean;
  reduced: boolean;
  dialect: MotionDialect;
  calm?: boolean;
  /** The clock's current tick interval in milliseconds. */
  interval: number;
}

/** The part of a computed style the engine reads. */
export type StyleReader = Pick<CSSStyleDeclaration, "getPropertyValue">;

/**
 * Everything the engine asks of the browser, so tests can supply their own. Every member touches its global only when
 * called, never at import, because Nuxt imports the module on the server too.
 */
export interface MotionEnv {
  /** The computed style tokens are read from. */
  computedStyle: (el: Element) => StyleReader;
  /** Whether the browser parses `linear()` easings. */
  supportsLinear: () => boolean;
  /** Whether `prefers-reduced-motion: reduce` matches right now. */
  mediaReduced: () => boolean;
  /** The value of `data-motion` on `<html>`, or null. */
  htmlMotion: () => string | null;
  /** Calls back whenever the reduced-motion media query changes; returns the function that stops listening. */
  onMediaChange: (cb: () => void) => () => void;
  /** Calls back whenever `data-motion` or `data-theme` on `<html>`, or `data-dialect` on `<body>`, changes; returns the function that stops observing. */
  onAttrChange: (cb: () => void) => () => void;
}

/** What a surface hands to `createMotionEngine`. */
export interface MotionOptions {
  /**
   * The element tokens are read from. It must be at or inside `<body>`, never `<html>`: `data-dialect` is on
   * `<body>` and the dialect knobs are declared on `[data-dialect]`, so `<html>` would read the Workspace knobs
   * on every dialect.
   */
  root: () => HTMLElement | null;
  /** The particle layer, or null while it is not mounted. */
  fx: () => HTMLElement | null;
  cfg: () => MotionCfg;
  /** Receives a recipe's sound cue (name and moment ID). Without it `cue()` schedules nothing. */
  cue?: (name: string, id: string) => void;
  env?: Partial<MotionEnv>;
}

/** An element a recipe may be handed before it is mounted. */
export type MaybeEl = HTMLElement | null | undefined;

/** A particle's look: a circle, a four-point spark, or a glyph written as `text:` plus the character. */
export type ParticleShape = "circle" | "spark" | `text:${string}`;

/** Options of `burst`. Every one is optional and falls back to the reference's default. */
export interface BurstOptions {
  /** Particle count; ignores `--particle-count`, which only sets the default. */
  n?: number;
  /** Multiplies the count: 0 turns the burst off. */
  k?: number;
  /** Where on the element the burst starts, as a fraction of its width and height. */
  ox?: number;
  oy?: number;
  shapes?: ParticleShape[];
  /** CSS colours, normally `var(--token)` strings. */
  colors?: string[];
  size?: number;
  /** False sends particles in every direction instead of upwards. */
  up?: boolean;
  /** Centre of the upward cone, in radians. */
  angle?: number;
  cone?: number;
  spread?: number;
  spin?: number;
  gravity?: number;
  dur?: number;
  stagger?: number;
}

/** Options of `rain`. Every one is optional and falls back to the reference's default. */
export interface RainOptions {
  n?: number;
  k?: number;
  size?: number;
  dur?: number;
  /** How long the pieces keep starting, in milliseconds. */
  spread?: number;
}

/** What a digit tick plays on: a Total or a Row digit, on the page or in the Overlay. */
export type TickKind = "total" | "row" | "ov-total" | "ov-row";

/** The clock beat a tick belongs to. */
export type TickBeat = "sec" | "min" | "hour";

/** The six fatigue stages of Winniebert's face. */
export type FatigueStage = 0 | 1 | 2 | 3 | 4 | 5;

/** The ambient and responsive loops, under the names `data-amb` and `data-loop` use. */
export type LoopName
  = | "drift" | "blob1" | "blob2" | "breathe" | "snooze" | "shimmer" | "ring" | "sheen" | "stripes" | "float" | "hop"
    | "bob" | "stick" | "wobble" | "glow" | "twinkle" | "spin" | "skel" | "drip" | "vein" | "steam" | "zzz";

/** What a loop recipe needs: the reference closes over these, this module passes them in. */
export interface LoopContext {
  D: Record<DurationName, number>;
  E: Record<EaseName, string>;
  gain: number;
  calm: boolean;
}

/** A loop's keyframes and timing options, before `iterations` and `delay` are added. */
export type LoopRecipe = (c: LoopContext) => [Keyframe[], KeyframeAnimationOptions];

/** What `loop` is told besides the element and the loop's name. */
export interface LoopOptions {
  /** Start offset in milliseconds, so neighbouring loops do not move in step. */
  delay?: number;
}

/** What `subscribe` callbacks are told. */
export interface MotionState {
  reduced: boolean;
}

/** The motion engine: plumbing, particles, ticks and beats, and every recipe under its handoff name. */
export interface WinniesMotion {
  // plumbing
  D: Record<DurationName, number>;
  E: Record<EaseName, string>;
  T: () => Tokens;
  refresh: (el?: HTMLElement | null) => void;
  on: (tier: Tier) => boolean;
  play: (tier: Tier, el: Element | null | undefined, kf: Keyframe[], opt: KeyframeAnimationOptions) => Animation | null;
  done: (a: Animation | null) => Promise<unknown>;
  wait: (ms: number) => Promise<void>;
  cue: (name: string, id: string, at?: number) => void;

  // listening and loops
  watch: () => () => void;
  subscribe: (cb: (s: MotionState) => void) => () => void;
  loop: (el: HTMLElement, name: LoopName, opt?: LoopOptions) => Animation | null;
  stopLoop: (a: Animation) => void;
  stopLoops: () => void;

  // particles
  burst: (tier: Tier, el: MaybeEl, opt?: BurstOptions) => void;
  rain: (tier: Tier, opt?: RainOptions) => void;

  // ticks and beats
  tick: (digits: HTMLElement[], kind: TickKind, beat: TickBeat, well?: MaybeEl) => void;
  beat: (el: MaybeEl, stage: FatigueStage, minuteOnly?: boolean) => void;
  stageChange: (el: MaybeEl) => void;

  // responsive
  jelly: (tier: Tier, el: MaybeEl, a?: number, dur?: number) => Animation | null;
  release: (el: MaybeEl) => Animation | null;
  menuIn: (el: MaybeEl) => void;
  menuOut: (el: MaybeEl) => Promise<unknown>;
  modalIn: (scrim: MaybeEl, card: MaybeEl) => void;
  modalOut: (scrim: MaybeEl, card: MaybeEl) => Promise<unknown>;
  toastIn: (el: MaybeEl, error?: boolean) => void;
  toastOut: (el: MaybeEl) => Promise<unknown>;
  tipIn: (el: MaybeEl) => Animation | null;
  editIn: (el: MaybeEl) => Animation | null;
  hopText: (el: MaybeEl) => Animation | null;
  shake: (el: MaybeEl) => Animation | null;
  enterRow: (el: MaybeEl) => void;
  exitRow: (el: MaybeEl) => Promise<unknown>;
  capture: (els: [string, HTMLElement][]) => Map<string, DOMRect>;
  flip: (
    prev: Map<string, DOMRect>,
    els: [string, HTMLElement][],
    sc?: number,
    special?: (key: string, el: HTMLElement, dy: number) => boolean | void,
  ) => void;
  arc: (el: HTMLElement, dy: number, after?: () => void) => Animation | null;
  land: (el: MaybeEl) => Animation | null;
  clone: (el: MaybeEl, pitch: number) => void;
  tape: (el: MaybeEl) => void;
  sticker: (el: MaybeEl, delay?: number) => Animation | null;
  pick: (el: MaybeEl) => Animation | null;
  drop: (el: MaybeEl) => Animation | null;
  revert: (outer: MaybeEl, mid: MaybeEl, dy: number) => void;
  roll: (el: MaybeEl, dir: number) => Animation | null;
  full: (well: MaybeEl, ov?: boolean) => void;
  morph: (el: MaybeEl) => Animation | null;
  ringIn: (el: MaybeEl) => Animation | null;
  wave: (digits: Iterable<HTMLElement>, k?: number) => void;
  droop: (digits: Iterable<HTMLElement>) => void;
  stagOut: (els: Iterable<HTMLElement>) => Promise<unknown[]>;
  stagIn: (els: Iterable<HTMLElement>) => void;
  pageOut: (el: MaybeEl, dir: number) => Promise<unknown>;
  pageIn: (el: MaybeEl, dir: number) => void;
  progress: (fill: MaybeEl, fromX: number, toX: number) => Animation | null;
  pop: (el: MaybeEl, s?: number) => Animation | null;
  themeWipe: (layer: MaybeEl, x: number, y: number, color: string, swap: () => void) => void;

  // broadcast
  highlight: (el: MaybeEl) => Animation | null;
  bannerIn: (el: MaybeEl) => Animation | null;
  bannerOut: (el: MaybeEl) => Promise<unknown>;
  mute: (el: MaybeEl, on: boolean) => void;
  pageFlipOut: (rows: Iterable<HTMLElement>) => Promise<unknown[]>;
  pageFlipIn: (rows: Iterable<HTMLElement>) => void;
  cardEnter: (el: MaybeEl) => Animation | null;
  stampIn: (el: MaybeEl) => Animation | null;
  stampOut: (el: MaybeEl) => Promise<unknown>;
  cardHop: (el: MaybeEl) => void;

  // celebratory
  won: (mid: MaybeEl, face: MaybeEl, ov?: boolean) => void;
  niniJump: (el: MaybeEl, n?: number) => Animation | null;
  niniHop: (el: MaybeEl) => Animation | null;
  unfurl: (el: MaybeEl) => Animation | null;
  flash: (el: MaybeEl) => Animation | null;
  bannerDrop: (el: MaybeEl) => Animation | null;
}
