import type { FakeElement, MotionHarness } from "../../../tests/support/fake-motion";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EASE, fakeRect, motionHarness, SHOWCASE } from "../../../tests/support/fake-motion";

beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(Math, "random").mockReturnValue(0.5);
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const NONE = { transform: "none" };

// jelly's keyframes as the reference writes them, for amplitude a (already multiplied by the gain).
function jellyKf(a: number): Keyframe[] {
  return [
    { transform: "scale(1,1)" },
    { transform: `scale(${1 + 0.07 * a},${1 - 0.12 * a})`, offset: 0.18 },
    { transform: `scale(${1 - 0.06 * a},${1 + 0.08 * a})`, offset: 0.42 },
    { transform: `scale(${1 + 0.03 * a},${1 - 0.03 * a})`, offset: 0.68 },
    { transform: "scale(1,1)" },
  ];
}

type Expected = [target: FakeElement, keyframes: Keyframe[], options: KeyframeAnimationOptions][];

// One row per Responsive recipe: what it does to its elements at Workspace knobs (gain 1, no dialect). Written by
// hand from the reference's lines 175 to 272.
const ROWS: [name: string, run: (h: MotionHarness, e: FakeElement, e2: FakeElement) => void, expected: (e: FakeElement, e2: FakeElement) => Expected][] = [
  [
    "jelly",
    (h, e) => void h.m.jelly("resp", e),
    e => [
      [
        e,
        jellyKf(1 * 1),
        { duration: 700, easing: EASE.out },
      ],
    ],
  ],
  [
    "release",
    (h, e) => void h.m.release(e),
    e => [
      [
        e,
        [
          { transform: "scale(1,1)" },
          { transform: `scale(${1 + 0.06},${1 - 0.06})`, offset: 0.3 },
          { transform: `scale(${1 - 0.03},${1 + 0.03})`, offset: 0.65 },
          { transform: "scale(1,1)" },
        ],
        { duration: 700 * 0.6, easing: EASE.spring },
      ],
    ],
  ],
  [
    "menuOut",
    (h, e) => void h.m.menuOut(e),
    e => [
      [
        e,
        [
          { transform: "none", opacity: 1 },
          { transform: "scale(.9) translateY(-4px)", opacity: 0 },
        ],
        { duration: 160, easing: EASE.in, fill: "forwards" },
      ],
    ],
  ],
  [
    "modalIn",
    (h, e, e2) => h.m.modalIn(e, e2),
    (e, e2) => [
      [
        e,
        [
          { opacity: 0 },
          { opacity: 1 },
        ],
        { duration: 240, easing: EASE.out },
      ],
      [
        e2,
        [
          { transform: "translateY(40px) scale(0.85)", opacity: 0 },
          { transform: "none", opacity: 1, offset: 0.3 },
          { transform: "none", opacity: 1 },
        ],
        { duration: 420, easing: EASE.bouncy },
      ],
    ],
  ],
  [
    "modalOut",
    (h, e, e2) => void h.m.modalOut(e, e2),
    (e, e2) => [
      [
        e,
        [
          { opacity: 1 },
          { opacity: 0 },
        ],
        { duration: 240, easing: EASE.in, fill: "forwards" },
      ],
      [
        e2,
        [
          { transform: "none", opacity: 1 },
          { transform: "translateY(24px) scale(.92)", opacity: 0 },
        ],
        { duration: 240, easing: EASE.in, fill: "forwards" },
      ],
    ],
  ],
  [
    "toastIn",
    (h, e) => h.m.toastIn(e),
    e => [
      [
        e,
        [
          { transform: "translateY(120%) scale(.9)", opacity: 0 },
          { transform: "none", opacity: 1, offset: 0.35 },
          { transform: "none", opacity: 1 },
        ],
        { duration: 360, easing: EASE.bouncy },
      ],
    ],
  ],
  [
    "toastOut",
    (h, e) => void h.m.toastOut(e),
    e => [
      [
        e,
        [
          { transform: "none", opacity: 1 },
          { transform: "translateX(30px)", opacity: 0 },
        ],
        { duration: 160, easing: EASE.in, fill: "forwards" },
      ],
    ],
  ],
  [
    "tipIn",
    (h, e) => void h.m.tipIn(e),
    e => [
      [
        e,
        [
          { transform: "translate(-50%,-100%) translateY(4px) scale(.7)", opacity: 0 },
          { transform: "translate(-50%,-100%)", opacity: 1 },
        ],
        { duration: 160, easing: EASE.spring },
      ],
    ],
  ],
  [
    "editIn",
    (h, e) => void h.m.editIn(e),
    e => [
      [
        e,
        [
          { transform: "scale(.96)" },
          { transform: "scale(1)" },
        ],
        { duration: 240, easing: EASE.snappy },
      ],
    ],
  ],
  [
    "hopText",
    (h, e) => void h.m.hopText(e),
    e => [
      [
        e,
        [
          NONE,
          { transform: `translateY(${-5}px)`, offset: 0.4 },
          NONE,
        ],
        { duration: 380, easing: EASE.spring },
      ],
    ],
  ],
  [
    "shake",
    (h, e) => void h.m.shake(e),
    e => [
      [
        e,
        [
          { transform: "translateX(0)" },
          { transform: "translateX(-6px)" },
          { transform: "translateX(6px)" },
          { transform: "translateX(-4px)" },
          { transform: "translateX(3px)" },
          { transform: "translateX(0)" },
        ],
        { duration: 380, easing: "linear" },
      ],
    ],
  ],
  [
    "enterRow",
    (h, e) => h.m.enterRow(e),
    e => [
      [
        e,
        [
          { transform: "translateY(-48px) scale(.9,1.1)", opacity: 0 },
          { transform: "translateY(0) scale(1.06,.92)", opacity: 1, offset: 0.55 },
          { transform: "scale(.98,1.02)", offset: 0.78 },
          NONE,
        ],
        { duration: 600, easing: EASE.out },
      ],
    ],
  ],
  [
    "exitRow",
    (h, e) => void h.m.exitRow(e),
    e => [
      [
        e,
        [
          { transform: "none", opacity: 1 },
          { transform: "scale(1.04,.86)", opacity: 1, offset: 0.3 },
          { transform: "scale(.6)", opacity: 0 },
        ],
        { duration: 360, easing: EASE.in, fill: "forwards" },
      ],
    ],
  ],
  [
    "land",
    (h, e) => void h.m.land(e),
    e => [
      [
        e,
        [
          { transform: "scale(1.08,.9)" },
          { transform: "scale(.97,1.04)", offset: 0.5 },
          NONE,
        ],
        { duration: 600, easing: EASE.out },
      ],
    ],
  ],
  [
    "clone",
    (h, e) => h.m.clone(e, 30),
    e => [
      [
        e,
        [
          { transform: `translateY(${-30}px) scale(.96)`, opacity: 0.4 },
          { transform: "translateY(0) scale(1.03,.97)", opacity: 1, offset: 0.7 },
          { transform: "none", opacity: 1 },
        ],
        { duration: 560, easing: EASE.bouncy },
      ],
    ],
  ],
  [
    "tape",
    (h, e) => h.m.tape(e),
    e => [
      [
        e,
        [
          { transform: "rotate(-30deg) scale(1.6)", opacity: 0 },
          { transform: "rotate(-10deg) scale(1)", opacity: 0.92 },
        ],
        {
          duration: 600,
          easing: EASE.bouncy,
          fill: "backwards",
          delay: 560,
        },
      ],
    ],
  ],
  [
    "sticker",
    (h, e) => void h.m.sticker(e),
    e => [
      [
        e,
        [
          { transform: "rotate(40deg) scale(2.2)", opacity: 0 },
          { transform: "rotate(12deg) scale(1)", opacity: 1 },
        ],
        {
          duration: 600,
          easing: EASE.bouncy,
          delay: 0,
          fill: "backwards",
        },
      ],
    ],
  ],
  [
    "pick",
    (h, e) => void h.m.pick(e),
    e => [
      [
        e,
        [
          NONE,
          { transform: `scale(1.04) rotate(${-1.2}deg)` },
        ],
        { duration: 240, easing: EASE.snappy, fill: "forwards" },
      ],
    ],
  ],
  [
    "drop",
    (h, e) => void h.m.drop(e),
    e => [
      [
        e,
        [
          { transform: `scale(1.04) rotate(${-1.2}deg)` },
          { transform: "scale(.97,1.03)", offset: 0.45 },
          NONE,
        ],
        { duration: 700 * 0.6, easing: EASE.snappy },
      ],
    ],
  ],
  [
    "revert",
    (h, e, e2) => h.m.revert(e, e2, 40),
    e => [
      [
        e,
        [
          { transform: `translateY(${40}px)` },
          NONE,
        ],
        { duration: 560, easing: EASE.bouncy },
      ],
    ],
  ],
  [
    "roll",
    (h, e) => void h.m.roll(e, 1),
    e => [
      [
        e,
        [
          { transform: `translateY(${1 * 70}%)`, opacity: 0.15 },
          { transform: `translateY(${-1 * 8}%)`, opacity: 1, offset: 0.6 },
          { transform: "none", opacity: 1 },
        ],
        { duration: 380, easing: EASE.snappy },
      ],
    ],
  ],
  [
    "morph",
    (h, e) => void h.m.morph(e),
    e => [
      [
        e,
        [
          { transform: "scale(.3) rotate(-120deg)", opacity: 0 },
          { transform: "scale(1.15) rotate(10deg)", opacity: 1, offset: 0.6 },
          { transform: "none", opacity: 1 },
        ],
        { duration: 380, easing: EASE.bouncy },
      ],
    ],
  ],
  [
    "ringIn",
    (h, e) => void h.m.ringIn(e),
    e => [
      [
        e,
        [
          { transform: "scale(.94)", opacity: 0 },
          { transform: "scale(1.02)", opacity: 1, offset: 0.6 },
          { transform: "none", opacity: 1 },
        ],
        { duration: 600, easing: EASE.out },
      ],
    ],
  ],
  [
    "wave",
    (h, e, e2) => h.m.wave([e, e2]),
    (e, e2) => [
      [
        e,
        [
          NONE,
          { transform: `translateY(${-10 * 1 * 1}px)`, offset: 0.4 },
          NONE,
        ],
        {
          duration: 600,
          delay: 0,
          easing: EASE.bouncy,
          fill: "backwards",
        },
      ],
      [
        e2,
        [
          NONE,
          { transform: `translateY(${-10 * 1 * 1}px)`, offset: 0.4 },
          NONE,
        ],
        {
          duration: 600,
          delay: 40,
          easing: EASE.bouncy,
          fill: "backwards",
        },
      ],
    ],
  ],
  [
    "droop",
    (h, e, e2) => h.m.droop([e, e2]),
    (e, e2) => [
      [
        e,
        [
          NONE,
          { transform: "translateY(4px) scale(1.02,.96)", offset: 0.5 },
          NONE,
        ],
        { duration: 950, delay: 0, easing: EASE["in-out"] },
      ],
      [
        e2,
        [
          NONE,
          { transform: "translateY(4px) scale(1.02,.96)", offset: 0.5 },
          NONE,
        ],
        { duration: 950, delay: 20, easing: EASE["in-out"] },
      ],
    ],
  ],
  [
    "stagOut",
    (h, e, e2) => void h.m.stagOut([e, e2]),
    (e, e2) => [
      [
        e,
        [
          { transform: "none", opacity: 1 },
          { transform: "translateY(12px)", opacity: 0 },
        ],
        {
          duration: 160,
          delay: 0,
          easing: EASE.in,
          fill: "forwards",
        },
      ],
      [
        e2,
        [
          { transform: "none", opacity: 1 },
          { transform: "translateY(12px)", opacity: 0 },
        ],
        {
          duration: 160,
          delay: 20,
          easing: EASE.in,
          fill: "forwards",
        },
      ],
    ],
  ],
  [
    "stagIn",
    (h, e, e2) => h.m.stagIn([e, e2]),
    (e, e2) => [
      [
        e,
        [
          { transform: "translateY(24px) scale(.96)", opacity: 0 },
          { transform: "none", opacity: 1, offset: 0.4 },
          { transform: "none", opacity: 1 },
        ],
        {
          duration: 600,
          delay: 0,
          easing: EASE.bouncy,
          fill: "backwards",
        },
      ],
      [
        e2,
        [
          { transform: "translateY(24px) scale(.96)", opacity: 0 },
          { transform: "none", opacity: 1, offset: 0.4 },
          { transform: "none", opacity: 1 },
        ],
        {
          duration: 600,
          delay: 40,
          easing: EASE.bouncy,
          fill: "backwards",
        },
      ],
    ],
  ],
  [
    "pageOut",
    (h, e) => void h.m.pageOut(e, 1),
    e => [
      [
        e,
        [
          { transform: "none", opacity: 1 },
          { transform: `translateX(${-1 * 60}px) scale(.97)`, opacity: 0 },
        ],
        { duration: 160, easing: EASE.in, fill: "forwards" },
      ],
    ],
  ],
  [
    "pageIn",
    (h, e) => h.m.pageIn(e, 1),
    e => [
      [
        e,
        [
          { transform: `translateX(${1 * 80}px) scale(.97)`, opacity: 0 },
          { transform: "none", opacity: 1 },
        ],
        { duration: 460, easing: EASE.snappy },
      ],
    ],
  ],
  [
    "progress",
    (h, e) => void h.m.progress(e, 10, 60),
    e => [
      [
        e,
        [
          { transform: "translateX(10%)" },
          { transform: "translateX(60%)" },
        ],
        { duration: 600, easing: EASE.bouncy },
      ],
    ],
  ],
  [
    "pop",
    (h, e) => void h.m.pop(e),
    e => [
      [
        e,
        [
          { transform: `scale(${1 + (1.3 - 1) * 1})` },
          NONE,
        ],
        { duration: 380, easing: EASE.spring },
      ],
    ],
  ],
];

