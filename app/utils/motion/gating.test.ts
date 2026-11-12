import type { FakeElement, MotionHarness } from "../../../tests/support/fake-motion";
import type { Tier } from "./types";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fakeRect, motionHarness, REDUCED, SHOWCASE, WORKSPACE } from "../../../tests/support/fake-motion";

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

type Call = (h: MotionHarness, e: FakeElement) => unknown;

// One call per recipe (and per tier a recipe can take), with the tier that gates it.
const RECIPES: [name: string, tier: Tier, call: Call][] = [
  [
    "burst resp",
    "resp",
    (h, e) => h.m.burst("resp", e),
  ],
  [
    "burst cel",
    "cel",
    (h, e) => h.m.burst("cel", e),
  ],
  [
    "burst amb",
    "amb",
    (h, e) => h.m.burst("amb", e),
  ],
  [
    "rain resp",
    "resp",
    h => h.m.rain("resp"),
  ],
  [
    "rain cel",
    "cel",
    h => h.m.rain("cel"),
  ],
  [
    "tick sec",
    "resp",
    (h, e) => h.m.tick([e], "total", "sec"),
  ],
  [
    "tick row",
    "resp",
    (h, e) => h.m.tick([e], "row", "sec"),
  ],
  [
    "tick hour",
    "resp",
    (h, e) => h.m.tick([
      e,
      h.el(),
    ], "total", "hour", h.el()),
  ],
  [
    "beat",
    "resp",
    (h, e) => h.m.beat(e, 2),
  ],
  [
    "stageChange",
    "resp",
    (h, e) => h.m.stageChange(e),
  ],
  [
    "jelly resp",
    "resp",
    (h, e) => h.m.jelly("resp", e),
  ],
  [
    "jelly cel",
    "cel",
    (h, e) => h.m.jelly("cel", e),
  ],
  [
    "release",
    "resp",
    (h, e) => h.m.release(e),
  ],
  [
    "menuIn",
    "resp",
    (h, e) => h.m.menuIn(h.el({
      children: [
        e,
        h.el(),
      ],
    })),
  ],
  [
    "menuOut",
    "resp",
    (h, e) => h.m.menuOut(e),
  ],
  [
    "modalIn",
    "resp",
    (h, e) => h.m.modalIn(e, h.el()),
  ],
  [
    "modalOut",
    "resp",
    (h, e) => h.m.modalOut(e, h.el()),
  ],
  [
    "toastIn",
    "resp",
    (h, e) => h.m.toastIn(e),
  ],
  [
    "toastIn error",
    "resp",
    (h, e) => h.m.toastIn(e, true),
  ],
  [
    "toastOut",
    "resp",
    (h, e) => h.m.toastOut(e),
  ],
  [
    "tipIn",
    "resp",
    (h, e) => h.m.tipIn(e),
  ],
  [
    "editIn",
    "resp",
    (h, e) => h.m.editIn(e),
  ],
  [
    "hopText",
    "resp",
    (h, e) => h.m.hopText(e),
  ],
  [
    "shake",
    "resp",
    (h, e) => h.m.shake(e),
  ],
  [
    "enterRow",
    "resp",
    (h, e) => h.m.enterRow(e),
  ],
  [
    "exitRow",
    "resp",
    (h, e) => h.m.exitRow(e),
  ],
  [
    "flip",
    "resp",
    (h, e) => h.m.flip(new Map([
      [
        "a",
        fakeRect(0, 100, 10, 10),
      ],
    ]), [
      ["a", e],
    ]),
  ],
  [
    "arc",
    "resp",
    (h, e) => h.m.arc(e, 40),
  ],
  [
    "land",
    "resp",
    (h, e) => h.m.land(e),
  ],
  [
    "clone",
    "resp",
    (h, e) => h.m.clone(e, 30),
  ],
  [
    "tape",
    "resp",
    (h, e) => h.m.tape(e),
  ],
  [
    "sticker",
    "cel",
    (h, e) => h.m.sticker(e),
  ],
  [
    "pick",
    "resp",
    (h, e) => h.m.pick(e),
  ],
  [
    "drop",
    "resp",
    (h, e) => h.m.drop(e),
  ],
  [
    "revert",
    "resp",
    (h, e) => h.m.revert(e, h.el(), 40),
  ],
  [
    "roll",
    "resp",
    (h, e) => h.m.roll(e, 1),
  ],
  [
    "full",
    "resp",
    (h, e) => h.m.full(e),
  ],
  [
    "morph",
    "resp",
    (h, e) => h.m.morph(e),
  ],
  [
    "ringIn",
    "resp",
    (h, e) => h.m.ringIn(e),
  ],
  [
    "wave",
    "resp",
    (h, e) => h.m.wave([
      e,
      h.el(),
    ]),
  ],
  [
    "droop",
    "resp",
    (h, e) => h.m.droop([
      e,
      h.el(),
    ]),
  ],
  [
    "stagOut",
    "resp",
    (h, e) => h.m.stagOut([
      e,
      h.el(),
    ]),
  ],
  [
    "stagIn",
    "resp",
    (h, e) => h.m.stagIn([
      e,
      h.el(),
    ]),
  ],
  [
    "pageOut",
    "resp",
    (h, e) => h.m.pageOut(e, 1),
  ],
  [
    "pageIn",
    "resp",
    (h, e) => h.m.pageIn(e, 1),
  ],
  [
    "progress",
    "resp",
    (h, e) => h.m.progress(e, 0, 50),
  ],
  [
    "pop",
    "resp",
    (h, e) => h.m.pop(e),
  ],
  [
    "themeWipe",
    "resp",
    (h, e) => h.m.themeWipe(e, 10, 10, "red", () => {}),
  ],
  [
    "highlight",
    "resp",
    (h, e) => h.m.highlight(e),
  ],
  [
    "bannerIn",
    "resp",
    (h, e) => h.m.bannerIn(e),
  ],
  [
    "bannerOut",
    "resp",
    (h, e) => h.m.bannerOut(e),
  ],
  [
    "mute",
    "resp",
    (h, e) => h.m.mute(e, true),
  ],
  [
    "pageFlipOut",
    "amb",
    (h, e) => h.m.pageFlipOut([
      e,
      h.el(),
    ]),
  ],
  [
    "pageFlipIn",
    "amb",
    (h, e) => h.m.pageFlipIn([
      e,
      h.el(),
    ]),
  ],
  [
    "cardEnter",
    "resp",
    (h, e) => h.m.cardEnter(e),
  ],
  [
    "stampIn",
    "cel",
    (h, e) => h.m.stampIn(e),
  ],
  [
    "stampOut",
    "cel",
    (h, e) => h.m.stampOut(e),
  ],
  [
    "cardHop",
    "cel",
    (h, e) => h.m.cardHop(e),
  ],
  [
    "won",
    "cel",
    (h, e) => h.m.won(e, h.el()),
  ],
  [
    "niniJump",
    "cel",
    (h, e) => h.m.niniJump(e),
  ],
  [
    "niniHop",
    "cel",
    (h, e) => h.m.niniHop(e),
  ],
  [
    "unfurl",
    "cel",
    (h, e) => h.m.unfurl(e),
  ],
  [
    "flash",
    "cel",
    (h, e) => h.m.flash(e),
  ],
  [
    "bannerDrop",
    "cel",
    (h, e) => h.m.bannerDrop(e),
  ],
];

