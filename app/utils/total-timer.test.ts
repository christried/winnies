import { describe, expect, it } from "vitest";
import { changedTimerSlots, formatTimerText, timerSlots, timerSpokenValue, timerTickBeat, timerTickKind } from "./total-timer";

// A Challenge Timer's `H:MM:SS` is always three parts, so a row never changes width mid-run: `formatDuration` would
// give `52:40` here (handoff 02-tokens.md, 08 A8).
describe("formatTimerText", () => {
  it("writes a started Challenge Timer with its hours part, always", () => {
    expect(formatTimerText(52 * 60 + 40, "row", false)).toBe("0:52:40");
    expect(formatTimerText(0, "row", false)).toBe("0:00:00");
    expect(formatTimerText(3 * 3600 + 12 * 60 + 36, "row", false)).toBe("3:12:36");
  });

  it("writes an untouched Challenge Timer as 00:00, whatever the seconds say", () => {
    expect(formatTimerText(0, "row", true)).toBe("00:00");
    expect(formatTimerText(5, "row", true)).toBe("00:00");
  });

  it.each(["workspace", "overlay"] as const)("writes a %s Total Timer as MM:SS under an hour and H:MM:SS from one", (variant) => {
    expect(formatTimerText(0, variant, false)).toBe("00:00");
    expect(formatTimerText(59, variant, false)).toBe("00:59");
    expect(formatTimerText(3599, variant, false)).toBe("59:59");
    expect(formatTimerText(3600, variant, false)).toBe("1:00:00");
    expect(formatTimerText(14 * 3600 + 32 * 60 + 7, variant, false)).toBe("14:32:07");
    expect(formatTimerText(359_999, variant, false)).toBe("99:59:59");
    expect(formatTimerText(360_000, variant, false)).toBe("100:00:00");
  });

  it("floors a fraction and reads a negative or non-finite value as 0", () => {
    expect(formatTimerText(1.9, "workspace", false)).toBe("00:01");
    expect(formatTimerText(-5, "workspace", false)).toBe("00:00");
    expect(formatTimerText(Number.NaN, "workspace", false)).toBe("00:00");
    expect(formatTimerText(1.9, "row", false)).toBe("0:00:01");
    expect(formatTimerText(-5, "row", false)).toBe("0:00:00");
    expect(formatTimerText(Number.NaN, "row", false)).toBe("0:00:00");
  });

  it("ignores untouched outside a row, whose Total Timer has no such state", () => {
    expect(formatTimerText(65, "workspace", true)).toBe("01:05");
  });
});

describe("timerSlots", () => {
  it("gives a slot per character, counted from the right, with the colons marked", () => {
    const slots = timerSlots("14:32:07");
    expect(slots).toHaveLength(8);
    expect(slots.map(s => s.char).join("")).toBe("14:32:07");
    expect(slots.map(s => s.pos)).toEqual([7, 6, 5, 4, 3, 2, 1, 0]);
    expect(slots.filter(s => s.sep).map(s => s.pos)).toEqual([5, 2]);
  });

  it("gives 00:00 five slots", () => {
    const slots = timerSlots("00:00");
    expect(slots).toHaveLength(5);
    expect(slots.map(s => s.pos)).toEqual([4, 3, 2, 1, 0]);
    expect(slots.filter(s => s.sep).map(s => s.pos)).toEqual([2]);
  });
});

describe("changedTimerSlots", () => {
  it("never reports the first render", () => {
    expect(changedTimerSlots(null, "14:32:07")).toEqual([]);
  });

  it("reports only the digits that changed, ascending", () => {
    expect(changedTimerSlots("14:32:07", "14:32:08")).toEqual([0]);
    expect(changedTimerSlots("14:32:07", "14:32:10")).toEqual([0, 1]);
    expect(changedTimerSlots("05:59", "06:00")).toEqual([0, 1, 3]);
  });

  it("reports a slot that did not exist before, and never a colon", () => {
    expect(changedTimerSlots("59:59", "1:00:00")).toEqual([0, 1, 3, 4, 6]);
  });

  it("reports nothing for an equal text", () => {
    expect(changedTimerSlots("14:32:07", "14:32:07")).toEqual([]);
  });

  it("stays well formed when the text gets shorter", () => {
    expect(changedTimerSlots("14:32:07", "00:00")).toEqual([0, 3, 4]);
  });
});

describe("timerTickBeat", () => {
  it("is sec when only the seconds changed", () => {
    expect(timerTickBeat([0])).toBe("sec");
    expect(timerTickBeat([0, 1])).toBe("sec");
  });

  it("is min when a minutes digit changed", () => {
    expect(timerTickBeat([0, 1, 3])).toBe("min");
    expect(timerTickBeat([4])).toBe("min");
  });

  it("is hour when an hours digit changed, including one that just appeared", () => {
    expect(timerTickBeat([0, 1, 3, 4, 6])).toBe("hour");
    expect(timerTickBeat([6])).toBe("hour");
  });

  it("is null when nothing changed", () => {
    expect(timerTickBeat([])).toBeNull();
  });
});

describe("timerTickKind", () => {
  it("maps the variants to the engine's kinds", () => {
    expect(timerTickKind("workspace", false)).toBe("total");
    expect(timerTickKind("overlay", false)).toBe("ov-total");
    expect(timerTickKind("row", false)).toBe("row");
  });

  it("takes a row in the Overlay to T06 and changes nothing else", () => {
    expect(timerTickKind("row", true)).toBe("ov-row");
    expect(timerTickKind("workspace", true)).toBe("total");
    expect(timerTickKind("overlay", true)).toBe("ov-total");
  });
});

describe("timerSpokenValue", () => {
  it("names hours and minutes, never seconds, then the state", () => {
    expect(timerSpokenValue(14 * 3600 + 32 * 60 + 7, "running", "workspace")).toBe("14 hours 32 minutes, running");
    expect(timerSpokenValue(0, "paused", "workspace")).toBe("0 minutes, paused");
    expect(timerSpokenValue(59, "paused", "workspace")).toBe("0 minutes, paused");
    expect(timerSpokenValue(60, "paused", "workspace")).toBe("1 minute, paused");
    expect(timerSpokenValue(32 * 60, "paused", "workspace")).toBe("32 minutes, paused");
    expect(timerSpokenValue(3600, "paused", "workspace")).toBe("1 hour 0 minutes, paused");
  });

  it("says the same for 3600 s and 3659 s, so a reader is not told every second", () => {
    expect(timerSpokenValue(3659, "running", "overlay")).toBe(timerSpokenValue(3600, "running", "overlay"));
  });

  it("says each state by its word", () => {
    expect(timerSpokenValue(0, "untouched", "row")).toBe("0 minutes, not started");
    expect(timerSpokenValue(0, "paused", "row")).toBe("0 minutes, paused");
    expect(timerSpokenValue(0, "running", "row")).toBe("0 minutes, running");
    expect(timerSpokenValue(0, "complete", "workspace")).toBe("0 minutes, complete");
  });

  it("calls a complete row won", () => {
    expect(timerSpokenValue(52 * 60, "complete", "row")).toBe("52 minutes, won");
  });

  it("reads a negative or non-finite value as 0", () => {
    expect(timerSpokenValue(-1, "paused", "row")).toBe("0 minutes, paused");
    expect(timerSpokenValue(Number.NaN, "paused", "row")).toBe("0 minutes, paused");
  });
});