describe("every Responsive recipe", () => {
  it.each(ROWS)("%s", (_name, run, expected) => {
    const h = motionHarness();
    const e = h.el();
    const e2 = h.el();
    run(h, e, e2);
    expect(h.log.map(c => [c.target, c.keyframes, c.options])).toEqual(expected(e, e2));
  });
});

describe("knob-sensitive recipes at Showcase gain 1.6", () => {
  it("jelly multiplies its amplitude by the gain", () => {
    const h = motionHarness({ tokens: SHOWCASE });
    h.m.jelly("resp", h.el(), 2);
    expect(h.log[0]?.keyframes).toEqual(jellyKf(2 * 1.6));
  });

  it("jelly takes an explicit duration", () => {
    const h = motionHarness();
    h.m.jelly("resp", h.el(), 1, 123);
    expect(h.log[0]?.options.duration).toBe(123);
  });

  it("release", () => {
    const h = motionHarness({ tokens: SHOWCASE });
    h.m.release(h.el());
    expect(h.log[0]?.keyframes).toEqual([
      { transform: "scale(1,1)" },
      { transform: `scale(${1 + 0.06 * 1.6},${1 - 0.06 * 1.6})`, offset: 0.3 },
      { transform: `scale(${1 - 0.03 * 1.6},${1 + 0.03 * 1.6})`, offset: 0.65 },
      { transform: "scale(1,1)" },
    ]);
  });

  it("hopText", () => {
    const h = motionHarness({ tokens: SHOWCASE });
    h.m.hopText(h.el());
    expect(h.log[0]?.keyframes[1]).toEqual({ transform: `translateY(${-5 * 1.6}px)`, offset: 0.4 });
  });

  it("wave, with k", () => {
    const h = motionHarness({ tokens: SHOWCASE });
    h.m.wave([
      h.el(),
    ], 2);
    expect(h.log[0]?.keyframes[1]).toEqual({ transform: `translateY(${-10 * 1.6 * 2}px)`, offset: 0.4 });
  });

  it("pop scales the overshoot by the gain, and takes its own size", () => {
    const h = motionHarness({ tokens: SHOWCASE });
    h.m.pop(h.el(), 1.5);
    expect(h.log[0]?.keyframes[0]).toEqual({ transform: `scale(${1 + (1.5 - 1) * 1.6})` });
  });
});

