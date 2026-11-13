import type { FakeElement, HarnessInit } from "../../../tests/support/fake-motion";
import type { FatigueStage, TickKind } from "./types";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BROADCAST, EASE, motionHarness, SHOWCASE, WORKSPACE } from "../../../tests/support/fake-motion";

beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(Math, "random").mockReturnValue(0.5);
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const NONE = { transform: "none" };

// Knobs per dialect, as the token file gives them: hop, squash, gain.
const DIALECTS = {
  Workspace: {
    tokens: WORKSPACE,
    dialect: null,
    hop: -6,
    sq: 0.04,
    gain: 1,
  },
  Broadcast: {
    tokens: BROADCAST,
    dialect: "broadcast",
    hop: -10,
    sq: 0,
    gain: 1.25,
  },
  Showcase: {
    tokens: SHOWCASE,
    dialect: "showcase",
    hop: -14,
    sq: 0.1,
    gain: 1.6,
  },
} as const;

function setup(init: HarnessInit = {}, digitCount = 1) {
  const h = motionHarness({ cue: true, ...init });
  const digits = Array.from({ length: digitCount }, (_v, i) => h.el({
    dataset: {
      pos: String(i),
    },
  }));
  return {
    h,
    digits,
    well: h.el(),
  };
}

const calls = (el: FakeElement) => el.calls.map(c => ({ keyframes: c.keyframes, options: c.options }));

describe("tick, per-second beat", () => {
  it.each(Object.entries(DIALECTS))("a Total digit hops and squashes (%s)", (_name, d) => {
    const { h, digits } = setup({
      tokens: d.tokens,
      cfg: { dialect: d.dialect },
    });
    h.m.tick(digits, "total", "sec");
    expect(calls(digits[0] as FakeElement)).toEqual([
      {
        keyframes: [
          NONE,
          { transform: `translateY(${d.hop}px) scale(${1 - d.sq},${1 + d.sq})`, offset: 0.35 },
          { transform: `translateY(0) scale(${1 + d.sq},${1 - d.sq})`, offset: 0.7 },
          NONE,
        ],
        options: { duration: 480, easing: EASE.out },
      },
    ]);
  });

  it.each([
    ["Workspace", WORKSPACE, null, -6, 5],
    [
      "Broadcast",
      BROADCAST,
      "broadcast",
      -10,
      0,
    ],
    [
      "Showcase",
      SHOWCASE,
      "showcase",
      -14,
      8,
    ],
  ] as const)("a Row digit hops and tilts (%s)", (_name, tokens, dialect, hop, tilt) => {
    const { h, digits } = setup({
      tokens,
      cfg: { dialect },
    });
    h.m.tick(digits, "row", "sec");
    expect(calls(digits[0] as FakeElement)).toEqual([
      {
        keyframes: [
          NONE,
          { transform: `translateY(${hop * 0.6}px) rotate(${-tilt}deg)`, offset: 0.4 },
          NONE,
        ],
        options: { duration: 380, easing: EASE.spring },
      },
    ]);
  });

  it("broadcast never tilts: the keyframe says rotate(0deg), not -0", () => {
    const { h, digits } = setup({
      tokens: BROADCAST,
      cfg: { dialect: "broadcast" },
    });
    h.m.tick(digits, "row", "sec");
    expect(digits[0]?.calls[0]?.keyframes[1]?.transform).toBe("translateY(-6px) rotate(0deg)");
  });

  it("an Overlay digit never tilts, whatever the dialect", () => {
    const { h, digits } = setup();
    h.m.tick(digits, "ov-row", "sec");
    expect(digits[0]?.calls[0]?.keyframes[1]?.transform).toBe("translateY(-3.5999999999999996px) rotate(0deg)");
  });

  it("an Overlay Total digit animates like a Total digit", () => {
    const { h, digits } = setup();
    h.m.tick(digits, "ov-total", "sec");
    expect(digits[0]?.calls[0]?.options).toEqual({ duration: 480, easing: EASE.out });
  });

  it("-6 * 0.6 prints as JavaScript prints it", () => {
    const { h, digits } = setup();
    h.m.tick(digits, "row", "sec");
    expect(digits[0]?.calls[0]?.keyframes[1]?.transform).toBe("translateY(-3.5999999999999996px) rotate(-5deg)");
  });

  it("animates every digit", () => {
    const { h, digits } = setup({}, 3);
    h.m.tick(digits, "total", "sec");
    expect(digits.map(d => d.calls.length)).toEqual([1, 1, 1]);
  });

  it("does nothing without digits", () => {
    const { h, well } = setup();
    h.m.tick([], "total", "hour", well);
    expect(h.log).toEqual([]);
  });

  it("an Overlay Row digit does not tick under calm, an Overlay Total digit does", () => {
    const { h, digits } = setup({
      cfg: { calm: true },
    });
    h.m.tick(digits, "ov-row", "sec");
    expect(h.log).toEqual([]);
    h.m.tick(digits, "ov-total", "sec");
    expect(h.log).toHaveLength(1);
  });

  it("a page Row digit still ticks under calm", () => {
    const { h, digits } = setup({
      cfg: { calm: true },
    });
    h.m.tick(digits, "row", "sec");
    expect(h.log).toHaveLength(1);
  });
});