// Recipes that take one element and tolerate it being missing.
const NULLABLE: [name: string, call: (h: MotionHarness, e: null | undefined) => unknown][] = [
  [
    "burst",
    (h, e) => h.m.burst("resp", e),
  ],
  [
    "stageChange",
    (h, e) => h.m.stageChange(e),
  ],
  [
    "beat",
    (h, e) => h.m.beat(e, 2),
  ],
  [
    "jelly",
    (h, e) => h.m.jelly("resp", e),
  ],
  [
    "release",
    (h, e) => h.m.release(e),
  ],
  [
    "menuIn",
    (h, e) => h.m.menuIn(e),
  ],
  [
    "menuOut",
    (h, e) => h.m.menuOut(e),
  ],
  [
    "modalIn",
    (h, e) => h.m.modalIn(e, e),
  ],
  [
    "modalOut",
    (h, e) => h.m.modalOut(e, e),
  ],
  [
    "toastIn",
    (h, e) => h.m.toastIn(e),
  ],
  [
    "toastOut",
    (h, e) => h.m.toastOut(e),
  ],
  [
    "tipIn",
    (h, e) => h.m.tipIn(e),
  ],
  [
    "editIn",
    (h, e) => h.m.editIn(e),
  ],
  [
    "hopText",
    (h, e) => h.m.hopText(e),
  ],
  [
    "shake",
    (h, e) => h.m.shake(e),
  ],
  [
    "enterRow",
    (h, e) => h.m.enterRow(e),
  ],
  [
    "exitRow",
    (h, e) => h.m.exitRow(e),
  ],
  [
    "land",
    (h, e) => h.m.land(e),
  ],
  [
    "clone",
    (h, e) => h.m.clone(e, 30),
  ],
  [
    "tape",
    (h, e) => h.m.tape(e),
  ],
  [
    "sticker",
    (h, e) => h.m.sticker(e),
  ],
  [
    "pick",
    (h, e) => h.m.pick(e),
  ],
  [
    "drop",
    (h, e) => h.m.drop(e),
  ],
  [
    "revert",
    (h, e) => h.m.revert(e, e, 40),
  ],
  [
    "roll",
    (h, e) => h.m.roll(e, 1),
  ],
  [
    "full",
    (h, e) => h.m.full(e),
  ],
  [
    "morph",
    (h, e) => h.m.morph(e),
  ],
  [
    "ringIn",
    (h, e) => h.m.ringIn(e),
  ],
  [
    "pageOut",
    (h, e) => h.m.pageOut(e, 1),
  ],
  [
    "pageIn",
    (h, e) => h.m.pageIn(e, 1),
  ],
  [
    "progress",
    (h, e) => h.m.progress(e, 0, 50),
  ],
  [
    "pop",
    (h, e) => h.m.pop(e),
  ],
  [
    "highlight",
    (h, e) => h.m.highlight(e),
  ],
  [
    "bannerIn",
    (h, e) => h.m.bannerIn(e),
  ],
  [
    "bannerOut",
    (h, e) => h.m.bannerOut(e),
  ],
  [
    "mute on",
    (h, e) => h.m.mute(e, true),
  ],
  [
    "mute off",
    (h, e) => h.m.mute(e, false),
  ],
  [
    "cardEnter",
    (h, e) => h.m.cardEnter(e),
  ],
  [
    "stampIn",
    (h, e) => h.m.stampIn(e),
  ],
  [
    "stampOut",
    (h, e) => h.m.stampOut(e),
  ],
  [
    "cardHop",
    (h, e) => h.m.cardHop(e),
  ],
  [
    "won",
    (h, e) => h.m.won(e, e),
  ],
  [
    "niniJump",
    (h, e) => h.m.niniJump(e),
  ],
  [
    "niniHop",
    (h, e) => h.m.niniHop(e),
  ],
  [
    "unfurl",
    (h, e) => h.m.unfurl(e),
  ],
  [
    "flash",
    (h, e) => h.m.flash(e),
  ],
  [
    "bannerDrop",
    (h, e) => h.m.bannerDrop(e),
  ],
];

