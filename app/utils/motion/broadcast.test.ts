import type { FakeElement, MotionHarness } from "../../../tests/support/fake-motion";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EASE, motionHarness, NONE, SHOWCASE } from "../../../tests/support/fake-motion";

beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(Math, "random").mockReturnValue(0.5);
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const FADE_IN: Keyframe[] = [
  { opacity: 0 },
  { opacity: 1 },
];
const STAMP = "translate(-50%,-50%)";

type Expected = [keyframes: Keyframe[], options: KeyframeAnimationOptions];

// One row per Broadcast recipe with one element: normal and calm, written from the reference's lines 275 to 297.
const ROWS: [name: string, run: (h: MotionHarness, e: FakeElement) => void, normal: Expected, calm: Expected | null][] = [
  [
    "bannerIn",
    (h, e) => void h.m.bannerIn(e),
    [
      [
        { transform: "translateY(-120%)" },
        NONE,
      ],
      { duration: 360, easing: EASE.snappy },
    ],
    [
      [
        { transform: "translateY(-120%)" },
        NONE,
      ],
      { duration: 360, easing: EASE.snappy },
    ],
  ],
  [
    "bannerOut",
    (h, e) => void h.m.bannerOut(e),
    [
      [
        NONE,
        { transform: "translateY(-140%)" },
      ],
      { duration: 240, easing: EASE.in, fill: "forwards" },
    ],
    [
      [
        NONE,
        { transform: "translateY(-140%)" },
      ],
      { duration: 240, easing: EASE.in, fill: "forwards" },
    ],
  ],
  [
    "cardEnter",
    (h, e) => void h.m.cardEnter(e),
    [
      [
        { transform: "translateY(140%) rotate(4deg)" },
        { transform: "translateY(-4%) rotate(-1deg)", offset: 0.7 },
        NONE,
      ],
      { duration: 600 * 1.3, easing: EASE.bouncy },
    ],
    [
      FADE_IN,
      { duration: 240 },
    ],
  ],
  [
    "stampIn",
    (h, e) => void h.m.stampIn(e),
    [
      [
        { transform: `${STAMP} scale(2.4) rotate(-20deg)`, opacity: 0 },
        { transform: `${STAMP} scale(.9) rotate(-8deg)`, opacity: 1, offset: 0.55 },
        { transform: `${STAMP} scale(1.05) rotate(-8deg)`, offset: 0.75 },
        { transform: `${STAMP} rotate(-8deg)` },
      ],
      { duration: 900, easing: EASE.out },
    ],
    [
      FADE_IN,
      { duration: 240, fill: "backwards" },
    ],
  ],
  [
    "stampOut",
    (h, e) => void h.m.stampOut(e),
    [
      [
        { transform: `${STAMP} rotate(-8deg)`, opacity: 1 },
        { transform: `${STAMP} scale(1.2) rotate(-8deg)`, opacity: 0 },
      ],
      { duration: 240, easing: EASE.in, fill: "forwards" },
    ],
    [
      [
        { transform: `${STAMP} rotate(-8deg)`, opacity: 1 },
        { transform: `${STAMP} scale(1.2) rotate(-8deg)`, opacity: 0 },
      ],
      { duration: 240, easing: EASE.in, fill: "forwards" },
    ],
  ],
  [
    "cardHop",
    (h, e) => h.m.cardHop(e),
    [
      [
        NONE,
        { transform: `translateY(${-10 * 1}px) scale(1.02)`, offset: 0.35 },
        { transform: "scale(.99,1.01)", offset: 0.7 },
        NONE,
      ],
      { duration: 700, easing: EASE.out },
    ],
    null,
  ],
];

