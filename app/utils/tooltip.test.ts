import { afterEach, describe, expect, it, vi } from "vitest";
import { anchorPositioningSupported, joinAnchorNames, tooltipPlacement } from "./tooltip";

// The bubble is placed with `position-area`: the check asks for that property, not for `anchor-name`, which Chromium shipped
// before it (as `inset-area`) and which would put a browser in between on the anchored branch with nowhere to go.
describe("anchorPositioningSupported", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("is false where only `anchor-name` is known", () => {
    vi.stubGlobal("CSS", {
      supports: (property: string) => property === "anchor-name",
    });
    expect(anchorPositioningSupported()).toBe(false);
  });

  it("is true where `position-area` is known", () => {
    vi.stubGlobal("CSS", {
      supports: (property: string) => property === "position-area",
    });
    expect(anchorPositioningSupported()).toBe(true);
  });
});

describe("joinAnchorNames", () => {
  it("gives the own name alone when the caller has no style", () => {
    expect(joinAnchorNames(undefined, "--tip-a")).toEqual({ "anchor-name": "--tip-a" });
  });

  it("appends the own name to the list of a string style and keeps the other properties", () => {
    expect(joinAnchorNames("anchor-name: --a; color: red", "--own")).toEqual({
      "anchor-name": "--a, --own",
      "color": "red",
    });
  });

  it("folds a camelCase and a dashed key of an object into one", () => {
    expect(joinAnchorNames({ anchorName: "--a" }, "--own")).toEqual({ "anchor-name": "--a, --own" });
    expect(joinAnchorNames({ "anchor-name": "--a", "color": "red" }, "--own")).toEqual({
      "anchor-name": "--a, --own",
      "color": "red",
    });
  });

  it("merges an array of styles", () => {
    expect(joinAnchorNames([
      "anchor-name: --a",
      { color: "red" },
    ], "--own")).toEqual({
      "anchor-name": "--a, --own",
      "color": "red",
    });
  });

  it("does not add the own name twice", () => {
    expect(joinAnchorNames("anchor-name: --a, --own", "--own")).toEqual({ "anchor-name": "--a, --own" });
  });
});

describe("tooltipPlacement", () => {
  const viewport = { width: 1440, height: 900 };
  const bubble = { width: 100, height: 30 };

  it("centres the bubble above the trigger with a 10px gap", () => {
    const trigger = {
      left: 600,
      top: 400,
      width: 52,
      height: 52,
    };
    expect(tooltipPlacement(trigger, bubble, viewport)).toEqual({ left: 626 - 50, top: 400 - 10 - 30, below: false });
  });

  it("stays above when exactly 8px are left above, and goes below one pixel earlier", () => {
    const exact = {
      left: 600,
      top: 8 + 10 + 30,
      width: 52,
      height: 52,
    };
    expect(tooltipPlacement(exact, bubble, viewport)).toMatchObject({ top: 8, below: false });
    const short = { ...exact, top: exact.top - 1 };
    expect(tooltipPlacement(short, bubble, viewport)).toEqual({
      left: 576,
      top: short.top + short.height + 10,
      below: true,
    });
  });

  it("clamps a trigger at the left edge to the 8px margin", () => {
    const trigger = {
      left: 0,
      top: 400,
      width: 52,
      height: 52,
    };
    expect(tooltipPlacement(trigger, bubble, viewport).left).toBe(8);
  });

  it("clamps a trigger at the right edge to the viewport less the margin", () => {
    const trigger = {
      left: 1440 - 52,
      top: 400,
      width: 52,
      height: 52,
    };
    expect(tooltipPlacement(trigger, bubble, viewport).left).toBe(1440 - 8 - 100);
  });

  it("puts a bubble wider than the viewport less both margins at the left margin", () => {
    const wide = { width: 1440 - 16 + 1, height: 30 };
    const trigger = {
      left: 700,
      top: 400,
      width: 52,
      height: 52,
    };
    expect(tooltipPlacement(trigger, wide, viewport).left).toBe(8);
  });

  it("picks above when there is room neither above nor below", () => {
    const tall = { width: 100, height: 600 };
    const trigger = {
      left: 600,
      top: 300,
      width: 52,
      height: 300,
    };
    expect(tooltipPlacement(trigger, tall, viewport)).toMatchObject({ top: 300 - 10 - 600, below: false });
  });
});
