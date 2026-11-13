import { describe, expect, it } from "vitest";
import { EASE, motionHarness, REDUCED, WORKSPACE } from "../../../tests/support/fake-motion";

// The switch knob's slide (#316): `translateX(from%) → translateX(to%)` over `--dur-fast` with `--ease-spring`, the
// timing of the reference's `.w-switch::after { transition: left … }` moved onto `transform`. It has no moment ID in
// 04-motion-and-sound.md.

describe("switchSlide", () => {
  it("slides the knob from one share of its own width to another, over --dur-fast with --ease-spring", () => {
    const h = motionHarness();
    const knob = h.el();

    const animation = h.m.switchSlide(knob, 0, 90);

    expect(h.log).toHaveLength(1);
    expect(h.log[0]).toMatchObject({
      target: knob,
      keyframes: [
        { transform: "translateX(0%)" },
        { transform: "translateX(90%)" },
      ],
      options: { duration: 160, easing: EASE.spring },
    });
    expect(h.log[0]!.animation).toBe(animation);
  });

  it("slides back the other way", () => {
    const h = motionHarness();

    h.m.switchSlide(h.el(), 90, 0);

    expect(h.log[0]!.keyframes).toEqual([
      { transform: "translateX(90%)" },
      { transform: "translateX(0%)" },
    ]);
  });

  it("takes its duration from the tokens, so a dialect or a theme that changes --dur-fast moves it", () => {
    const h = motionHarness({
      tokens: { ...WORKSPACE, "--dur-fast": "200ms" },
    });

    h.m.switchSlide(h.el(), 0, 90);

    expect(h.log[0]!.options.duration).toBe(200);
  });

  it("creates nothing and returns null under reduced motion", () => {
    const h = motionHarness({
      cfg: { reduced: true },
    });

    expect(h.m.switchSlide(h.el(), 0, 90)).toBeNull();
    expect(h.log).toHaveLength(0);
  });

  it("creates nothing when the Responsive tier is switched off", () => {
    const h = motionHarness({
      cfg: { resp: false },
    });

    expect(h.m.switchSlide(h.el(), 0, 90)).toBeNull();
    expect(h.log).toHaveLength(0);
  });

  it("creates nothing under the reduced tokens", () => {
    const h = motionHarness({
      tokens: REDUCED,
      cfg: { reduced: true },
    });

    expect(h.m.switchSlide(h.el(), 0, 90)).toBeNull();
    expect(h.log).toHaveLength(0);
  });

  it("does nothing for an element that is not mounted yet", () => {
    const h = motionHarness();

    expect(h.m.switchSlide(null, 0, 90)).toBeNull();
    expect(h.m.switchSlide(undefined, 0, 90)).toBeNull();
    expect(h.log).toHaveLength(0);
  });
});