describe("every Broadcast recipe with one element", () => {
  it.each(ROWS)("%s", (_name, run, normal) => {
    const h = motionHarness();
    const e = h.el();
    run(h, e);
    expect(h.log.map(c => [e === c.target, c.keyframes, c.options])).toEqual([
      [true, ...normal],
    ]);
  });

  it.each(ROWS)("%s under calm", (_name, run, _normal, calm) => {
    const h = motionHarness({
      cfg: { calm: true },
    });
    const e = h.el();
    run(h, e);
    expect(h.log.map(c => [e === c.target, c.keyframes, c.options])).toEqual(calm
      ? [
          [true, ...calm],
        ]
      : []);
  });

  it("cardHop follows the Showcase gain", () => {
    const h = motionHarness({ tokens: SHOWCASE });
    h.m.cardHop(h.el());
    expect(h.log[0]?.keyframes[1]).toEqual({ transform: `translateY(${-10 * 1.6}px) scale(1.02)`, offset: 0.35 });
  });

  it("the stamp and the card hop are Celebratory, the banner and the card entrance Responsive", () => {
    for (const [name, call, tier] of [
      [
        "stampIn",
        (h: MotionHarness) => h.m.stampIn(h.el()),
        "cel",
      ],
      [
        "stampOut",
        (h: MotionHarness) => h.m.stampOut(h.el()),
        "cel",
      ],
      [
        "cardHop",
        (h: MotionHarness) => h.m.cardHop(h.el()),
        "cel",
      ],
      [
        "bannerIn",
        (h: MotionHarness) => h.m.bannerIn(h.el()),
        "resp",
      ],
      [
        "cardEnter",
        (h: MotionHarness) => h.m.cardEnter(h.el()),
        "resp",
      ],
    ] as const) {
      const h = motionHarness({
        cfg: { [tier]: false },
      });
      call(h);
      expect(h.log, name).toEqual([]);
    }
  });

  it("stampIn cues overlay.won (B05) after 55% of the stamp time, through the hook", () => {
    const h = motionHarness({ cue: true });
    h.m.stampIn(h.el());
    vi.advanceTimersByTime(900 * 0.55 - 1);
    expect(h.cues).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(h.cues).toEqual([
      ["overlay.won", "B05"],
    ]);
  });
});

describe("highlight", () => {
  it("cancels what the row was doing, then plays a three-second glow", () => {
    const h = motionHarness();
    const el = h.el();
    const old = el.animate([], {}) as unknown as { cancelled: boolean };
    const a = h.m.highlight(el);
    expect(old.cancelled).toBe(true);
    expect(a).toBe(h.log[1]?.animation);
    expect(h.log[1]?.keyframes).toEqual([
      { opacity: 0, transform: "scale(1.04)", easing: EASE.out },
      { opacity: 1, transform: "scale(1)", offset: 0.1 },
      { opacity: 1, offset: 0.6, easing: EASE["in-out"] },
      { opacity: 0 },
    ]);
    expect(h.log[1]?.options).toEqual({ duration: 3000, easing: "linear", fill: "forwards" });
  });

  it("returns null without an element", () => {
    expect(motionHarness().m.highlight(null)).toBeNull();
  });
});

describe("mute", () => {
  it("fades the row to a muted look and holds it", () => {
    const h = motionHarness();
    const el = h.el();
    h.m.mute(el, true);
    expect(h.log).toHaveLength(1);
    expect(h.log[0]?.keyframes).toEqual([
      { filter: "saturate(1)", opacity: 1 },
      { filter: "saturate(.55)", opacity: 0.85 },
    ]);
    expect(h.log[0]?.options).toEqual({ duration: 240, easing: EASE.standard, fill: "forwards" });
  });

  it("mute(el, false) only cancels, so the row returns to its own look", () => {
    const h = motionHarness();
    const el = h.el();
    h.m.mute(el, true);
    h.m.mute(el, false);
    expect(h.log).toHaveLength(1);
    expect(h.log[0]?.animation.cancelled).toBe(true);
    expect(el.getAnimations()).toHaveLength(0);
  });

  it("cancels the old animation before it mutes again", () => {
    const h = motionHarness();
    const el = h.el();
    h.m.mute(el, true);
    h.m.mute(el, true);
    expect(h.log.map(c => c.animation.cancelled)).toEqual([true, false]);
  });

  it("under reduced motion lands the muted look as inline styles and creates no animation", () => {
    const h = motionHarness({
      cfg: { reduced: true },
    });
    const el = h.el();
    h.m.mute(el, true);
    expect(h.log).toEqual([]);
    expect(el.style.filter).toBe("saturate(.55)");
    expect(el.style.opacity).toBe("0.85");
  });

  it("under reduced motion mute(el, false) clears both inline styles", () => {
    const h = motionHarness({
      cfg: { reduced: true },
    });
    const el = h.el();
    h.m.mute(el, true);
    h.m.mute(el, false);
    expect(el.style.filter).toBe("");
    expect(el.style.opacity).toBe("");
    expect(h.log).toEqual([]);
  });

  it("clears the inline look before it plays the animated one, whichever way the look was landed", () => {
    const h = motionHarness({
      cfg: { reduced: true },
    });
    const el = h.el();
    h.m.mute(el, true);
    h.setCfg({ reduced: false });
    h.m.mute(el, true);
    expect(el.style.filter).toBe("");
    expect(el.style.opacity).toBe("");
    expect(h.log).toHaveLength(1);
  });

  it("a muted row that motion has since been reduced for is unmuted by mute(el, false)", () => {
    const h = motionHarness();
    const el = h.el();
    h.m.mute(el, true);
    h.setCfg({ reduced: true });
    h.m.mute(el, false);
    expect(h.log[0]?.animation.cancelled).toBe(true);
    expect(el.style.filter).toBe("");
  });

  it("does nothing without an element", () => {
    const h = motionHarness();
    expect(() => h.m.mute(null, true)).not.toThrow();
    expect(h.log).toEqual([]);
  });
});

