import type { LoopName } from "./types";
import { describe, expect, it } from "vitest";
import { EASE, motionHarness, SHOWCASE } from "../../../tests/support/fake-motion";
import { CALM_OFF, LOOPS, loopTier, RESPONSIVE_LOOPS } from "./loops";
import { DURATIONS, EASINGS } from "./tokens";

const IO = "cubic-bezier(.45,0,.55,1)";
const ctx = (gain = 1, calm = false) => ({ D: DURATIONS, E: EASINGS, gain, calm });

// Each row is written by hand from the reference's lines 87 to 109, for Workspace knobs (gain 1).
const ROWS: [LoopName, Keyframe[], KeyframeAnimationOptions][] = [
  [
    "drift",
    [
      { transform: "translate(0,0)" },
      { transform: "translate(52px,52px)" },
    ],
    { duration: 60000, easing: "linear" },
  ],
  [
    "blob1",
    [
      { transform: "translate(0,0) scale(1)" },
      { transform: "translate(40px,30px) scale(1.08)" },
    ],
    { duration: 60000 * 0.3, easing: IO, direction: "alternate" },
  ],
  [
    "blob2",
    [
      { transform: "translate(0,0) scale(1.04)" },
      { transform: "translate(-36px,-24px) scale(.92)" },
    ],
    { duration: 60000 * 0.37, easing: IO, direction: "alternate" },
  ],
  [
    "breathe",
    [
      { transform: "scale(1,1)" },
      { transform: `scale(${1 + 0.04},${1 - 0.04})` },
      { transform: `scale(${1 - 0.04 / 2},${1 + 0.04 * 0.75})` },
      { transform: "scale(1,1)" },
    ],
    { duration: 2200, easing: IO },
  ],
  [
    "snooze",
    [
      { transform: "scale(1,1)" },
      { transform: `scale(${1 + 0.03},${1 - 0.03})` },
      { transform: "scale(1,1)" },
    ],
    { duration: 2200 * 1.45, easing: IO },
  ],
  [
    "shimmer",
    [
      { transform: "translateX(-150%) skewX(-18deg)" },
      { transform: "translateX(350%) skewX(-18deg)", offset: 0.16 },
      { transform: "translateX(350%) skewX(-18deg)" },
    ],
    { duration: 9000, easing: IO },
  ],
  [
    "ring",
    [
      { opacity: 0.25 },
      { opacity: 0.85 },
      { opacity: 0.25 },
    ],
    { duration: 2200, easing: IO },
  ],
  [
    "sheen",
    [
      { transform: "translateX(-120%) skewX(-18deg)" },
      { transform: "translateX(520%) skewX(-18deg)", offset: 0.3 },
      { transform: "translateX(520%) skewX(-18deg)" },
    ],
    { duration: 4800, easing: IO },
  ],
  [
    "stripes",
    [
      { transform: "translateX(0)" },
      { transform: "translateX(28.28px)" },
    ],
    { duration: 2200, easing: "linear" },
  ],
  [
    "float",
    [
      { transform: "translateY(0)" },
      { transform: `translateY(${-3}px)` },
      { transform: "translateY(0)" },
    ],
    { duration: 4800, easing: IO },
  ],
  [
    "hop",
    [
      { transform: "translateY(0) scale(1,1)" },
      { transform: "translateY(0) scale(1.12,.88)", offset: 0.08 },
      { transform: `translateY(${-14}px) scale(.92,1.1)`, offset: 0.2 },
      { transform: "translateY(0) scale(1.1,.9)", offset: 0.32 },
      { transform: "scale(1,1)", offset: 0.42 },
      { transform: "scale(1,1)" },
    ],
    { duration: 2600, easing: IO },
  ],
  [
    "bob",
    [
      { transform: "translateY(0)" },
      { transform: `translateY(${-3}px)` },
      { transform: "translateY(0)" },
    ],
    { duration: 2600, easing: IO },
  ],
  [
    "stick",
    [
      { transform: "rotate(12deg) scale(1)" },
      { transform: "rotate(4deg) scale(1.08)" },
      { transform: "rotate(12deg) scale(1)" },
    ],
    { duration: 2600, easing: IO },
  ],
  [
    "wobble",
    [
      { transform: "rotate(-2deg)" },
      { transform: "rotate(2deg)" },
      { transform: "rotate(-2deg)" },
    ],
    { duration: 2600, easing: IO },
  ],
  [
    "glow",
    [
      { opacity: 0.5 },
      { opacity: 1 },
      { opacity: 0.5 },
    ],
    { duration: 2200, easing: IO },
  ],
  [
    "twinkle",
    [
      { transform: "scale(.6) rotate(0)", opacity: 0.4 },
      { transform: "scale(1.15) rotate(20deg)", opacity: 1 },
      { transform: "scale(.6) rotate(0)", opacity: 0.4 },
    ],
    { duration: 1600, easing: IO },
  ],
  [
    "spin",
    [
      { transform: "rotate(0)" },
      { transform: "rotate(360deg)" },
    ],
    { duration: 900, easing: "linear" },
  ],
  [
    "skel",
    [
      { transform: "translateX(-100%)" },
      { transform: "translateX(100%)" },
    ],
    { duration: 1400, easing: IO },
  ],
  [
    "drip",
    [
      { transform: "translateY(0)" },
      { transform: "translateY(5px)", offset: 0.7 },
      { transform: "translateY(0)" },
    ],
    { duration: 1400, easing: "ease-in" },
  ],
  [
    "vein",
    [
      { transform: "scale(1)" },
      { transform: "scale(1.3)", offset: 0.15 },
      { transform: "scale(1)", offset: 0.3 },
      { transform: "scale(1)" },
    ],
    { duration: 900 },
  ],
  [
    "steam",
    [
      { transform: "translateY(2px) scale(.9)" },
      { transform: "translateY(-6px) scale(1.08)" },
      { transform: "translateY(2px) scale(.9)" },
    ],
    { duration: 700, easing: "steps(4,end)" },
  ],
  [
    "zzz",
    [
      { transform: "translate(0,0)", opacity: 0.3 },
      { transform: "translate(4px,-6px)", opacity: 1 },
      { transform: "translate(0,0)", opacity: 0.3 },
    ],
    { duration: 2400, easing: IO },
  ],
];