describe("dialect-sensitive recipes", () => {
  it.each([
    ["Workspace", null, 0.85],
    ["Broadcast", "broadcast", 0.85],
    ["Showcase", "showcase", 0.7],
  ] as const)("modalIn's card starts at scale %s", (_name, dialect, s) => {
    const h = motionHarness({
      cfg: { dialect },
    });
    h.m.modalIn(h.el(), h.el());
    expect(h.log[1]?.keyframes[0]).toEqual({ transform: `translateY(40px) scale(${s})`, opacity: 0 });
  });

  it.each([
    ["Workspace", null, -1.2],
    ["Showcase", "showcase", -2],
  ] as const)("pick and drop tilt by %s", (_name, dialect, angle) => {
    const h = motionHarness({
      cfg: { dialect },
    });
    h.m.pick(h.el());
    h.m.drop(h.el());
    expect(h.log[0]?.keyframes[1]).toEqual({ transform: `scale(1.04) rotate(${angle}deg)` });
    expect(h.log[1]?.keyframes[0]).toEqual({ transform: `scale(1.04) rotate(${angle}deg)` });
  });
});

describe("menuIn", () => {
  it.each([0, 1, 3])("staggers %d children by 40 + i * 30 ms", (count) => {
    const h = motionHarness({ cue: true });
    const kids = Array.from({ length: count }, () => h.el());
    const menu = h.el({ children: kids });
    h.m.menuIn(menu);
    expect(h.log[0]).toMatchObject({
      target: menu,
      keyframes: [
        { transform: "scale(.6) translateY(-8px)", opacity: 0 },
        { transform: "none", opacity: 1, offset: 0.4 },
        { transform: "none", opacity: 1 },
      ],
      options: { duration: 360, easing: EASE.bouncy },
    });
    expect(h.log.slice(1).map(c => [c.target, c.options])).toEqual(kids.map((k, i) => [
      k,
      {
        duration: 240,
        delay: 40 + i * 30,
        easing: EASE.out,
        fill: "backwards",
      },
    ]));
    expect(h.log.slice(1).map(c => c.keyframes)).toEqual(kids.map(() => [
      { transform: "translateY(6px)", opacity: 0 },
      { transform: "none", opacity: 1 },
    ]));
  });

  it("cues menu.open (R04) and menu.close (R05) through the hook", () => {
    const h = motionHarness({ cue: true });
    h.m.menuIn(h.el());
    void h.m.menuOut(h.el());
    vi.runAllTimers();
    expect(h.cues).toEqual([
      ["menu.open", "R04"],
      ["menu.close", "R05"],
    ]);
  });
});

