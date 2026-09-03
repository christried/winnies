import { describe, expect, it } from "vitest";
import { formatDuration } from "./timer";

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

describe("formatDuration", () => {
  it("pads minutes and seconds below an hour", () => {
    expect(formatDuration(65)).toBe("01:05");
  });

  it("adds the hours segment past an hour", () => {
    expect(formatDuration(3725)).toBe("1:02:05");
  });

  it("floors fractional seconds and never goes negative", () => {
    expect(formatDuration(9.9)).toBe("00:09");
    expect(formatDuration(-5)).toBe("00:00");
  });
});
