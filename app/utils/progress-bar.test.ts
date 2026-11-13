import { describe, expect, it } from "vitest";
import { clampedWon, progressPercent } from "./progress-bar";

describe("progressPercent", () => {
  // The numbers are the handoff's frames: 3 / 8 is 38 % (frames 04, 05), 8 / 8 is full (frame 10), 50 / 50 is the
  // Challenge limit (frame 09). 3 / 8 is 37.5, which rounds up: the same rounding the store uses today.
  it.each([
    [0, 0, 0],
    [0, 8, 0],
    [1, 50, 2],
    [3, 8, 38],
    [1, 3, 33],
    [2, 3, 67],
    [49, 50, 98],
    [1, 1, 100],
    [8, 8, 100],
    [50, 50, 100],
  ])("%i of %i is %i %%", (won, total, percent) => {
    expect(progressPercent(won, total)).toBe(percent);
  });

  it.each([
    [
      "a won count over the total stops at full",
      9,
      8,
      100,
    ],
    [
      "a negative won count is empty",
      -1,
      8,
      0,
    ],
    ["a negative total is empty", 3, -2, 0],
    [
      "a non-finite won count is empty",
      Number.NaN,
      8,
      0,
    ],
  ])("%s", (_name, won, total, percent) => {
    expect(progressPercent(won, total)).toBe(percent);
  });
});

describe("clampedWon", () => {
  it.each([
    [3, 8, 3],
    [0, 8, 0],
    [8, 8, 8],
    [9, 8, 8],
    [-1, 8, 0],
    [3, -2, 0],
    [3, 0, 0],
    [Number.NaN, 8, 0],
    [Number.POSITIVE_INFINITY, 8, 0],
    [2.6, 8, 2],
  ])("%d of %d counts as %d", (won, total, counted) => {
    expect(clampedWon(won, total)).toBe(counted);
  });
});

// The bar plays R29 only when the percent moves (`progress-bar.vue` compares these two numbers), so the cases the
// stories cannot show cheaply are fixed here.
describe("progressPercent between two states of a bar", () => {
  it("a win on 3 of 10 moves the fill from 30 to 40", () => {
    expect([
      progressPercent(3, 10),
      progressPercent(4, 10),
    ]).toEqual([30, 40]);
  });

  it("4 of 8 and 5 of 10 are the same percent, so there is nothing to move", () => {
    expect(progressPercent(4, 8)).toBe(50);
    expect(progressPercent(5, 10)).toBe(50);
  });

  it("a total that grows alone changes the percent: 3 of 8 is 38, 3 of 9 is 33", () => {
    expect([
      progressPercent(3, 8),
      progressPercent(3, 9),
    ]).toEqual([38, 33]);
  });
});