describe("cues of the Responsive recipes", () => {
  it("each recipe cues its moment ID through the hook", () => {
    const h = motionHarness({ cue: true });
    h.m.modalIn(h.el(), h.el());
    void h.m.modalOut(h.el(), h.el());
    h.m.toastIn(h.el());
    h.m.toastIn(h.el(), true);
    h.m.enterRow(h.el());
    h.m.clone(h.el(), 10);
    h.m.tape(h.el());
    h.m.revert(h.el(), h.el(), 10);
    h.m.full(h.el());
    vi.runAllTimers();
    expect(h.cues.map(c => c.join(":")).sort()).toEqual([
      "add.plop:R13",
      "counter.full:R24",
      "drag.revert:R22",
      "dup.clone:R15",
      "modal.in:R06",
      "modal.out:R07",
      "pin.tape:R16",
      "toast.error:R08",
      "toast.in:R08",
    ]);
  });

  it.each([
    [
      "modalIn",
      (h: MotionHarness) => h.m.modalIn(h.el(), h.el()),
      420 * 0.25,
    ],
    [
      "toastIn",
      (h: MotionHarness) => h.m.toastIn(h.el()),
      360 * 0.6,
    ],
    [
      "enterRow",
      (h: MotionHarness) => h.m.enterRow(h.el()),
      600 * 0.55,
    ],
    [
      "tape",
      (h: MotionHarness) => h.m.tape(h.el()),
      560 + 600 * 0.6,
    ],
    [
      "revert",
      (h: MotionHarness) => h.m.revert(h.el(), h.el(), 10),
      560 * 0.8,
    ],
    [
      "full",
      (h: MotionHarness) => h.m.full(h.el()),
      700 * 0.2,
    ],
    [
      "exitRow",
      (h: MotionHarness) => void h.m.exitRow(h.el()),
      360 * 0.3,
    ],
  ])("%s cues after the right delay", (_name, call, at) => {
    const h = motionHarness({ cue: true });
    call(h);
    vi.advanceTimersByTime(at - 1);
    expect(h.cues.filter(([n]) => n !== "toast.in").length).toBe(0);
    vi.advanceTimersByTime(1);
    expect(h.cues).toHaveLength(1);
  });
});