describe("tick, the 95% clamp", () => {
  it.each([
    [1000, "total", 480],
    [1000, "row", 380],
    [400, "total", 380],
    [400, "row", 380],
    [300, "total", 285],
    [300, "row", 285],
    [200, "total", 190],
  ] as const)("at interval %d a %s digit lasts %d ms", (interval, kind, duration) => {
    const { h, digits } = setup({
      cfg: { interval },
    });
    h.m.tick(digits, kind, "sec");
    expect(digits[0]?.calls[0]?.options.duration).toBe(duration);
  });

  it("reads the interval on every call", () => {
    const { h, digits } = setup();
    h.m.tick(digits, "total", "sec");
    h.setCfg({ interval: 400 });
    h.m.tick(digits, "total", "sec");
    expect(digits[0]?.calls.map(c => c.options.duration)).toEqual([480, 380]);
  });
});

describe("tick, rollovers at interval 1000", () => {
  it("orders digits by data-pos, staggers them by 50 ms and keeps the backwards fill", () => {
    const { h } = setup();
    const d2 = h.el({
      dataset: { pos: "2" },
    });
    const d0 = h.el({
      dataset: { pos: "0" },
    });
    const d1 = h.el({
      dataset: { pos: "1" },
    });
    h.m.tick([d2, d0, d1], "row", "min");
    expect(h.log.map(c => c.target)).toEqual([d0, d1, d2]);
    expect(h.log.map(c => c.options.delay)).toEqual([0, 50, 100]);
    expect(h.log.map(c => c.options.fill)).toEqual(["backwards", "backwards", "backwards"]);
    expect(h.log.map(c => c.options.easing)).toEqual([EASE.bouncy, EASE.bouncy, EASE.bouncy]);
  });

  it("a minute Total digit: height 1.6 of the hop, 720 ms", () => {
    const { h, digits } = setup();
    h.m.tick(digits, "total", "min");
    expect(calls(digits[0] as FakeElement)).toEqual([
      {
        keyframes: [
          NONE,
          { transform: `translateY(${-6 * 1.6 * 1}px) scale(.94,1.08)`, offset: 0.35 },
          { transform: "scale(1.06,.95)", offset: 0.65 },
          NONE,
        ],
        options: {
          duration: 720,
          delay: 0,
          easing: EASE.bouncy,
          fill: "backwards",
        },
      },
    ]);
  });

  it("an hour Row digit: height 2.2 of 0.6 of the hop, clamped to 950 ms", () => {
    const { h, digits } = setup();
    h.m.tick(digits, "row", "hour");
    expect(calls(digits[0] as FakeElement)).toEqual([
      {
        keyframes: [
          NONE,
          { transform: `translateY(${-6 * 2.2 * 0.6}px) scale(.94,1.08)`, offset: 0.35 },
          { transform: "scale(1.06,.95)", offset: 0.65 },
          NONE,
        ],
        options: {
          duration: 950,
          delay: 0,
          easing: EASE.bouncy,
          fill: "backwards",
        },
      },
    ]);
  });

  it("caps the stagger at 30% of the interval", () => {
    const { h, digits } = setup({
      cfg: { interval: 120 },
    }, 3);
    h.m.tick(digits, "total", "min");
    expect(digits.map(d => d.calls[0]?.options.delay)).toEqual([
      0,
      Math.min(50, 120 * 0.3),
      Math.min(100, 120 * 0.3),
    ]);
  });

  it("an hour Total digit pulses the well, bursts and cues the chime", () => {
    const { h, digits, well } = setup();
    h.m.tick(digits, "total", "hour", well);
    expect(calls(well)).toEqual([
      {
        keyframes: [
          { transform: "scale(1)" },
          { transform: "scale(1.06,.94)", offset: 0.3 },
          { transform: "scale(.97,1.03)", offset: 0.6 },
          { transform: "scale(1)" },
        ],
        options: { duration: 950, easing: EASE["in-out"] },
      },
    ]);
    expect(h.layer.children).toHaveLength(10);
    vi.advanceTimersByTime(950 * 0.3);
    expect(h.cues).toEqual([
      ["chime.hour", "T04"],
    ]);
  });

  it("the hour burst's colours are confetti-2, confetti-1 and white, in spark and circle shapes", () => {
    const { h, digits, well } = setup();
    h.m.tick(digits, "total", "hour", well);
    const ps = h.layer.children as unknown as FakeElement[];
    expect(ps.slice(0, 6).map(p => p.style.background)).toEqual([
      "var(--confetti-2)",
      "var(--confetti-1)",
      "var(--p-white)",
      "var(--confetti-2)",
      "var(--confetti-1)",
      "var(--p-white)",
    ]);
    expect(ps.slice(0, 2).map(p => [p.style.clipPath !== undefined, p.style.borderRadius])).toEqual([
      [true, undefined],
      [false, "50%"],
    ]);
  });

  it.each([
    [
      "Workspace",
      WORKSPACE,
      null,
      "total",
      10,
    ],
    [
      "Broadcast",
      BROADCAST,
      "broadcast",
      "total",
      10,
    ],
    [
      "Showcase",
      SHOWCASE,
      "showcase",
      "total",
      24,
    ],
    [
      "Overlay",
      WORKSPACE,
      null,
      "ov-total",
      14,
    ],
    [
      "Overlay in Showcase",
      SHOWCASE,
      "showcase",
      "ov-total",
      14,
    ],
  ] as const)("the hour burst has the right count (%s)", (_name, tokens, dialect, kind, count) => {
    const { h, digits, well } = setup({
      tokens,
      cfg: { dialect },
    });
    h.m.tick(digits, kind as TickKind, "hour", well);
    expect(h.layer.children).toHaveLength(count);
  });

  it("a minute Total digit pulses the well gently and cues the tick, with no burst outside Showcase", () => {
    const { h, digits, well } = setup();
    h.m.tick(digits, "total", "min", well);
    expect(calls(well)).toEqual([
      {
        keyframes: [
          { transform: "scale(1)" },
          { transform: "scale(1.03)", offset: 0.3 },
          { transform: "scale(1)" },
        ],
        options: { duration: 720, easing: EASE["in-out"] },
      },
    ]);
    expect(h.layer.children).toHaveLength(0);
    vi.advanceTimersByTime(720 * 0.35);
    expect(h.cues).toEqual([
      ["tick.minute", "T03"],
    ]);
  });

  it("a minute Total digit in Showcase bursts six sparks in confetti-2 and confetti-1", () => {
    const { h, digits, well } = setup({
      tokens: SHOWCASE,
      cfg: { dialect: "showcase" },
    });
    h.m.tick(digits, "total", "min", well);
    const ps = h.layer.children as unknown as FakeElement[];
    expect(ps).toHaveLength(6);
    expect(ps.map(p => p.style.background)).toEqual([
      "var(--confetti-2)",
      "var(--confetti-1)",
      "var(--confetti-2)",
      "var(--confetti-1)",
      "var(--confetti-2)",
      "var(--confetti-1)",
    ]);
    expect(ps.every(p => p.style.clipPath !== undefined)).toBe(true);
  });

  it("a Row digit rollover never touches the well", () => {
    const { h, digits, well } = setup();
    h.m.tick(digits, "row", "hour", well);
    expect(well.calls).toHaveLength(0);
    expect(h.layer.children).toHaveLength(0);
    vi.runAllTimers();
    expect(h.cues).toEqual([]);
  });

  it("without a well a rollover only moves the digits", () => {
    const { h, digits } = setup();
    h.m.tick(digits, "total", "hour");
    expect(h.log).toHaveLength(1);
    expect(h.layer.children).toHaveLength(0);
  });

  it("under calm an Overlay hour skips the well and the burst but still cues", () => {
    const { h, digits, well } = setup({
      cfg: { calm: true },
    });
    h.m.tick(digits, "ov-total", "hour", well);
    expect(well.calls).toHaveLength(0);
    expect(h.layer.children).toHaveLength(0);
    vi.runAllTimers();
    expect(h.cues).toEqual([
      ["chime.hour", "T04"],
    ]);
  });

  it("under calm a page hour keeps the well but skips the burst", () => {
    const { h, digits, well } = setup({
      cfg: { calm: true },
    });
    h.m.tick(digits, "total", "hour", well);
    expect(well.calls).toHaveLength(1);
    expect(h.layer.children).toHaveLength(0);
  });

  it("plays one digit, two digits", () => {
    for (const count of [1, 2]) {
      const { h, digits } = setup({}, count);
      h.m.tick(digits, "total", "hour");
      expect(h.log).toHaveLength(count);
    }
  });
});

