import { describe, expect, it } from "vitest";
import { tickFaults } from "./motion-play";

const INTERVAL = 250;

/** An animation as `tickFaults` reads it: a start time (null for one a Replay cancelled) and the end of its effect. */
function fake(start: number | null, end = 237.5): Animation {
  return {
    startTime: start,
    effect: {
      getComputedTiming: () => ({ endTime: end }),
    },
  } as unknown as Animation;
}

function slot(...animations: Animation[]) {
  return new Map([
    [
      3,
      new Set(animations),
    ],
  ]);
}

describe("tickFaults", () => {
  it("passes six ticks one beat apart", () => {
    const starts = [0, 250, 500, 750, 1000, 1250];
    expect(tickFaults(slot(...starts.map(s => fake(s))), INTERVAL)).toEqual([]);
  });

  it("passes the run that failed CI, two starts 216.627 ms apart", () => {
    expect(tickFaults(slot(fake(0), fake(216.627)), INTERVAL)).toEqual([]);
  });

  it("passes a gap three frames short, so it does not sag as load grows", () => {
    expect(tickFaults(slot(fake(0), fake(200)), INTERVAL)).toEqual([]);
  });

  it("flags two ticks that start together as one beat ticking twice", () => {
    const faults = tickFaults(slot(fake(100), fake(100)), INTERVAL);
    expect(faults).toHaveLength(1);
    expect(faults[0]).toContain("slot 3");
    expect(faults[0]).toContain("twice");
  });

  it("flags two ticks a frame apart", () => {
    expect(tickFaults(slot(fake(100), fake(116.7)), INTERVAL)).toHaveLength(1);
  });

  it("flags a tick that outlasts its beat, a delay of 75 ms counted outside the clamp", () => {
    const faults = tickFaults(slot(fake(0, 312.5), fake(250)), INTERVAL);
    expect(faults).toHaveLength(1);
    expect(faults[0]).toContain("slot 3");
  });

  it("skips a cancelled animation and checks the rest", () => {
    expect(tickFaults(slot(fake(null), fake(0)), INTERVAL)).toEqual([]);
    expect(tickFaults(slot(fake(null, 900), fake(0), fake(250)), INTERVAL)).toEqual([]);
  });

  it("passes no animation at all, and a slot with one", () => {
    expect(tickFaults(new Map(), INTERVAL)).toEqual([]);
    expect(tickFaults(slot(fake(0)), INTERVAL)).toEqual([]);
  });

  it("names the slot that has the fault when only one has", () => {
    const slots = new Map([
      [
        1,
        new Set([
          fake(0),
          fake(250),
        ]),
      ],
      [
        4,
        new Set([
          fake(100),
          fake(100),
        ]),
      ],
    ]);
    const faults = tickFaults(slots, INTERVAL);
    expect(faults).toHaveLength(1);
    expect(faults[0]).toContain("slot 4");
  });
});