describe("toastIn follow-up", () => {
  it("jellies the toast at half amplitude, for 70% of the jelly time, once it has landed", async () => {
    const h = motionHarness();
    const el = h.el();
    h.m.toastIn(el);
    expect(h.log).toHaveLength(1);
    h.log[0]?.animation.finish();
    await vi.advanceTimersByTimeAsync(0);
    expect(h.log).toHaveLength(2);
    expect(h.log[1]?.target).toBe(el);
    expect(h.log[1]?.keyframes).toEqual(jellyKf(0.5 * 1));
    expect(h.log[1]?.options).toEqual({ duration: 700 * 0.7, easing: EASE.out });
  });

  it("shakes an error toast instead", async () => {
    const h = motionHarness();
    const el = h.el();
    h.m.toastIn(el, true);
    h.log[0]?.animation.finish();
    await vi.advanceTimersByTimeAsync(0);
    expect(h.log[1]?.options).toEqual({ duration: 380, easing: "linear" });
    expect(h.log[1]?.keyframes).toHaveLength(6);
  });

  it("does nothing more when the toast is cancelled, and raises no unhandled rejection", async () => {
    const h = motionHarness();
    h.m.toastIn(h.el());
    h.log[0]?.animation.cancel();
    await vi.advanceTimersByTimeAsync(0);
    expect(h.log).toHaveLength(1);
  });
});