describe("pageFlipOut and pageFlipIn", () => {
  it("flips rows out 70 ms apart", async () => {
    const h = motionHarness();
    const rows = [
      h.el(),
      h.el(),
      h.el(),
    ];
    const done = h.m.pageFlipOut(rows);
    expect(h.log.map(c => [c.target, c.keyframes, c.options])).toEqual(rows.map((r, i) => [
      r,
      [
        { transform: "none", opacity: 1 },
        { transform: "translateY(-14px) rotateX(70deg)", opacity: 0 },
      ],
      {
        duration: 240,
        delay: i * 70,
        easing: EASE.in,
        fill: "forwards",
      },
    ]));
    h.log.forEach(c => c.animation.finish());
    await expect(done).resolves.toHaveLength(3);
  });

  it("fades rows out together under calm", () => {
    const h = motionHarness({
      cfg: { calm: true },
    });
    void h.m.pageFlipOut([
      h.el(),
      h.el(),
    ]);
    expect(h.log.map(c => [c.keyframes, c.options])).toEqual([
      [
        [
          { opacity: 1 },
          { opacity: 0 },
        ],
        { duration: 240, fill: "forwards" },
      ],
      [
        [
          { opacity: 1 },
          { opacity: 0 },
        ],
        { duration: 240, fill: "forwards" },
      ],
    ]);
  });

  it("flips rows in 70 ms apart, after cancelling what they were doing", () => {
    const h = motionHarness();
    const rows = [
      h.el(),
      h.el(),
    ];
    const old = rows[0]?.animate([], {}) as unknown as { cancelled: boolean };
    h.m.pageFlipIn(rows);
    expect(old.cancelled).toBe(true);
    expect(h.log.slice(1).map(c => [c.target, c.keyframes, c.options])).toEqual(rows.map((r, i) => [
      r,
      [
        { transform: "translateY(14px) rotateX(-70deg)", opacity: 0 },
        { transform: "none", opacity: 1, offset: 0.45 },
        { transform: "none", opacity: 1 },
      ],
      {
        duration: 600,
        delay: i * 70,
        easing: EASE.bouncy,
        fill: "backwards",
      },
    ]));
  });

  it("fades rows in together under calm", () => {
    const h = motionHarness({
      cfg: { calm: true },
    });
    h.m.pageFlipIn([
      h.el(),
      h.el(),
    ]);
    expect(h.log.map(c => [c.keyframes, c.options])).toEqual([
      [
        FADE_IN,
        { duration: 240 },
      ],
      [
        FADE_IN,
        { duration: 240 },
      ],
    ]);
  });

  it("is Ambient: --ambient-motion: paused stops page flips too (the reference's tiering)", () => {
    const h = motionHarness({
      tokens: { "--ambient-motion": "paused" },
    });
    h.m.pageFlipIn([
      h.el(),
    ]);
    void h.m.pageFlipOut([
      h.el(),
    ]);
    expect(h.log).toEqual([]);
  });
});