describe("tick, a rollover ends before its beat does", () => {
  // The next beat ticks the last slot again, so its delay and duration together must fit the 95% clamp.
  const SIX = 6;
  const ends = (digits: FakeElement[]) => digits.map((d) => {
    const o = d.calls[0]?.options;
    return Number(o?.delay) + Number(o?.duration);
  });

  it.each([
    [250, "min"],
    [250, "hour"],
    [1000, "min"],
    [1000, "hour"],
    [400, "hour"],
    [120, "min"],
  ] as const)("at %d ms a %s rollover has no slot ending after 0.95 of the interval", (interval, beat) => {
    const { h, digits } = setup({
      cfg: { interval },
    }, SIX);
    h.m.tick(digits, "total", beat);
    for (const end of ends(digits))
      expect(end).toBeLessThanOrEqual(interval * 0.95 + 1e-9);
  });

  it("holds for a timer with fewer slots", () => {
    const { h, digits } = setup({
      cfg: { interval: 250 },
    }, 2);
    h.m.tick(digits, "row", "hour");
    for (const end of ends(digits))
      expect(end).toBeLessThanOrEqual(250 * 0.95 + 1e-9);
  });

  it("at 1000 ms the hour rollover's slots shorten by their delay: 950 down to 700", () => {
    const { h, digits } = setup({}, SIX);
    h.m.tick(digits, "total", "hour");
    expect(digits.map(d => d.calls[0]?.options.duration)).toEqual([950, 900, 850, 800, 750, 700]);
    expect(digits.map(d => d.calls[0]?.options.delay)).toEqual([0, 50, 100, 150, 200, 250]);
  });

  it("at 250 ms the clamp binds and the stagger stays 50 ms up to 30% of the interval", () => {
    const { h, digits } = setup({
      cfg: { interval: 250 },
    }, SIX);
    h.m.tick(digits, "total", "min");
    expect(digits.map(d => d.calls[0]?.options.delay)).toEqual([0, 50, 75, 75, 75, 75]);
    expect(digits.map(d => d.calls[0]?.options.duration)).toEqual([
      237.5,
      187.5,
      162.5,
      162.5,
      162.5,
      162.5,
    ]);
  });

  it("at 120 ms, the shortest real rollover, the delay is 36 ms and the durations shorten to match", () => {
    const { h, digits } = setup({
      cfg: { interval: 120 },
    }, SIX);
    h.m.tick(digits, "total", "hour");
    expect(digits.map(d => d.calls[0]?.options.delay)).toEqual([0, 36, 36, 36, 36, 36]);
    expect(digits.map(d => d.calls[0]?.options.duration)).toEqual([114, 78, 78, 78, 78, 78]);
  });

  // What must not change at the product's interval: a second tick and a minute rollover play as before.
  it("at 1000 ms a minute rollover keeps its 720 ms, its 50 ms stagger and one set of keyframes", () => {
    const { h, digits } = setup({}, SIX);
    h.m.tick(digits, "total", "min");
    expect(digits.slice(0, 5).map(d => d.calls[0]?.options.duration)).toEqual([720, 720, 720, 720, 720]);
    expect(digits.map(d => d.calls[0]?.options.delay)).toEqual([0, 50, 100, 150, 200, 250]);
    const first = digits[0]?.calls[0]?.keyframes;
    expect(first).toEqual([
      NONE,
      { transform: `translateY(${-6 * 1.6 * 1}px) scale(.94,1.08)`, offset: 0.35 },
      { transform: "scale(1.06,.95)", offset: 0.65 },
      NONE,
    ]);
    for (const d of digits)
      expect(d.calls[0]?.keyframes).toEqual(first);
  });

  // 250 + 720 ends at 970, past 0.95 of 1000: the one slot of a minute rollover the rule touches, by 20 ms.
  it("at 1000 ms a minute rollover's last slot gives up 20 ms to end at 0.95 of the interval", () => {
    const { h, digits } = setup({}, SIX);
    h.m.tick(digits, "total", "min");
    expect(digits[5]?.calls[0]?.options.duration).toBe(700);
  });

  it("at 1000 ms a second tick keeps its 480 ms, with no delay", () => {
    const { h, digits } = setup({}, SIX);
    h.m.tick(digits, "total", "sec");
    expect(digits.map(d => d.calls[0]?.options.duration)).toEqual([480, 480, 480, 480, 480, 480]);
    expect(digits.map(d => d.calls[0]?.options.delay)).toEqual([
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
    ]);
  });

  it("at 1000 ms an hour rollover keeps its keyframes and its backwards fill on every slot", () => {
    const { h, digits } = setup({}, SIX);
    h.m.tick(digits, "total", "hour");
    const first = digits[0]?.calls[0]?.keyframes;
    expect(first?.[1]).toEqual({ transform: `translateY(${-6 * 2.2 * 1}px) scale(.94,1.08)`, offset: 0.35 });
    for (const d of digits) {
      expect(d.calls[0]?.keyframes).toEqual(first);
      expect(d.calls[0]?.options.fill).toBe("backwards");
    }
  });
});

