import type { FakeElement } from "../../../tests/support/fake-motion";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BROADCAST, EASE, fakeRect, motionHarness, SHOWCASE } from "../../../tests/support/fake-motion";

const CONF = [
  "var(--confetti-1)",
  "var(--confetti-2)",
  "var(--confetti-3)",
  "var(--confetti-4)",
  "var(--confetti-5)",
];

let random: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  random = vi.spyOn(Math, "random").mockReturnValue(0.5);
});
afterEach(() => {
  vi.restoreAllMocks();
});

// The element bursts start from: its centre is at (120, 60) in the layer.
function source(h: ReturnType<typeof motionHarness>) {
  return h.el({
    rect: {
      left: 100,
      top: 50,
      width: 40,
      height: 20,
    },
  });
}

const particles = (h: ReturnType<typeof motionHarness>) => h.layer.children as unknown as FakeElement[];

describe("burst", () => {
  it("makes `--particle-count` particles by default, one per knob set", () => {
    for (const [tokens, count] of [
      [undefined, 24],
      [BROADCAST, 28],
      [SHOWCASE, 48],
    ] as const) {
      const h = motionHarness({ tokens });
      h.m.burst("resp", source(h));
      expect(h.layer.children).toHaveLength(count);
    }
  });

  it("an explicit n ignores the particle count", () => {
    const h = motionHarness({ tokens: SHOWCASE });
    h.m.burst("resp", source(h), { n: 5 });
    expect(h.layer.children).toHaveLength(5);
  });

  it("an explicit n above the count is not capped", () => {
    const h = motionHarness();
    h.m.burst("resp", source(h), { n: 200 });
    expect(h.layer.children).toHaveLength(200);
  });

  it("k scales the default count and rounds it", () => {
    const h = motionHarness();
    h.m.burst("resp", source(h), { k: 0.5 });
    expect(h.layer.children).toHaveLength(12);
    h.m.burst("resp", source(h), { n: 5, k: 0.5 });
    expect(h.layer.children).toHaveLength(12 + Math.round(5 * 0.5));
  });

  it.each([
    [
      "n is 0",
      { n: 0 },
    ],
    [
      "n is negative",
      { n: -3 },
    ],
    [
      "k is 0",
      { k: 0 },
    ],
  ])("does nothing when %s", (_label, opt) => {
    const h = motionHarness();
    h.m.burst("resp", source(h), opt);
    expect(h.layer.children).toHaveLength(0);
  });

  it("does nothing when the Calm preset's particle count is 0", () => {
    const h = motionHarness({
      tokens: { "--particle-count": "0" },
    });
    h.m.burst("resp", source(h));
    expect(h.layer.children).toHaveLength(0);
  });

  it("does nothing without an element", () => {
    const h = motionHarness();
    h.m.burst("resp", null);
    h.m.burst("resp", undefined);
    expect(h.layer.children).toHaveLength(0);
  });

  it("starts each particle at the element's centre, in the layer's own coordinates", () => {
    const h = motionHarness();
    h.m.burst("resp", source(h), {
      n: 1,
      shapes: ["circle"],
    });
    expect(particles(h)[0]?.style).toMatchObject({
      position: "absolute",
      left: "120px",
      top: "60px",
      width: "22px",
      height: "22px",
      pointerEvents: "none",
    });
  });

  it("honours ox and oy", () => {
    const h = motionHarness();
    h.m.burst("resp", source(h), { n: 1, ox: 0.1, oy: 0 });
    expect(particles(h)[0]?.style).toMatchObject({ left: `${100 + 40 * 0.1}px`, top: "50px" });
  });

  it("divides by the layer's scale", () => {
    const h = motionHarness();
    h.layer.getBoundingClientRect = () => fakeRect(10, 20, 500, 400);
    h.m.burst("resp", source(h), { n: 1 });
    expect(particles(h)[0]?.style).toMatchObject({ left: `${(100 + 20 - 10) / (500 / 1000)}px`, top: `${(50 + 10 - 20) / (500 / 1000)}px` });
  });

  it("cycles the default shapes and the five confetti colours", () => {
    const h = motionHarness();
    h.m.burst("resp", source(h), { n: 10 });
    const looks = particles(h).map(p => [
      p.textContent,
      p.style.borderRadius,
      p.style.color,
      p.style.background,
    ]);
    expect(looks).toEqual([
      ["♥", undefined, CONF[0], undefined],
      ["★", undefined, CONF[1], undefined],
      ["", "50%", undefined, CONF[2]],
      ["✿", undefined, CONF[3], undefined],
      ["♥", undefined, CONF[4], undefined],
      ["★", undefined, CONF[0], undefined],
      ["", "50%", undefined, CONF[1]],
      ["✿", undefined, CONF[2], undefined],
      ["♥", undefined, CONF[3], undefined],
      ["★", undefined, CONF[4], undefined],
    ]);
  });

  it("the default colours are exactly var(--confetti-1) to var(--confetti-5)", () => {
    const h = motionHarness();
    h.m.burst("resp", source(h), {
      n: 5,
      shapes: ["circle"],
    });
    expect(particles(h).map(p => p.style.background)).toEqual([
      "var(--confetti-1)",
      "var(--confetti-2)",
      "var(--confetti-3)",
      "var(--confetti-4)",
      "var(--confetti-5)",
    ]);
  });

  it("cycles supplied shapes and colours by i % length, and draws a spark as a clipped shape", () => {
    const h = motionHarness();
    h.m.burst("resp", source(h), {
      n: 5,
      shapes: ["spark", "circle"],
      colors: ["var(--a)", "var(--b)", "var(--c)"],
    });
    expect(particles(h).map(p => [p.style.clipPath !== undefined, p.style.borderRadius === "50%", p.style.background])).toEqual([
      [true, false, "var(--a)"],
      [false, true, "var(--b)"],
      [true, false, "var(--c)"],
      [false, true, "var(--a)"],
      [true, false, "var(--b)"],
    ]);
  });

  it("a text shape carries its glyph and sets the font", () => {
    const h = motionHarness();
    h.m.burst("resp", source(h), {
      n: 1,
      shapes: ["text:🍓"],
      size: 10,
    });
    const p = particles(h)[0];
    expect(p?.textContent).toBe("🍓");
    expect(p?.style).toMatchObject({
      fontSize: "10px",
      fontFamily: "'M PLUS Rounded 1c'",
      fontWeight: 800,
      width: "auto",
      height: "auto",
    });
  });

  it("flies up at random 0.5 with the reference's keyframes and options", () => {
    const h = motionHarness();
    h.m.burst("resp", source(h), { n: 1 });
    const dist = 220 * 1 ** 0.5 * (0.35 + 0.5 * 0.65);
    const dx = Math.cos(-Math.PI / 2) * dist;
    const dy = Math.sin(-Math.PI / 2) * dist;
    const r = (0.5 - 0.5) * 240;
    expect(h.log).toHaveLength(1);
    expect(h.log[0]?.target).toBe(particles(h)[0]);
    expect(h.log[0]?.keyframes).toEqual([
      { transform: "translate(-50%,-50%) scale(.2) rotate(0deg)", opacity: 1 },
      { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(1) rotate(${r}deg)`, opacity: 1, offset: 0.55 },
      { transform: `translate(calc(-50% + ${dx * 1.15}px), calc(-50% + ${dy + 80}px)) scale(.7) rotate(${r * 1.4}deg)`, opacity: 0 },
    ]);
    expect(h.log[0]?.options).toEqual({ duration: 1300 * (0.75 + 0.5 * 0.5), easing: EASE.out, delay: 0.5 * 60 });
  });

  it("scales the distance by the square root of the gain", () => {
    const h = motionHarness({ tokens: SHOWCASE });
    h.m.burst("resp", source(h), { n: 1 });
    const dist = 220 * 1.6 ** 0.5 * (0.35 + 0.5 * 0.65);
    expect(h.log[0]?.keyframes[1]?.transform).toBe(`translate(calc(-50% + ${Math.cos(-Math.PI / 2) * dist}px), calc(-50% + ${Math.sin(-Math.PI / 2) * dist}px)) scale(1) rotate(0deg)`);
  });

  it("sends particles in every direction with up: false", () => {
    const h = motionHarness();
    h.m.burst("resp", source(h), { n: 1, up: false });
    const ang = 0.5 * Math.PI * 2;
    const dist = 220 * 1 ** 0.5 * (0.35 + 0.5 * 0.65);
    expect(h.log[0]?.keyframes[1]?.transform).toBe(`translate(calc(-50% + ${Math.cos(ang) * dist}px), calc(-50% + ${Math.sin(ang) * dist}px)) scale(1) rotate(0deg)`);
  });

  it("takes every override: angle, cone, spread, spin, gravity, dur, stagger and size", () => {
    const h = motionHarness();
    h.m.burst("resp", source(h), {
      n: 1,
      shapes: ["circle"],
      angle: 1,
      cone: 4,
      spread: 100,
      spin: 100,
      gravity: -20,
      dur: 500,
      stagger: 200,
      size: 10,
    });
    const ang = 1 + (0.5 - 0.5) * 4;
    const dist = 100 * 1 ** 0.5 * (0.35 + 0.5 * 0.65);
    const dx = Math.cos(ang) * dist;
    const dy = Math.sin(ang) * dist;
    const r = (0.5 - 0.5) * 100;
    expect(particles(h)[0]?.style).toMatchObject({ width: `${10 * (0.6 + 0.5 * 0.8)}px` });
    expect(h.log[0]?.keyframes[2]).toEqual({ transform: `translate(calc(-50% + ${dx * 1.15}px), calc(-50% + ${dy + -20}px)) scale(.7) rotate(${r * 1.4}deg)`, opacity: 0 });
    expect(h.log[0]?.options).toEqual({ duration: 500 * (0.75 + 0.5 * 0.5), easing: EASE.out, delay: 0.5 * 200 });
  });

  it("gravity 0 is kept, not replaced by the default", () => {
    const h = motionHarness();
    h.m.burst("resp", source(h), { n: 1, gravity: 0 });
    const dy = Math.sin(-Math.PI / 2) * (220 * 1 ** 0.5 * (0.35 + 0.5 * 0.65));
    expect(h.log[0]?.keyframes[2]?.transform).toContain(`calc(-50% + ${dy + 0}px)`);
  });

  it("uses Broadcast's shorter --dur-burst", () => {
    const h = motionHarness({ tokens: BROADCAST });
    h.m.burst("resp", source(h), { n: 1 });
    expect(h.log[0]?.options.duration).toBe(1000 * (0.75 + 0.5 * 0.5));
  });

  it("at random 0 every factor sits at the bottom of its range", () => {
    random.mockReturnValue(0);
    const h = motionHarness();
    h.m.burst("resp", source(h), {
      n: 1,
      shapes: ["circle"],
    });
    const ang = -Math.PI / 2 + (0 - 0.5) * 2;
    const dist = 220 * 1 ** 0.5 * 0.35;
    const r = (0 - 0.5) * 240;
    expect(particles(h)[0]?.style.width).toBe(`${22 * 0.6}px`);
    expect(h.log[0]?.keyframes[1]?.transform).toBe(`translate(calc(-50% + ${Math.cos(ang) * dist}px), calc(-50% + ${Math.sin(ang) * dist}px)) scale(1) rotate(${r}deg)`);
    expect(h.log[0]?.options).toEqual({ duration: 1300 * 0.75, easing: EASE.out, delay: 0 });
  });

  it("at random 1 every factor sits at the top of its range", () => {
    random.mockReturnValue(1);
    const h = motionHarness();
    h.m.burst("resp", source(h), {
      n: 1,
      shapes: ["circle"],
    });
    const ang = -Math.PI / 2 + (1 - 0.5) * 2;
    const dist = 220 * 1 ** 0.5 * (0.35 + 0.65);
    const r = (1 - 0.5) * 240;
    expect(particles(h)[0]?.style.width).toBe(`${22 * (0.6 + 0.8)}px`);
    expect(h.log[0]?.keyframes[1]?.transform).toBe(`translate(calc(-50% + ${Math.cos(ang) * dist}px), calc(-50% + ${Math.sin(ang) * dist}px)) scale(1) rotate(${r}deg)`);
    expect(h.log[0]?.options).toEqual({ duration: 1300 * 1.25, easing: EASE.out, delay: 60 });
  });

  it("each particle leaves the layer after it finishes", () => {
    const h = motionHarness();
    h.m.burst("resp", source(h), { n: 3 });
    h.log[1]?.animation.finish();
    expect(h.layer.children).toHaveLength(2);
    expect(particles(h)).not.toContain(h.log[1]?.target);
    h.log[0]?.animation.finish();
    h.log[2]?.animation.finish();
    expect(h.layer.children).toHaveLength(0);
  });
});

describe("rain", () => {
  it("makes twice the particle count by default", () => {
    const h = motionHarness({ tokens: SHOWCASE });
    h.m.rain("cel");
    expect(h.layer.children).toHaveLength(96);
  });

  it("takes n and k", () => {
    const h = motionHarness();
    h.m.rain("cel", { n: 10, k: 0.5 });
    expect(h.layer.children).toHaveLength(5);
  });

  it("starts each piece 40 px above the layer at a random x, and cycles shapes and colours", () => {
    const h = motionHarness();
    h.m.rain("cel", { n: 5 });
    expect(particles(h).map(p => [p.style.left, p.style.top, p.textContent])).toEqual([
      ["500px", "-40px", "♥"],
      ["500px", "-40px", "★"],
      ["500px", "-40px", ""],
      ["500px", "-40px", "✿"],
      ["500px", "-40px", "♥"],
    ]);
    expect(particles(h).map(p => p.style.color ?? p.style.background)).toEqual(CONF);
  });

  it("sways and falls by the layer's width and height", () => {
    const h = motionHarness({ width: 1000, height: 800 });
    h.m.rain("cel", { n: 1 });
    const sway = (0.5 - 0.5) * 160;
    const r = (0.5 - 0.5) * 720;
    expect(h.log[0]?.keyframes).toEqual([
      { transform: "translate(-50%,0) rotate(0deg)", opacity: 1 },
      { transform: `translate(calc(-50% + ${sway}px), ${800 * 0.55}px) rotate(${r * 0.5}deg)`, opacity: 1, offset: 0.6 },
      { transform: `translate(calc(-50% + ${-sway * 0.4}px), ${800 + 60}px) rotate(${r}deg)`, opacity: 0.2 },
    ]);
    expect(h.log[0]?.options).toEqual({ duration: 2400 * 1.4 * (0.7 + 0.5 * 0.6), easing: "cubic-bezier(.3,.2,.6,1)", delay: 0.5 * 900 });
  });

  it("takes dur, spread and size", () => {
    const h = motionHarness();
    h.m.rain("cel", {
      n: 1,
      dur: 1000,
      spread: 100,
      size: 10,
    });
    expect(h.log[0]?.options).toEqual({ duration: 1000 * (0.7 + 0.5 * 0.6), easing: "cubic-bezier(.3,.2,.6,1)", delay: 0.5 * 100 });
    expect(particles(h)[0]?.style.fontSize).toBe(`${10 * (0.6 + 0.5 * 0.8)}px`);
  });

  it("each piece leaves the layer after it finishes", () => {
    const h = motionHarness();
    h.m.rain("cel", { n: 2 });
    h.log.forEach(c => c.animation.finish());
    expect(h.layer.children).toHaveLength(0);
  });
});
