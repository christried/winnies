import type { FakeElement } from "../../../tests/support/fake-motion";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EASE, motionHarness, SHOWCASE } from "../../../tests/support/fake-motion";

beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(Math, "random").mockReturnValue(0.5);
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const NONE = { transform: "none" };

function jellyKf(a: number): Keyframe[] {
  return [
    { transform: "scale(1,1)" },
    { transform: `scale(${1 + 0.07 * a},${1 - 0.12 * a})`, offset: 0.18 },
    { transform: `scale(${1 - 0.06 * a},${1 + 0.08 * a})`, offset: 0.42 },
    { transform: `scale(${1 + 0.03 * a},${1 - 0.03 * a})`, offset: 0.68 },
    { transform: "scale(1,1)" },
  ];
}

describe("won", () => {
  it("jellies the middle, pops the face, and bursts 24 pieces from the face", () => {
    const h = motionHarness();
    const mid = h.el({
      rect: {
        left: 0,
        top: 0,
        width: 100,
        height: 100,
      },
    });
    const face = h.el({
      rect: {
        left: 200,
        top: 300,
        width: 40,
        height: 40,
      },
    });
    h.m.won(mid, face);
    expect(h.log[0]).toMatchObject({
      target: mid,
      keyframes: jellyKf(1),
      options: { duration: 700, easing: EASE.out },
    });
    expect(h.log[1]).toMatchObject({
      target: face,
      keyframes: [
        { transform: "scale(1)" },
        { transform: "scale(1.3)", offset: 0.3 },
        { transform: "scale(1)" },
      ],
      options: { duration: 700, easing: EASE.spring },
    });
    const ps = h.layer.children as unknown as FakeElement[];
    expect(ps).toHaveLength(24);
    expect(ps[0]?.style).toMatchObject({ left: "220px", top: "320px", fontSize: `${24 * (0.6 + 0.5 * 0.8)}px` });
  });

  it("bursts from the middle when there is no face", () => {
    const h = motionHarness();
    const mid = h.el({
      rect: {
        left: 0,
        top: 0,
        width: 100,
        height: 100,
      },
    });
    h.m.won(mid, null);
    expect(h.log[0]?.target).toBe(mid);
    expect(h.log.filter(c => c.target === mid)).toHaveLength(1);
    expect((h.layer.children as unknown as FakeElement[])[0]?.style).toMatchObject({ left: "50px", top: "50px" });
  });

  it("an Overlay jelly is 0.8 of the amplitude", () => {
    const h = motionHarness();
    h.m.won(h.el(), h.el(), true);
    expect(h.log[0]?.keyframes).toEqual(jellyKf(0.8 * 1));
    expect(h.layer.children).toHaveLength(24);
  });

  it("an Overlay under calm makes no burst; a page under calm still does", () => {
    const overlay = motionHarness({
      cfg: { calm: true },
    });
    overlay.m.won(overlay.el(), overlay.el(), true);
    expect(overlay.layer.children).toHaveLength(0);
    const page = motionHarness({
      cfg: { calm: true },
    });
    page.m.won(page.el(), page.el());
    expect(page.layer.children).toHaveLength(24);
  });

  it("follows the Showcase knobs: gain 1.6 in the jelly, 48 pieces", () => {
    const h = motionHarness({ tokens: SHOWCASE });
    h.m.won(h.el(), h.el());
    expect(h.log[0]?.keyframes).toEqual(jellyKf(1 * 1.6));
    expect(h.layer.children).toHaveLength(48);
  });

  it("cues won.yay (C01) after 18% of the jelly time", () => {
    const h = motionHarness({ cue: true });
    h.m.won(h.el(), h.el());
    vi.advanceTimersByTime(700 * 0.18 - 1);
    expect(h.cues).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(h.cues).toEqual([
      ["won.yay", "C01"],
    ]);
  });

  it("works without a face element at all", () => {
    const h = motionHarness();
    h.m.won(h.el(), undefined);
    expect(h.log.some(c => c.keyframes[1]?.transform === "scale(1.3)")).toBe(false);
  });
});