// The three ways motion is reduced.
const REDUCED_STATES: [string, (h: MotionHarness) => void][] = [
  [
    "cfg().reduced",
    h => h.setCfg({ reduced: true }),
  ],
  [
    "the media query matches",
    (h) => {
      h.env.mediaMatches = true;
    },
  ],
  [
    "<html data-motion=\"reduce\">",
    h => h.env.setAttr("data-motion", "reduce"),
  ],
];

describe("m.on", () => {
  it("is true for every tier by default", () => {
    const h = motionHarness();
    expect(["amb", "resp", "cel"].map(t => h.m.on(t as Tier))).toEqual([true, true, true]);
  });

  it.each(REDUCED_STATES)("is false for every tier when %s", (_label, reduce) => {
    const h = motionHarness();
    reduce(h);
    expect(["amb", "resp", "cel"].map(t => h.m.on(t as Tier))).toEqual([false, false, false]);
  });

  it.each([
    [
      "amb",
      [false, true, true],
    ],
    [
      "resp",
      [true, false, true],
    ],
    [
      "cel",
      [true, true, false],
    ],
  ] as const)("a switched-off %s tier is false and the others stay true", (tier, expected) => {
    const h = motionHarness({
      cfg: { [tier]: false },
    });
    expect(["amb", "resp", "cel"].map(t => h.m.on(t as Tier))).toEqual(expected);
  });

  it("an explicitly true switch is on", () => {
    expect(motionHarness({
      cfg: { amb: true, resp: true, cel: true },
    }).m.on("resp")).toBe(true);
  });

  it("reads the config on every call", () => {
    const h = motionHarness();
    h.setCfg({ reduced: true });
    expect(h.m.on("resp")).toBe(false);
    h.setCfg({ reduced: false });
    expect(h.m.on("resp")).toBe(true);
  });

  it("is gated before watch() started and with stale tokens", () => {
    const h = motionHarness({ tokens: WORKSPACE });
    h.env.mediaMatches = true;
    expect(h.m.on("resp")).toBe(false);
  });

  it("stops Ambient and leaves the other two tiers when --ambient-motion was read as paused, until a refresh reads running", () => {
    const h = motionHarness();
    h.env.styleOf({ ...WORKSPACE, "--ambient-motion": "paused" });
    h.m.refresh(h.root);
    expect(["amb", "resp", "cel"].map(t => h.m.on(t as Tier))).toEqual([false, true, true]);
    h.env.styleOf({ ...WORKSPACE, "--ambient-motion": "running" });
    h.m.refresh(h.root);
    expect(["amb", "resp", "cel"].map(t => h.m.on(t as Tier))).toEqual([true, true, true]);
  });
});