describe("lOOPS", () => {
  it("has the 22 loops of the reference", () => {
    expect(Object.keys(LOOPS).sort()).toEqual(ROWS.map(r => r[0]).sort());
    expect(ROWS).toHaveLength(22);
  });

  it.each(ROWS)("%s plays its keyframes and options at gain 1", (name, keyframes, options) => {
    expect(LOOPS[name](ctx())).toEqual([keyframes, options]);
  });

  it.each([1, 1.6])("breathe, snooze, float, hop and bob follow the gain (%d)", (gain) => {
    const a = 0.04 * gain;
    const s = 0.03 * gain;
    expect(LOOPS.breathe(ctx(gain))[0]).toEqual([
      { transform: "scale(1,1)" },
      { transform: `scale(${1 + a},${1 - a})` },
      { transform: `scale(${1 - a / 2},${1 + a * 0.75})` },
      { transform: "scale(1,1)" },
    ]);
    expect(LOOPS.snooze(ctx(gain))[0]).toEqual([
      { transform: "scale(1,1)" },
      { transform: `scale(${1 + s},${1 - s})` },
      { transform: "scale(1,1)" },
    ]);
    expect(LOOPS.float(ctx(gain))[0][1]).toEqual({ transform: `translateY(${-3 * gain}px)` });
    expect(LOOPS.bob(ctx(gain))[0][1]).toEqual({ transform: `translateY(${-3 * gain}px)` });
    expect(LOOPS.hop(ctx(gain))[0][2]).toEqual({ transform: `translateY(${-14 * gain}px) scale(.92,1.1)`, offset: 0.2 });
  });

  it("hops 22.400000000000002 px at Showcase gain, as JavaScript prints it", () => {
    expect(LOOPS.hop(ctx(1.6))[0][2]).toEqual({ transform: "translateY(-22.400000000000002px) scale(.92,1.1)", offset: 0.2 });
  });

  it("doubles shimmer's duration under calm", () => {
    expect(LOOPS.shimmer(ctx(1, true))[1]).toEqual({ duration: 18000, easing: IO });
  });

  it("takes its durations and easings from the context", () => {
    const [, opt] = LOOPS.glow({
      D: { ...DURATIONS, breathe: 123 },
      E: { ...EASINGS, "in-out": "x" },
      gain: 1,
      calm: false,
    });
    expect(opt).toEqual({ duration: 123, easing: "x" });
  });
});

