import type { LoopName, LoopRecipe, Tier } from "./types";

/* eslint-disable jsdoc/require-jsdoc -- one entry per loop name: the table's block says what they are, a block each would only repeat the name */
/**
 * Every ambient and responsive loop as keyframes and timing options, ported line for line from the reference. The
 * reference's closures over its tokens, `g()` and `calm()` arrive as the context. Gain and durations are baked in when
 * a loop starts and do not change on a refresh; only `playbackRate` does.
 */
export const LOOPS: Record<LoopName, LoopRecipe> = {
  drift: c => [
    [
      { transform: "translate(0,0)" },
      { transform: "translate(52px,52px)" },
    ],
    { duration: c.D.drift, easing: "linear" },
  ],
  blob1: c => [
    [
      { transform: "translate(0,0) scale(1)" },
      { transform: "translate(40px,30px) scale(1.08)" },
    ],
    { duration: c.D.drift * 0.3, easing: c.E["in-out"], direction: "alternate" },
  ],
  blob2: c => [
    [
      { transform: "translate(0,0) scale(1.04)" },
      { transform: "translate(-36px,-24px) scale(.92)" },
    ],
    { duration: c.D.drift * 0.37, easing: c.E["in-out"], direction: "alternate" },
  ],
  breathe: (c) => {
    const a = 0.04 * c.gain;
    return [
      [
        { transform: "scale(1,1)" },
        { transform: `scale(${1 + a},${1 - a})` },
        { transform: `scale(${1 - a / 2},${1 + a * 0.75})` },
        { transform: "scale(1,1)" },
      ],
      { duration: c.D.breathe, easing: c.E["in-out"] },
    ];
  },
  snooze: (c) => {
    const a = 0.03 * c.gain;
    return [
      [
        { transform: "scale(1,1)" },
        { transform: `scale(${1 + a},${1 - a})` },
        { transform: "scale(1,1)" },
      ],
      { duration: c.D.breathe * 1.45, easing: c.E["in-out"] },
    ];
  },
  shimmer: c => [
    [
      { transform: "translateX(-150%) skewX(-18deg)" },
      { transform: "translateX(350%) skewX(-18deg)", offset: 0.16 },
      { transform: "translateX(350%) skewX(-18deg)" },
    ],
    { duration: c.D.shimmer * (c.calm ? 2 : 1), easing: c.E["in-out"] },
  ],
  ring: c => [
    [
      { opacity: 0.25 },
      { opacity: 0.85 },
      { opacity: 0.25 },
    ],
    { duration: c.D.breathe, easing: c.E["in-out"] },
  ],
  sheen: c => [
    [
      { transform: "translateX(-120%) skewX(-18deg)" },
      { transform: "translateX(520%) skewX(-18deg)", offset: 0.3 },
      { transform: "translateX(520%) skewX(-18deg)" },
    ],
    { duration: c.D.float, easing: c.E["in-out"] },
  ],
  stripes: c => [
    [
      { transform: "translateX(0)" },
      { transform: "translateX(28.28px)" },
    ],
    { duration: c.D.breathe, easing: "linear" },
  ],
  float: c => [
    [
      { transform: "translateY(0)" },
      { transform: `translateY(${-3 * c.gain}px)` },
      { transform: "translateY(0)" },
    ],
    { duration: c.D.float, easing: c.E["in-out"] },
  ],
  hop: (c) => {
    const h = -14 * c.gain;
    return [
      [
        { transform: "translateY(0) scale(1,1)" },
        { transform: "translateY(0) scale(1.12,.88)", offset: 0.08 },
        { transform: `translateY(${h}px) scale(.92,1.1)`, offset: 0.2 },
        { transform: "translateY(0) scale(1.1,.9)", offset: 0.32 },
        { transform: "scale(1,1)", offset: 0.42 },
        { transform: "scale(1,1)" },
      ],
      { duration: c.D.wave, easing: c.E["in-out"] },
    ];
  },
  bob: c => [
    [
      { transform: "translateY(0)" },
      { transform: `translateY(${-3 * c.gain}px)` },
      { transform: "translateY(0)" },
    ],
    { duration: c.D.wave, easing: c.E["in-out"] },
  ],
  stick: c => [
    [
      { transform: "rotate(12deg) scale(1)" },
      { transform: "rotate(4deg) scale(1.08)" },
      { transform: "rotate(12deg) scale(1)" },
    ],
    { duration: c.D.wave, easing: c.E["in-out"] },
  ],
  wobble: c => [
    [
      { transform: "rotate(-2deg)" },
      { transform: "rotate(2deg)" },
      { transform: "rotate(-2deg)" },
    ],
    { duration: c.D.wave, easing: c.E["in-out"] },
  ],
  glow: c => [
    [
      { opacity: 0.5 },
      { opacity: 1 },
      { opacity: 0.5 },
    ],
    { duration: c.D.breathe, easing: c.E["in-out"] },
  ],
  twinkle: c => [
    [
      { transform: "scale(.6) rotate(0)", opacity: 0.4 },
      { transform: "scale(1.15) rotate(20deg)", opacity: 1 },
      { transform: "scale(.6) rotate(0)", opacity: 0.4 },
    ],
    { duration: 1600, easing: c.E["in-out"] },
  ],
  spin: () => [
    [
      { transform: "rotate(0)" },
      { transform: "rotate(360deg)" },
    ],
    { duration: 900, easing: "linear" },
  ],
  skel: c => [
    [
      { transform: "translateX(-100%)" },
      { transform: "translateX(100%)" },
    ],
    { duration: 1400, easing: c.E["in-out"] },
  ],
  // face accents (ClayFace SVG layers)
  drip: () => [
    [
      { transform: "translateY(0)" },
      { transform: "translateY(5px)", offset: 0.7 },
      { transform: "translateY(0)" },
    ],
    { duration: 1400, easing: "ease-in" },
  ],
  vein: () => [
    [
      { transform: "scale(1)" },
      { transform: "scale(1.3)", offset: 0.15 },
      { transform: "scale(1)", offset: 0.3 },
      { transform: "scale(1)" },
    ],
    { duration: 900 },
  ],
  steam: () => [
    [
      { transform: "translateY(2px) scale(.9)" },
      { transform: "translateY(-6px) scale(1.08)" },
      { transform: "translateY(2px) scale(.9)" },
    ],
    { duration: 700, easing: "steps(4,end)" },
  ],
  zzz: c => [
    [
      { transform: "translate(0,0)", opacity: 0.3 },
      { transform: "translate(4px,-6px)", opacity: 1 },
      { transform: "translate(0,0)", opacity: 0.3 },
    ],
    { duration: 2400, easing: c.E["in-out"] },
  ],
};
/* eslint-enable jsdoc/require-jsdoc */

/** The loops the Calm preset turns off. Calm is dormant in 1.0: nothing sets it. */
export const CALM_OFF: ReadonlySet<LoopName> = new Set<LoopName>([
  "drift",
  "float",
  "shimmer",
  "sheen",
  "bob",
  "twinkle",
  "glow",
  "wobble",
  "drip",
  "vein",
  "steam",
  "zzz",
]);

/** The loops that belong to the Responsive tier (a spinner, a skeleton); every other loop is Ambient. */
export const RESPONSIVE_LOOPS: ReadonlySet<LoopName> = new Set<LoopName>(["spin", "skel"]);

/**
 * The tier a loop is gated by.
 *
 * @param name the loop to look up
 * @returns `resp` for the two functional loops, `amb` for the rest
 */
export function loopTier(name: LoopName): Tier {
  return RESPONSIVE_LOOPS.has(name)
    ? "resp"
    : "amb";
}