describe("tick, intervals that change what a beat does", () => {
  // Reference quirk: from 60 to 119 ms every beat takes the per-second shape; below 60 ms a second is skipped
  // and a rollover still takes the plain shape.
  it.each([
    [59, "sec", 0],
    [59, "min", 1],
    [59, "hour", 1],
    [60, "sec", 1],
    [60, "min", 1],
    [60, "hour", 1],
    [119, "sec", 1],
    [119, "min", 1],
    [119, "hour", 1],
    [120, "sec", 1],
    [120, "min", 1],
    [120, "hour", 1],
  ] as const)("at %d ms a %s beat animates %d digit", (interval, beat, count) => {
    const { h, digits } = setup({
      cfg: { interval },
    });
    h.m.tick(digits, "total", beat);
    expect(h.log).toHaveLength(count);
  });

  it.each([
    [59, "min"],
    [60, "min"],
    [60, "hour"],
    [119, "hour"],
  ] as const)("at %d ms a %s rollover gets the plain tick shape and never reaches the well, burst or cue", (interval, beat) => {
    const { h, digits, well } = setup({
      cfg: { interval },
    });
    h.m.tick(digits, "total", beat, well);
    vi.runAllTimers();
    expect(digits[0]?.calls[0]?.options.easing).toBe(EASE.out);
    expect(digits[0]?.calls[0]?.options.fill).toBeUndefined();
    expect(well.calls).toHaveLength(0);
    expect(h.layer.children).toHaveLength(0);
    expect(h.cues).toEqual([]);
  });

  it("at 120 ms a rollover is a real one", () => {
    const { h, digits, well } = setup({
      cfg: { interval: 120 },
    });
    h.m.tick(digits, "total", "hour", well);
    expect(digits[0]?.calls[0]?.options.easing).toBe(EASE.bouncy);
    expect(well.calls).toHaveLength(1);
  });

  it("skips seconds above a 16x clock: 62.5 ms animates, 59 ms does not", () => {
    const fast = setup({
      cfg: { interval: 62.5 },
    });
    fast.h.m.tick(fast.digits, "total", "sec");
    expect(fast.h.log).toHaveLength(1);
    expect(fast.digits[0]?.calls[0]?.options.duration).toBe(62.5 * 0.95);
    const faster = setup({
      cfg: { interval: 59 },
    });
    faster.h.m.tick(faster.digits, "total", "sec");
    expect(faster.h.log).toHaveLength(0);
  });
});

