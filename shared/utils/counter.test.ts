import { describe, expect, it } from "vitest";
import { isWonByCounter, nextCount } from "./counter";

describe("isWonByCounter", () => {
  it("never wins a challenge that has no counter", () => {
    const counterStatus = { count: 0, target: 0 };
    expect(isWonByCounter(counterStatus)).toBe(false);
  });

  it("wins as soon as the count reaches the target", () => {
    const counterStatus = { count: 3, target: 3 };
    expect(isWonByCounter(counterStatus)).toBe(true);
  });

  it("keeps winning status if above target", () => {
    const counterStatus = { count: 5, target: 1 };
    expect(isWonByCounter(counterStatus)).toBe(true);
  });

  it("stays unwon while the count is short of the target", () => {
    const counterStatus = { count: 5, target: 15 };
    expect(isWonByCounter(counterStatus)).toBe(false);
  });
});

describe("nextCount", () => {
  it("ignores an increment on a challenge with no counter", () => {
    const counterStatus = { count: 5, target: 0 };
    const delta = 1;
    expect(nextCount(counterStatus, delta)).toBe(5);
  });

  it("ignores a decrement on a challenge with no counter", () => {
    const counterStatus = { count: 5, target: 0 };
    const delta = -1;
    expect(nextCount(counterStatus, delta)).toBe(5);
  });

  it("never counts below zero", () => {
    const counterStatus = { count: 0, target: 10 };
    const delta = -1;
    expect(nextCount(counterStatus, delta)).toBe(0);
  });

  it("clamps back to the target when the count is already past it", () => {
    const counterStatus = { count: 5, target: 3 };
    const delta = 1;
    expect(nextCount(counterStatus, delta)).toBe(3);
  });

  it("counts one step up towards the target", () => {
    const counterStatus = { count: 1, target: 3 };
    const delta = 1;
    expect(nextCount(counterStatus, delta)).toBe(2);
  });

  it("counts one step back down", () => {
    const counterStatus = { count: 1, target: 3 };
    const delta = -1;
    expect(nextCount(counterStatus, delta)).toBe(0);
  });
});
