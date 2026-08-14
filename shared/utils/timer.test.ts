import { describe, expect, it } from "vitest";

const anyDate = new Date("2026-01-01T12:00:00Z");
const anyTime = anyDate.getTime();

describe("elapsedSeconds", () => {
  it("returns total time when stopped", () => {
    expect(elapsedSeconds({ accumulatedSeconds: 90, runningSince: null }, anyTime)).toBe(90);
  });

  it("adds the current winnie when running", () => {
    expect(elapsedSeconds(
      { accumulatedSeconds: 90, runningSince: anyDate },
      anyTime + 30000,
    )).toBe(120);
  });

  it("survives a six-hour closed tab", () => {
    expect(elapsedSeconds(
      { accumulatedSeconds: 0, runningSince: anyDate },
      anyTime + 6 * 3600000,
    )).toBe(21600);
  });

  it("never goes negative when the client clock is behind", () => {
    expect(elapsedSeconds(
      { accumulatedSeconds: 90, runningSince: anyDate },
      anyTime - 10000,
    )).toBe(90);
  });

  // Getting Test cases delivered by AI is really nice lol:
  it("accepts an ISO string because it arrives over JSON", () => {
    expect(elapsedSeconds(
      { accumulatedSeconds: 0, runningSince: anyDate.toISOString() },
      anyTime + 20000,
    )).toBe(20);
  });
});