describe("beat", () => {
  // Hand-written from the reference's BEATS table, Workspace knobs at gain 1.
  const STAGES = (g: number): [FatigueStage, Keyframe[], number, string][] => [
    [
      0,
      [
        NONE,
        { transform: `translateY(${-8 * g}px) scale(.94,1.07)`, offset: 0.35 },
        { transform: "scale(1.07,.93)", offset: 0.7 },
        NONE,
      ],
      420,
      "ease-out",
    ],
    [
      1,
      [
        NONE,
        { transform: `translateY(2px) rotate(${-5 * g}deg)`, offset: 0.4 },
        NONE,
      ],
      420,
      "ease-in-out",
    ],
    [
      2,
      [
        { transform: "rotate(0)" },
        { transform: `rotate(${-11 * g}deg)`, offset: 0.3 },
        { transform: `rotate(${9 * g}deg)`, offset: 0.65 },
        { transform: "rotate(0)" },
      ],
      520,
      "ease-in-out",
    ],
    [
      3,
      [
        NONE,
        { transform: "translateY(3px) scale(1.07,.88)", offset: 0.45 },
        { transform: "translateY(3px) scale(1.07,.88)", offset: 0.7 },
        NONE,
      ],
      950,
      "ease-in-out",
    ],
    [
      4,
      [
        NONE,
        { transform: "translateX(-4px)", offset: 0.2 },
        { transform: "translateX(4px)", offset: 0.4 },
        { transform: "translateX(-3px)", offset: 0.6 },
        { transform: "translateX(2px)", offset: 0.8 },
        NONE,
      ],
      380,
      "linear",
    ],
    [
      5,
      [
        NONE,
        { transform: "translateX(-4px) scale(1.06)" },
        { transform: "translateX(4px) scale(1.06)" },
        { transform: "translateX(-4px) scale(1.06)" },
        { transform: "translateX(3px) scale(1.04)" },
        NONE,
      ],
      460,
      EASE.stepped,
    ],
  ];

  it.each(STAGES(1))("stage %d at gain 1", (stage, keyframes, duration, easing) => {
    const { h, digits } = setup();
    h.m.beat(digits[0], stage);
    expect(calls(digits[0] as FakeElement)).toEqual([
      {
        keyframes,
        options: { duration, easing },
      },
    ]);
  });

  it.each(STAGES(1.6).slice(0, 3))("stage %d follows the Showcase gain of 1.6", (stage, keyframes, duration, easing) => {
    const { h, digits } = setup({ tokens: SHOWCASE });
    h.m.beat(digits[0], stage);
    expect(calls(digits[0] as FakeElement)).toEqual([
      {
        keyframes,
        options: { duration, easing },
      },
    ]);
  });

  it.each([
    [1000, 0, 420],
    [1000, 3, 950],
    [400, 0, 380],
    [400, 4, 380],
    [300, 0, 285],
    [200, 3, 285],
  ] as const)("at interval %d stage %d lasts %d ms", (interval, stage, duration) => {
    const { h, digits } = setup({
      cfg: { interval },
    });
    h.m.beat(digits[0], stage);
    expect(digits[0]?.calls[0]?.options.duration).toBe(duration);
  });

  it("is skipped below a 200 ms interval, unless only the minute beat is asked for", () => {
    const { h, digits } = setup({
      cfg: { interval: 199 },
    });
    h.m.beat(digits[0], 0);
    expect(h.log).toEqual([]);
    h.m.beat(digits[0], 0, true);
    expect(h.log).toHaveLength(1);
    expect(digits[0]?.calls[0]?.options.duration).toBe(Math.max(199, 300) * 0.95);
  });

  it("plays at exactly 200 ms", () => {
    const { h, digits } = setup({
      cfg: { interval: 200 },
    });
    h.m.beat(digits[0], 0);
    expect(h.log).toHaveLength(1);
  });

  it("a stage outside 0 to 5 does nothing", () => {
    const { h, digits } = setup();
    h.m.beat(digits[0], 6 as FatigueStage);
    h.m.beat(digits[0], -1 as FatigueStage);
    expect(h.log).toEqual([]);
  });
});