describe("cALM_OFF, RESPONSIVE_LOOPS and loopTier", () => {
  it("calm turns off exactly these 12 loops", () => {
    expect([...CALM_OFF].sort()).toEqual([
      "bob",
      "drift",
      "drip",
      "float",
      "glow",
      "sheen",
      "shimmer",
      "steam",
      "twinkle",
      "vein",
      "wobble",
      "zzz",
    ]);
  });

  it("only spin and skel are Responsive", () => {
    expect([...RESPONSIVE_LOOPS].sort()).toEqual(["skel", "spin"]);
  });

  it.each(ROWS.map(r => [
    r[0],
    r[0] === "spin" || r[0] === "skel"
      ? "resp"
      : "amb",
  ] as const))("%s is tier %s", (name, tier) => {
    expect(loopTier(name)).toBe(tier);
  });
});

describe("m.loop", () => {
  it("starts the loop forever, with its delay, at the knob's playback rate", () => {
    const h = motionHarness({ tokens: SHOWCASE });
    const el = h.el();
    const a = h.m.loop(el, "breathe", { delay: 120 });
    expect(h.log).toHaveLength(1);
    expect(h.log[0]?.target).toBe(el);
    expect(h.log[0]?.options).toEqual({
      iterations: Infinity,
      duration: 2200,
      easing: EASE["in-out"],
      delay: 120,
    });
    expect(a?.playbackRate).toBe(1.4);
  });

  it("bakes the gain in when it starts", () => {
    const h = motionHarness({ tokens: SHOWCASE });
    h.m.loop(h.el(), "bob");
    expect(h.log[0]?.keyframes[1]).toEqual({ transform: `translateY(${-3 * 1.6}px)` });
  });

  it("defaults the delay to 0", () => {
    const h = motionHarness();
    h.m.loop(h.el(), "glow");
    expect(h.log[0]?.options.delay).toBe(0);
  });

  it.each([
    [
      "reduced by the config",
      { reduced: true },
      "breathe",
    ],
    [
      "the Ambient switch off",
      { amb: false },
      "breathe",
    ],
    [
      "the Responsive switch off, for spin",
      { resp: false },
      "spin",
    ],
  ] as const)("returns null for %s", (_label, cfg, name) => {
    const h = motionHarness({ cfg });
    expect(h.m.loop(h.el(), name)).toBeNull();
    expect(h.log).toHaveLength(0);
  });

  it("keeps a Responsive loop running while the Ambient switch is off", () => {
    const h = motionHarness({
      cfg: { amb: false },
    });
    expect(h.m.loop(h.el(), "spin")).not.toBeNull();
  });

  it("returns null for an Ambient loop when --ambient-motion is paused", () => {
    const h = motionHarness({
      tokens: { "--ambient-motion": "paused" },
    });
    expect(h.m.loop(h.el(), "drift")).toBeNull();
    expect(h.m.loop(h.el(), "spin")).not.toBeNull();
  });

  it("honours Calm: a Calm-off loop inside a calm preset does not start", () => {
    const h = motionHarness({
      cfg: { calm: true },
    });
    expect(h.m.loop(h.el({ calmPreset: true }), "drift")).toBeNull();
  });

  it("starts a Calm-off loop outside a calm preset, and a Calm-on loop inside one", () => {
    const h = motionHarness({
      cfg: { calm: true },
    });
    expect(h.m.loop(h.el(), "drift")).not.toBeNull();
    expect(h.m.loop(h.el({ calmPreset: true }), "breathe")).not.toBeNull();
  });

  it("slows shimmer under calm", () => {
    const h = motionHarness({
      cfg: { calm: true },
    });
    h.m.loop(h.el(), "shimmer");
    expect(h.log[0]?.options.duration).toBe(18000);
  });

  it("stopLoop cancels the animation", () => {
    const h = motionHarness();
    const a = h.m.loop(h.el(), "breathe");
    h.m.stopLoop(a as Animation);
    expect(h.log[0]?.animation.cancelled).toBe(true);
  });

  it("stopLoops cancels every loop that was started", () => {
    const h = motionHarness();
    h.m.loop(h.el(), "breathe");
    h.m.loop(h.el(), "glow");
    h.m.stopLoops();
    expect(h.log.map(c => c.animation.cancelled)).toEqual([true, true]);
  });

  it("a refresh sets the playback rate of the loops that are running", () => {
    const h = motionHarness();
    const a = h.m.loop(h.el(), "breathe");
    expect(a?.playbackRate).toBe(1);
    h.env.styleOf(SHOWCASE);
    h.m.refresh(h.root);
    expect(a?.playbackRate).toBe(1.4);
  });

  it("a refresh leaves the keyframes as they were", () => {
    const h = motionHarness();
    h.m.loop(h.el(), "bob");
    h.env.styleOf(SHOWCASE);
    h.m.refresh(h.root);
    expect(h.log[0]?.keyframes[1]).toEqual({ transform: "translateY(-3px)" });
  });
});