describe("enterRow and exitRow timers", () => {
  it("enterRow bursts only in Showcase, after half the land time", () => {
    const h = motionHarness({
      tokens: SHOWCASE,
      cfg: { dialect: "showcase" },
    });
    h.m.enterRow(h.el());
    vi.advanceTimersByTime(600 * 0.5 - 1);
    expect(h.layer.children).toHaveLength(0);
    vi.advanceTimersByTime(1);
    const ps = h.layer.children as unknown as FakeElement[];
    expect(ps).toHaveLength(8);
    expect(ps.slice(0, 2).map(p => p.style.background)).toEqual(["var(--p-pink-150)", "var(--confetti-4)"]);
    expect(ps[0]?.style.borderRadius).toBe("50%");
    expect(ps[0]?.style.width).toBe(`${12 * (0.6 + 0.5 * 0.8)}px`);
  });

  it("enterRow starts its burst a tenth in from the left", () => {
    const h = motionHarness({
      cfg: { dialect: "showcase" },
    });
    h.m.enterRow(h.el({
      rect: {
        left: 100,
        top: 50,
        width: 40,
        height: 20,
      },
    }));
    vi.advanceTimersByTime(300);
    expect((h.layer.children as unknown as FakeElement[])[0]?.style).toMatchObject({ left: `${100 + 40 * 0.1}px`, top: "60px" });
  });

  it("enterRow does not burst in the Workspace or Broadcast", () => {
    for (const dialect of [null, "broadcast"] as const) {
      const h = motionHarness({
        cfg: { dialect },
      });
      h.m.enterRow(h.el());
      vi.runAllTimers();
      expect(h.layer.children).toHaveLength(0);
    }
  });

  it("exitRow puffs eight circles after 30% of the toast time, going out and down no further", () => {
    const h = motionHarness();
    void h.m.exitRow(h.el());
    vi.advanceTimersByTime(360 * 0.3 - 1);
    expect(h.layer.children).toHaveLength(0);
    vi.advanceTimersByTime(1);
    const ps = h.layer.children as unknown as FakeElement[];
    expect(ps).toHaveLength(8);
    expect(ps.slice(0, 3).map(p => p.style.background)).toEqual(["var(--p-mist-300)", "var(--p-mist-100)", "var(--p-white)"]);
    expect(ps[0]?.style.width).toBe(`${18 * (0.6 + 0.5 * 0.8)}px`);
    const ang = 0.5 * Math.PI * 2;
    const dist = 120 * 1 ** 0.5 * (0.35 + 0.5 * 0.65);
    expect(h.log[1]?.keyframes[2]?.transform).toBe(`translate(calc(-50% + ${Math.cos(ang) * dist * 1.15}px), calc(-50% + ${Math.sin(ang) * dist + -20}px)) scale(.7) rotate(0deg)`);
  });

  it("exitRow schedules its burst even when reduced, and the burst gates itself", () => {
    const h = motionHarness({
      cfg: { reduced: true },
    });
    void h.m.exitRow(h.el());
    expect(vi.getTimerCount()).toBe(1);
    vi.runAllTimers();
    expect(h.layer.children).toHaveLength(0);
  });
});

describe("capture and flip", () => {
  it("capture maps each key to its element's box", () => {
    const h = motionHarness();
    const a = h.el({
      rect: {
        left: 0,
        top: 10,
        width: 5,
        height: 5,
      },
    });
    const b = h.el({
      rect: {
        left: 0,
        top: 80,
        width: 5,
        height: 5,
      },
    });
    const map = h.m.capture([
      ["a", a],
      ["b", b],
    ]);
    expect([
      ...map.keys(),
    ]).toEqual(["a", "b"]);
    expect(map.get("b")?.top).toBe(80);
  });

  it("flip slides an element from where it was", () => {
    const h = motionHarness();
    const el = h.el({
      rect: {
        left: 0,
        top: 40,
        width: 5,
        height: 5,
      },
    });
    h.m.flip(new Map([
      [
        "a",
        fakeRect(0, 100, 5, 5),
      ],
    ]), [
      ["a", el],
    ]);
    expect(h.log.map(c => [c.target, c.keyframes, c.options])).toEqual([
      [
        el,
        [
          { transform: `translateY(${60}px)` },
          NONE,
        ],
        { duration: 560, easing: EASE.snappy },
      ],
    ]);
  });

  it("flip divides the distance by the scale", () => {
    const h = motionHarness();
    const el = h.el({
      rect: {
        left: 0,
        top: 40,
        width: 5,
        height: 5,
      },
    });
    h.m.flip(new Map([
      [
        "a",
        fakeRect(0, 100, 5, 5),
      ],
    ]), [
      ["a", el],
    ], 2);
    expect(h.log[0]?.keyframes[0]).toEqual({ transform: `translateY(${60 / 2}px)` });
  });

  it("flip skips a move under 1 px, an unknown key, and a special that handled it", () => {
    const h = motionHarness();
    const el = h.el({
      rect: {
        left: 0,
        top: 40,
        width: 5,
        height: 5,
      },
    });
    h.m.flip(new Map([
      [
        "a",
        fakeRect(0, 40.5, 5, 5),
      ],
    ]), [
      ["a", el],
    ]);
    h.m.flip(new Map([
      [
        "x",
        fakeRect(0, 100, 5, 5),
      ],
    ]), [
      ["a", el],
    ]);
    const special = vi.fn(() => true);
    h.m.flip(new Map([
      [
        "a",
        fakeRect(0, 100, 5, 5),
      ],
    ]), [
      ["a", el],
    ], 1, special);
    expect(h.log).toEqual([]);
    expect(special).toHaveBeenCalledWith("a", el, 60);
  });

  it("flip still animates when special declines", () => {
    const h = motionHarness();
    const el = h.el({
      rect: {
        left: 0,
        top: 40,
        width: 5,
        height: 5,
      },
    });
    h.m.flip(new Map([
      [
        "a",
        fakeRect(0, 100, 5, 5),
      ],
    ]), [
      ["a", el],
    ], 1, () => false);
    expect(h.log).toHaveLength(1);
  });
});