describe("the other celebratory recipes", () => {
  it("niniJump hops twice by default", () => {
    const h = motionHarness();
    const el = h.el();
    h.m.niniJump(el);
    expect(h.log.map(c => [c.target, c.keyframes, c.options])).toEqual([
      [
        el,
        [
          { transform: "translateY(0) scale(1,1)" },
          { transform: "translateY(0) scale(1.2,.8)", offset: 0.15 },
          { transform: `translateY(${-90}px) scale(.9,1.15) rotate(-10deg)`, offset: 0.45 },
          { transform: "translateY(0) scale(1.15,.85)", offset: 0.75 },
          NONE,
        ],
        { duration: 1100, easing: EASE["in-out"], iterations: 2 },
      ],
    ]);
  });

  it("niniJump takes n and follows the gain", () => {
    const h = motionHarness({ tokens: SHOWCASE });
    h.m.niniJump(h.el(), 5);
    expect(h.log[0]?.options.iterations).toBe(5);
    expect(h.log[0]?.keyframes[2]).toEqual({ transform: `translateY(${-90 * 1.6}px) scale(.9,1.15) rotate(-10deg)`, offset: 0.45 });
  });

  it.each([
    ["Workspace", undefined, -24],
    ["Showcase", SHOWCASE, -24 * 1.6],
  ])("niniHop (%s)", (_name, tokens, hop) => {
    const h = motionHarness({ tokens });
    h.m.niniHop(h.el());
    expect(h.log[0]?.keyframes).toEqual([
      NONE,
      { transform: `translateY(${hop}px) scale(.95,1.06)`, offset: 0.4 },
      { transform: "scale(1.06,.94)", offset: 0.75 },
      NONE,
    ]);
    expect(h.log[0]?.options).toEqual({ duration: 700, easing: EASE.out });
  });

  it("unfurl", () => {
    const h = motionHarness();
    h.m.unfurl(h.el());
    expect(h.log[0]?.keyframes).toEqual([
      { transform: "scaleY(0)", opacity: 0 },
      { transform: "scaleY(1)", opacity: 1, offset: 0.35 },
      { transform: "scaleY(1)", opacity: 1 },
    ]);
    expect(h.log[0]?.options).toEqual({ duration: 600 * 1.2, easing: EASE.bouncy });
  });

  it("flash", () => {
    const h = motionHarness();
    h.m.flash(h.el());
    expect(h.log[0]?.keyframes).toEqual([
      { filter: "brightness(1.35)" },
      { filter: "brightness(1)" },
    ]);
    expect(h.log[0]?.options).toEqual({ duration: 2400 * 0.5, easing: EASE.out });
  });

  it("bannerDrop", () => {
    const h = motionHarness();
    h.m.bannerDrop(h.el());
    expect(h.log[0]?.keyframes).toEqual([
      { transform: "translateY(-220px) rotate(-12deg)", opacity: 0 },
      { transform: "translateY(0) rotate(3deg)", opacity: 1, offset: 0.45 },
      { transform: "translateY(-14px) rotate(-1deg)", offset: 0.65 },
      NONE,
    ]);
    expect(h.log[0]?.options).toEqual({ duration: 600 * 1.5, easing: EASE.out });
  });

  it("bannerDrop under calm only fades", () => {
    const h = motionHarness({
      cfg: { calm: true },
    });
    h.m.bannerDrop(h.el());
    expect(h.log[0]?.keyframes).toEqual([
      { opacity: 0 },
      { opacity: 1 },
    ]);
    expect(h.log[0]?.options).toEqual({ duration: 240 });
  });

  it("all of them are Celebratory: switching the tier off silences them", () => {
    const h = motionHarness({
      cfg: { cel: false },
    });
    h.m.won(h.el(), h.el());
    h.m.niniJump(h.el());
    h.m.niniHop(h.el());
    h.m.unfurl(h.el());
    h.m.flash(h.el());
    h.m.bannerDrop(h.el());
    expect(h.log).toEqual([]);
    expect(h.layer.children).toHaveLength(0);
  });
});