describe("no recipe calls animate() when motion is reduced", () => {
  describe.each(REDUCED_STATES)("%s", (_label, reduce) => {
    it.each(RECIPES)("%s", async (_name, _tier, call) => {
      const h = motionHarness();
      reduce(h);
      expect(() => call(h, h.el())).not.toThrow();
      await vi.runAllTimersAsync();
      expect(h.log).toEqual([]);
      expect(h.layer.children).toHaveLength(0);
    });
  });

  it.each(NULLABLE)("%s with no element does nothing and throws nothing", async (_name, call) => {
    const h = motionHarness();
    expect(() => call(h, null)).not.toThrow();
    expect(() => call(h, undefined)).not.toThrow();
    await vi.runAllTimersAsync();
    expect(h.log).toEqual([]);
  });

  it("reduced motion from the Showcase dialect's token set is gated too", () => {
    const h = motionHarness({
      tokens: SHOWCASE,
      cfg: { reduced: true, dialect: "showcase" },
    });
    h.m.burst("cel", h.el(), { n: 48 });
    expect(h.layer.children).toHaveLength(0);
  });

  it("reduced motion zeroed tokens still create nothing", () => {
    const h = motionHarness({
      tokens: REDUCED,
      cfg: { reduced: true },
    });
    h.m.won(h.el(), h.el());
    expect(h.log).toEqual([]);
  });
});

describe("a switched-off tier creates no animation for its recipes", () => {
  it.each(["amb", "resp", "cel"] as const)("%s off", async (off) => {
    const rows = RECIPES.filter(r => r[1] === off);
    expect(rows.length).toBeGreaterThan(0);
    for (const [, , call] of rows) {
      const h = motionHarness({
        cfg: { [off]: false },
      });
      call(h, h.el());
      await vi.runAllTimersAsync();
      expect(h.log).toEqual([]);
    }
  });

  it.each(RECIPES.filter(r => r[1] === "amb"))("--ambient-motion: paused silences %s", async (_name, _tier, call) => {
    const h = motionHarness({
      tokens: { ...WORKSPACE, "--ambient-motion": "paused" },
    });
    call(h, h.el());
    await vi.runAllTimersAsync();
    expect(h.log).toEqual([]);
  });

  it("--ambient-motion: paused leaves a Responsive recipe playing", () => {
    const h = motionHarness({
      tokens: { ...WORKSPACE, "--ambient-motion": "paused" },
    });
    h.m.land(h.el());
    expect(h.log).toHaveLength(1);
  });
});

