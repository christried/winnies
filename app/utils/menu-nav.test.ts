import { describe, expect, it } from "vitest";
import { fallbackPlacement, initialIndex, isTypeAheadKey, moveIndex, typeAheadIndex } from "./menu-nav";

describe("moveIndex", () => {
  const all = [true, true, true];

  it("goes down to the next item and wraps at the end", () => {
    expect(moveIndex(all, 0, "ArrowDown")).toBe(1);
    expect(moveIndex(all, 2, "ArrowDown")).toBe(0);
  });

  it("goes up to the previous item and wraps at the start", () => {
    expect(moveIndex(all, 2, "ArrowUp")).toBe(1);
    expect(moveIndex(all, 0, "ArrowUp")).toBe(2);
  });

  it("skips a disabled item both ways", () => {
    const middleOff = [true, false, true];
    expect(moveIndex(middleOff, 0, "ArrowDown")).toBe(2);
    expect(moveIndex(middleOff, 2, "ArrowUp")).toBe(0);
  });

  it("lands on the first enabled item going down and the last going up from no focus", () => {
    const edges = [false, true, true, false];
    expect(moveIndex(edges, -1, "ArrowDown")).toBe(1);
    expect(moveIndex(edges, -1, "ArrowUp")).toBe(2);
  });

  it("jumps to the first and last enabled item on Home and End, skipping a disabled first or last", () => {
    const edges = [false, true, true, false];
    expect(moveIndex(edges, 2, "Home")).toBe(1);
    expect(moveIndex(edges, 1, "End")).toBe(2);
    expect(moveIndex(all, 1, "Home")).toBe(0);
    expect(moveIndex(all, 1, "End")).toBe(2);
  });

  it("gives -1 when no item is enabled, there are no items, or the key moves nothing", () => {
    expect(moveIndex([false, false], 0, "ArrowDown")).toBe(-1);
    expect(moveIndex([false, false], -1, "End")).toBe(-1);
    expect(moveIndex([], -1, "ArrowDown")).toBe(-1);
    expect(moveIndex(all, 0, "ArrowLeft")).toBe(-1);
    expect(moveIndex(all, 0, "a")).toBe(-1);
  });

  it("stays on the only enabled item", () => {
    const one = [false, true, false];
    expect(moveIndex(one, 1, "ArrowDown")).toBe(1);
    expect(moveIndex(one, 1, "ArrowUp")).toBe(1);
  });
});

describe("typeAheadIndex", () => {
  const labels = [
    "Edit",
    "Add counter",
    "Pin",
    "Reset timer",
    "Duplicate",
    "Delete",
  ];
  const enabled = [true, true, true, false, true, true];

  it("matches the first letter without regard to case", () => {
    expect(typeAheadIndex(labels, enabled, 0, "p")).toBe(2);
    expect(typeAheadIndex(labels, enabled, 0, "P")).toBe(2);
  });

  it("starts after the focused item and cycles between two matches", () => {
    expect(typeAheadIndex(labels, enabled, 0, "d")).toBe(4);
    expect(typeAheadIndex(labels, enabled, 4, "d")).toBe(5);
    expect(typeAheadIndex(labels, enabled, 5, "d")).toBe(4);
  });

  it("stays on the focused item when it is the only match", () => {
    expect(typeAheadIndex(labels, enabled, 2, "p")).toBe(2);
  });

  it("starts at the top from no focus", () => {
    expect(typeAheadIndex(labels, enabled, -1, "e")).toBe(0);
  });

  it("skips a disabled match", () => {
    expect(typeAheadIndex(labels, enabled, 0, "r")).toBe(-1);
  });

  it("trims the label's leading spaces", () => {
    expect(typeAheadIndex(["  Alpha", "  Beta"], [true, true], 0, "b")).toBe(1);
  });

  it("gives -1 for no match and for no items", () => {
    expect(typeAheadIndex(labels, enabled, 0, "z")).toBe(-1);
    expect(typeAheadIndex([], [], -1, "a")).toBe(-1);
  });
});

describe("isTypeAheadKey", () => {
  const none = { ctrl: false, meta: false, alt: false };

  it("takes a letter and a digit", () => {
    expect(isTypeAheadKey("d", none)).toBe(true);
    expect(isTypeAheadKey("D", none)).toBe(true);
    expect(isTypeAheadKey("7", none)).toBe(true);
  });

  it("refuses Space, named keys and a chord", () => {
    expect(isTypeAheadKey(" ", none)).toBe(false);
    expect(isTypeAheadKey("Enter", none)).toBe(false);
    expect(isTypeAheadKey("ArrowDown", none)).toBe(false);
    expect(isTypeAheadKey("d", { ...none, ctrl: true })).toBe(false);
    expect(isTypeAheadKey("d", { ...none, meta: true })).toBe(false);
    expect(isTypeAheadKey("d", { ...none, alt: true })).toBe(false);
  });
});

describe("initialIndex", () => {
  it("prefers the current item over the first", () => {
    expect(initialIndex([true, true, true], [false, false, true])).toBe(2);
  });

  it("takes the first enabled item when none is current", () => {
    expect(initialIndex([false, true, true], [false, false, false])).toBe(1);
  });

  it("does not take a disabled current item", () => {
    expect(initialIndex([true, false, true], [false, true, false])).toBe(0);
  });

  it("gives -1 when no item is enabled", () => {
    expect(initialIndex([false, false], [true, false])).toBe(-1);
    expect(initialIndex([], [])).toBe(-1);
  });
});

describe("fallbackPlacement", () => {
  const size = { width: 260, height: 200 };
  const viewport = { width: 1000, height: 800 };
  const box = (left: number, top: number, width = 40, height = 40) => ({
    left,
    top,
    right: left + width,
    bottom: top + height,
  });

  it("puts the menu below the trigger with the right edge lined up for `end`", () => {
    expect(fallbackPlacement(box(600, 100), size, viewport, "end", 12)).toEqual({ top: 152, left: 380 });
  });

  it("lines up the left edge for `start`", () => {
    expect(fallbackPlacement(box(100, 100), size, viewport, "start", 12)).toEqual({ top: 152, left: 100 });
  });

  it("goes above the trigger when it does not fit below and does fit above", () => {
    expect(fallbackPlacement(box(100, 650), size, viewport, "start", 12)).toEqual({ top: 438, left: 100 });
  });

  it("stays below when it fits neither way", () => {
    const tall = { width: 260, height: 700 };
    expect(fallbackPlacement(box(100, 400), tall, viewport, "start", 12).top).toBe(452);
  });

  it("keeps the menu inside the viewport at both sides", () => {
    expect(fallbackPlacement(box(2, 100), size, viewport, "end", 12, 16).left).toBe(16);
    expect(fallbackPlacement(box(980, 100), size, viewport, "start", 12, 16).left).toBe(1000 - 260 - 16);
  });
});