describe("stageChange", () => {
  it("jellies the face, puffs six circles, and cues", () => {
    const { h, well } = setup();
    h.m.stageChange(well);
    expect(h.log[0]?.target).toBe(well);
    expect(calls(well)).toEqual([
      {
        keyframes: [
          { transform: "scale(1)" },
          { transform: "scale(1.25,.8)", offset: 0.2 },
          { transform: "scale(.9,1.12)", offset: 0.5 },
          { transform: "scale(1)" },
        ],
        options: { duration: 700, easing: EASE.out },
      },
    ]);
    const ps = h.layer.children as unknown as FakeElement[];
    expect(ps.map(p => p.style.background)).toEqual([
      "var(--p-white)",
      "var(--p-pink-150)",
      "var(--p-white)",
      "var(--p-pink-150)",
      "var(--p-white)",
      "var(--p-pink-150)",
    ]);
    expect(ps.every(p => p.style.borderRadius === "50%")).toBe(true);
    vi.runAllTimers();
    expect(h.cues).toEqual([
      ["face.stage", "T08"],
    ]);
  });

  it("the puff flies in every direction with no gravity", () => {
    const { h, well } = setup();
    h.m.stageChange(well);
    const particle = h.log[1];
    const dist = 70 * 1 ** 0.5 * (0.35 + 0.5 * 0.65);
    const ang = 0.5 * Math.PI * 2;
    expect(particle?.keyframes[2]?.transform).toBe(`translate(calc(-50% + ${Math.cos(ang) * dist * 1.15}px), calc(-50% + ${Math.sin(ang) * dist + 0}px)) scale(.7) rotate(0deg)`);
  });

  it("under calm there is no puff, but the face still jellies", () => {
    const { h, well } = setup({
      cfg: { calm: true },
    });
    h.m.stageChange(well);
    expect(h.log).toHaveLength(1);
    expect(h.layer.children).toHaveLength(0);
  });
});