describe("what a gated recipe still does", () => {
  it.each([
    [
      "menuOut",
      (h: MotionHarness, e: FakeElement) => h.m.menuOut(e),
    ],
    [
      "modalOut",
      (h: MotionHarness, e: FakeElement) => h.m.modalOut(e, h.el()),
    ],
    [
      "toastOut",
      (h: MotionHarness, e: FakeElement) => h.m.toastOut(e),
    ],
    [
      "exitRow",
      (h: MotionHarness, e: FakeElement) => h.m.exitRow(e),
    ],
    [
      "stagOut",
      (h: MotionHarness, e: FakeElement) => h.m.stagOut([e]),
    ],
    [
      "pageOut",
      (h: MotionHarness, e: FakeElement) => h.m.pageOut(e, 1),
    ],
    [
      "bannerOut",
      (h: MotionHarness, e: FakeElement) => h.m.bannerOut(e),
    ],
    [
      "stampOut",
      (h: MotionHarness, e: FakeElement) => h.m.stampOut(e),
    ],
    [
      "pageFlipOut",
      (h: MotionHarness, e: FakeElement) => h.m.pageFlipOut([e]),
    ],
  ])("%s still resolves, so a caller can remove its element", async (_name, call) => {
    const h = motionHarness({
      cfg: { reduced: true },
    });
    let resolved = false;
    void Promise.resolve(call(h, h.el())).then(() => {
      resolved = true;
    });
    await vi.advanceTimersByTimeAsync(0);
    expect(resolved).toBe(true);
  });

  it("arc still calls after and clears the z-index", async () => {
    const h = motionHarness({
      cfg: { reduced: true },
    });
    const el = h.el();
    const after = vi.fn();
    expect(h.m.arc(el, 40, after)).toBeNull();
    expect(el.style.zIndex).toBe("15");
    await vi.advanceTimersByTimeAsync(0);
    expect(after).toHaveBeenCalledOnce();
    expect(el.style.zIndex).toBe("");
  });

  it("themeWipe calls swap() at once and adds no node", () => {
    const h = motionHarness({
      cfg: { reduced: true },
    });
    const layer = h.el();
    const swap = vi.fn();
    h.m.themeWipe(layer, 10, 10, "red", swap);
    expect(swap).toHaveBeenCalledOnce();
    expect(layer.children).toHaveLength(0);
  });

  it("themeWipe calls swap() when there is no layer", () => {
    const h = motionHarness();
    const swap = vi.fn();
    h.m.themeWipe(null, 10, 10, "red", swap);
    expect(swap).toHaveBeenCalledOnce();
  });
});

describe("wait and cue", () => {
  it("wait resolves after the given ms", async () => {
    const h = motionHarness();
    const done = vi.fn();
    void h.m.wait(500).then(done);
    await vi.advanceTimersByTimeAsync(499);
    expect(done).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(done).toHaveBeenCalledOnce();
  });

  it.each(REDUCED_STATES)("wait resolves after 0 ms when %s", async (_label, reduce) => {
    const h = motionHarness();
    reduce(h);
    const done = vi.fn();
    void h.m.wait(500).then(done);
    await vi.advanceTimersByTimeAsync(0);
    expect(done).toHaveBeenCalledOnce();
  });

  it("cue schedules no timer when no hook was given", () => {
    const h = motionHarness();
    h.m.cue("menu.open", "R04", 100);
    h.m.menuIn(h.el());
    expect(vi.getTimerCount()).toBe(0);
  });

  it("cue calls the hook after `at`", async () => {
    const h = motionHarness({ cue: true });
    h.m.cue("menu.open", "R04", 100);
    await vi.advanceTimersByTimeAsync(99);
    expect(h.cues).toEqual([]);
    await vi.advanceTimersByTimeAsync(1);
    expect(h.cues).toEqual([
      ["menu.open", "R04"],
    ]);
  });

  it("cue calls the hook at once with no `at`", async () => {
    const h = motionHarness({ cue: true });
    h.m.cue("a", "X");
    await vi.advanceTimersByTimeAsync(0);
    expect(h.cues).toEqual([
      ["a", "X"],
    ]);
  });

  it("cue calls the hook after 0 ms when reduced", async () => {
    const h = motionHarness({
      cue: true,
      cfg: { reduced: true },
    });
    h.m.cue("menu.open", "R04", 100);
    await vi.advanceTimersByTimeAsync(0);
    expect(h.cues).toEqual([
      ["menu.open", "R04"],
    ]);
  });
});