describe("arc", () => {
  it.each([
    [40, -2],
    [-40, 2],
  ])("a move of %d px tilts by %d degrees and lifts the element while it flies", (dy, tilt) => {
    const h = motionHarness();
    const el = h.el();
    const a = h.m.arc(el, dy);
    expect(el.style.zIndex).toBe("15");
    expect(a).toBe(h.log[0]?.animation);
    expect(h.log[0]?.keyframes).toEqual([
      { transform: `translateY(${dy}px)` },
      { transform: `translateY(${dy * 0.5}px) scale(1.04) rotate(${tilt}deg)`, offset: 0.5 },
      NONE,
    ]);
    expect(h.log[0]?.options).toEqual({ duration: 560 * 1.3, easing: EASE["in-out"] });
  });

  it("clears the z-index and calls after once it lands", async () => {
    const h = motionHarness();
    const el = h.el();
    const after = vi.fn();
    h.m.arc(el, 40, after);
    h.log[0]?.animation.finish();
    await vi.advanceTimersByTimeAsync(0);
    expect(el.style.zIndex).toBe("");
    expect(after).toHaveBeenCalledOnce();
  });
});

describe("revert", () => {
  it("wobbles the middle once the outer element has settled", async () => {
    const h = motionHarness();
    const outer = h.el();
    const mid = h.el();
    h.m.revert(outer, mid, 40);
    expect(h.log).toHaveLength(1);
    h.log[0]?.animation.finish();
    await vi.advanceTimersByTimeAsync(0);
    expect(h.log[1]?.target).toBe(mid);
    expect(h.log[1]?.keyframes).toEqual([
      { transform: "rotate(0)" },
      { transform: "rotate(-3deg)" },
      { transform: "rotate(3deg)" },
      { transform: "rotate(-2deg)" },
      { transform: "rotate(0)" },
    ]);
    expect(h.log[1]?.options).toEqual({ duration: 380, easing: "linear" });
  });
});

describe("roll", () => {
  it("rolls the other way with dir -1", () => {
    const h = motionHarness();
    h.m.roll(h.el(), -1);
    expect(h.log[0]?.keyframes).toEqual([
      { transform: `translateY(${-1 * 70}%)`, opacity: 0.15 },
      { transform: `translateY(${1 * 8}%)`, opacity: 1, offset: 0.6 },
      { transform: "none", opacity: 1 },
    ]);
  });
});

describe("pageOut and wave", () => {
  it("pageOut with dir -1 slides right", () => {
    const h = motionHarness();
    void h.m.pageOut(h.el(), -1);
    expect(h.log[0]?.keyframes[1]).toEqual({ transform: "translateX(60px) scale(.97)", opacity: 0 });
  });

  it("wave defaults k to 1", () => {
    const h = motionHarness();
    h.m.wave([
      h.el(),
    ]);
    expect(h.log[0]?.keyframes[1]?.transform).toBe("translateY(-10px)");
  });
});

