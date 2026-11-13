import { describe, expect, it } from "vitest";
import { nextFocusIndex } from "./focus-trap";

describe("nextFocusIndex", () => {
  it("has nowhere to go when the modal has no tabbable element", () => {
    expect(nextFocusIndex(0, -1, false)).toBe(-1);
    expect(nextFocusIndex(0, -1, true)).toBe(-1);
  });

  // The active element is the dialog itself or <body> (-1): Tab enters at the start, Shift+Tab at the end.
  it("enters at the first stop on Tab and at the last on Shift+Tab when the focus is on no stop", () => {
    expect(nextFocusIndex(3, -1, false)).toBe(0);
    expect(nextFocusIndex(3, -1, true)).toBe(2);
  });

  it("stays on the only stop both ways", () => {
    expect(nextFocusIndex(1, 0, false)).toBe(0);
    expect(nextFocusIndex(1, 0, true)).toBe(0);
  });

  it.each([
    [0, 1],
    [1, 2],
    [2, 0],
  ])("tab from stop %i of 3 goes to %i, wrapping at the end", (from, to) => {
    expect(nextFocusIndex(3, from, false)).toBe(to);
  });

  it.each([
    [0, 2],
    [1, 0],
    [2, 1],
  ])("shift+Tab from stop %i of 3 goes to %i, wrapping at the start", (from, to) => {
    expect(nextFocusIndex(3, from, true)).toBe(to);
  });
});