describe("watch and subscribe", () => {
  it("refreshes the tokens once when it starts", () => {
    const h = motionHarness();
    h.env.styleOf(SHOWCASE);
    h.m.watch();
    expect(h.m.T().C.gain).toBe(1.6);
  });

  it("a media-query change refreshes the tokens and tells subscribers", () => {
    const h = motionHarness();
    const seen = vi.fn();
    h.m.subscribe(seen);
    h.m.watch();
    h.env.styleOf(SHOWCASE);
    h.env.changeMedia(false);
    expect(h.m.T().C.particles).toBe(48);
    expect(seen).toHaveBeenCalledWith({ reduced: false });
  });

  it.each([
    ["data-theme", "dark"],
    ["data-dialect", "showcase"],
    ["data-motion", "no-preference"],
  ])("a change of %s refreshes the tokens and tells subscribers", (name, value) => {
    const h = motionHarness();
    const seen = vi.fn();
    h.m.subscribe(seen);
    h.m.watch();
    h.env.styleOf(SHOWCASE);
    h.env.setAttr(name, value);
    expect(h.m.T().C.gain).toBe(1.6);
    expect(seen).toHaveBeenCalledWith({ reduced: false });
  });

  it.each([
    [
      "the media query",
      (h: MotionHarness) => h.env.changeMedia(true),
    ],
    [
      "data-motion on <html>",
      (h: MotionHarness) => h.env.setAttr("data-motion", "reduce"),
    ],
  ])("a flip to reduced through %s cancels every loop at once and tells subscribers", (_label, flip) => {
    const h = motionHarness();
    const seen = vi.fn();
    h.m.subscribe(seen);
    h.m.watch();
    h.m.loop(h.el(), "breathe");
    h.m.loop(h.el(), "glow");
    flip(h);
    expect(h.log.map(c => c.animation.cancelled)).toEqual([true, true]);
    expect(seen).toHaveBeenLastCalledWith({ reduced: true });
  });

  it("a flip back refreshes and tells subscribers but starts no loop again", () => {
    const h = motionHarness();
    const seen = vi.fn();
    h.m.subscribe(seen);
    h.m.watch();
    h.m.loop(h.el(), "breathe");
    h.env.changeMedia(true);
    h.env.styleOf(SHOWCASE);
    h.env.changeMedia(false);
    expect(h.log).toHaveLength(1);
    expect(h.m.T().C.gain).toBe(1.6);
    expect(seen).toHaveBeenLastCalledWith({ reduced: false });
  });

  it("reads the reduce tokens when the flip happens", () => {
    const h = motionHarness();
    h.m.watch();
    h.env.styleOf(REDUCED);
    h.env.changeMedia(true);
    expect(h.m.T().D.base).toBe(0);
    expect(h.m.T().C.ambientPaused).toBe(true);
  });

  it("the stop function removes the media listener and the attribute observer", () => {
    const h = motionHarness();
    const stop = h.m.watch();
    expect([h.env.mediaListeners, h.env.attrObservers]).toEqual([1, 1]);
    stop();
    expect([h.env.mediaListeners, h.env.attrObservers]).toEqual([0, 0]);
  });

  it("after the stop function a change refreshes nothing", () => {
    const h = motionHarness();
    const seen = vi.fn();
    h.m.subscribe(seen);
    h.m.watch()();
    h.env.styleOf(SHOWCASE);
    h.env.changeMedia(true);
    h.env.setAttr("data-theme", "dark");
    expect(seen).not.toHaveBeenCalled();
    expect(h.m.T().C.gain).toBe(1);
  });

  it("an unsubscribed callback is not called again", () => {
    const h = motionHarness();
    const seen = vi.fn();
    const off = h.m.subscribe(seen);
    h.m.watch();
    h.env.changeMedia(false);
    off();
    h.env.changeMedia(false);
    expect(seen).toHaveBeenCalledOnce();
  });
});