describe("stagIn, stagOut and pageIn", () => {
  it("stagIn cancels the forwards-fill animations an exit left, and keeps the others", () => {
    const h = motionHarness();
    const el = h.el();
    const exit = el.animate([], { fill: "forwards" }) as unknown as { cancelled: boolean };
    const loop = el.animate([], { iterations: Infinity }) as unknown as { cancelled: boolean };
    h.m.stagIn([el]);
    expect([exit.cancelled, loop.cancelled]).toEqual([true, false]);
  });

  it("pageIn cancels every animation on the element", () => {
    const h = motionHarness();
    const el = h.el();
    const a = el.animate([], { fill: "forwards" }) as unknown as { cancelled: boolean };
    const b = el.animate([], { iterations: Infinity }) as unknown as { cancelled: boolean };
    h.m.pageIn(el, 1);
    expect([a.cancelled, b.cancelled]).toEqual([true, true]);
  });

  it("stagOut of nothing resolves to an empty list", async () => {
    const h = motionHarness();
    await expect(h.m.stagOut([])).resolves.toEqual([]);
  });

  it("stagOut waits for every element to finish", async () => {
    const h = motionHarness();
    let resolved = false;
    void h.m.stagOut([
      h.el(),
      h.el(),
    ]).then(() => {
      resolved = true;
    });
    await vi.advanceTimersByTimeAsync(0);
    expect(resolved).toBe(false);
    h.log.forEach(c => c.animation.finish());
    await vi.advanceTimersByTimeAsync(0);
    expect(resolved).toBe(true);
  });

  it("an exit that is cancelled still resolves", async () => {
    const h = motionHarness();
    let resolved = false;
    void h.m.menuOut(h.el()).then(() => {
      resolved = true;
    });
    h.log[0]?.animation.cancel();
    await vi.advanceTimersByTimeAsync(0);
    expect(resolved).toBe(true);
  });
});

describe("full", () => {
  it("jellies the well and bursts eight pieces in butter, mint and amber", () => {
    const h = motionHarness();
    h.m.full(h.el());
    expect(h.log[0]?.keyframes).toEqual(jellyKf(1));
    const ps = h.layer.children as unknown as FakeElement[];
    expect(ps).toHaveLength(8);
    expect(ps.slice(0, 3).map(p => p.style.background)).toEqual(["var(--p-butter-300)", "var(--confetti-3)", "var(--confetti-2)"]);
  });

  it("an Overlay well jellies at half amplitude and does not burst", () => {
    const h = motionHarness();
    h.m.full(h.el(), true);
    expect(h.log[0]?.keyframes).toEqual(jellyKf(0.5));
    expect(h.layer.children).toHaveLength(0);
  });

  it("under calm the jelly is half amplitude and the page well still bursts", () => {
    const h = motionHarness({
      cfg: { calm: true },
    });
    h.m.full(h.el());
    expect(h.log[0]?.keyframes).toEqual(jellyKf(0.5));
    expect(h.layer.children).toHaveLength(8);
  });
});

describe("sticker", () => {
  it("takes a delay and belongs to the celebratory tier", () => {
    const h = motionHarness({
      cfg: { cel: false },
    });
    h.m.sticker(h.el(), 100);
    expect(h.log).toEqual([]);
    const h2 = motionHarness();
    h2.m.sticker(h2.el(), 100);
    expect(h2.log[0]?.options.delay).toBe(100);
  });
});

describe("themeWipe", () => {
  it("grows a disc from the click, swaps at the end, fades on the next frame, then removes itself", () => {
    const h = motionHarness();
    const layer = h.layer;
    const swap = vi.fn();
    h.m.themeWipe(layer, 300, 100, "var(--color-page)", swap);
    // 1000 x 800 window: the farthest corner from (300, 100) is (1000, 800).
    const r = Math.hypot(Math.max(300, 1000 - 300), Math.max(100, 800 - 100));
    const disc = layer.children[0] as FakeElement;
    expect(disc.style).toMatchObject({
      position: "fixed",
      left: `${300 - r}px`,
      top: `${100 - r}px`,
      width: `${2 * r}px`,
      height: `${2 * r}px`,
      borderRadius: "50%",
      background: "var(--color-page)",
      pointerEvents: "none",
      zIndex: 90,
      transform: "scale(0)",
    });
    expect(h.log[0]).toMatchObject({
      target: disc,
      keyframes: [
        { transform: "scale(0)" },
        { transform: "scale(1)" },
      ],
      options: { duration: 560, easing: EASE["in-out"], fill: "forwards" },
    });
    expect(swap).not.toHaveBeenCalled();
    h.log[0]?.animation.finish();
    expect(swap).toHaveBeenCalledOnce();
    expect(h.log).toHaveLength(1);
    expect(h.log).toHaveLength(1);
    layer.flushFrames();
    expect(h.log).toHaveLength(2);
    expect(h.log[1]).toMatchObject({
      target: disc,
      keyframes: [
        { opacity: 1 },
        { opacity: 0 },
      ],
      options: { duration: 240, easing: EASE.out, fill: "forwards" },
    });
    h.log[1]?.animation.finish();
    expect(layer.children).toHaveLength(0);
  });
});
