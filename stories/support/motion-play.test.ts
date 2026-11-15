import { afterEach, describe, expect, it, vi } from "vitest";
import { browserPrefersReduced, fullMotionBlocker, isLoop, isRunningLoop, tickFaults, withMotion } from "./motion-play";

// The instrumenter talks to a Storybook preview, and node has none: the skip is watched through this stand-in, which
// keeps the shape the helper relies on (`instrument(obj).skipped(reason)` runs `obj.skipped`).
const skipped = vi.hoisted(() => vi.fn());
vi.mock("storybook/internal/instrumenter", () => ({
  instrument: (obj: { skipped: (reason: string) => string }) => ({
    skipped: (reason: string) => {
      skipped(reason);
      return obj.skipped(reason);
    },
  }),
}));

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

/** An animation as  reads it: how often its effect repeats, and its play state. */
function anim(iterations: number, playState: AnimationPlayState): Animation {
  return {
    playState,
    effect: {
      getComputedTiming: () => ({ iterations }),
    },
  } as unknown as Animation;
}

describe("isRunningLoop", () => {
  it("is true for an infinite animation that is running", () => {
    expect(isLoop(anim(Infinity, "running"))).toBe(true);
    expect(isRunningLoop(anim(Infinity, "running"))).toBe(true);
  });

  it("is not true for a paused loop, which is still a loop", () => {
    expect(isLoop(anim(Infinity, "paused"))).toBe(true);
    expect(isRunningLoop(anim(Infinity, "paused"))).toBe(false);
  });

  it("is not true for a loop that was cancelled or has finished", () => {
    expect(isRunningLoop(anim(Infinity, "idle"))).toBe(false);
    expect(isRunningLoop(anim(Infinity, "finished"))).toBe(false);
  });

  it("is not true for a one-shot, which ends by itself", () => {
    expect(isLoop(anim(1, "running"))).toBe(false);
    expect(isRunningLoop(anim(1, "running"))).toBe(false);
  });

  it("is not true for an animation without an effect", () => {
    const bare = { playState: "running", effect: null } as unknown as Animation;
    expect(isLoop(bare)).toBe(false);
    expect(isRunningLoop(bare)).toBe(false);
  });
});

describe("fullMotionBlocker", () => {
  it("blocks full motion under the browser's preference, and says why", () => {
    const reason = fullMotionBlocker("full", true);
    expect(reason).toEqual(expect.any(String));
    expect(reason).toContain("reduced motion");
  });

  it("blocks nothing without the preference: every check runs as before", () => {
    expect(fullMotionBlocker("full", false)).toBeNull();
  });

  it("never blocks a check of reduced motion, under the preference or not", () => {
    // The case that keeps "everything is skipped" from passing: the quiet checks always run.
    expect(fullMotionBlocker("reduce", true)).toBeNull();
    expect(fullMotionBlocker("reduce", false)).toBeNull();
  });
});

describe("browserPrefersReduced", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("is false where there is no matchMedia, as in node", () => {
    expect(browserPrefersReduced()).toBe(false);
  });

  it("is true when the browser matches prefers-reduced-motion: reduce", () => {
    vi.stubGlobal("matchMedia", (query: string) => ({ matches: query === "(prefers-reduced-motion: reduce)" }));
    expect(browserPrefersReduced()).toBe(true);
  });

  it("is false when the browser matches another query only", () => {
    vi.stubGlobal("matchMedia", (query: string) => ({ matches: query !== "(prefers-reduced-motion: reduce)" }));
    expect(browserPrefersReduced()).toBe(false);
  });
});

describe("withMotion under the browser's preference", () => {
  /** An <html> that keeps its attributes, so the helper's changes to it can be read; the helper's frames run at once. */
  function stubBrowser(prefersReduced: boolean) {
    const attributes = new Map<string, string>();
    vi.stubGlobal("document", {
      documentElement: {
        getAttribute: (name: string) => attributes.get(name) ?? null,
        setAttribute: (name: string, value: string) => attributes.set(name, value),
        removeAttribute: (name: string) => attributes.delete(name),
      },
    });
    vi.stubGlobal("requestAnimationFrame", (callback: () => void) => callback());
    vi.stubGlobal("matchMedia", () => ({ matches: prefersReduced }));
    return attributes;
  }

  afterEach(() => {
    vi.unstubAllGlobals();
    skipped.mockClear();
  });

  it("runs no full-motion check, and shows the reason as a skipped call", async () => {
    stubBrowser(true);
    const check = vi.fn(async () => {});
    await withMotion("full", check);
    expect(check).not.toHaveBeenCalled();
    expect(skipped).toHaveBeenCalledTimes(1);
    expect(skipped).toHaveBeenCalledWith(fullMotionBlocker("full", true));
  });

  it("still runs a check of reduced motion, with the attribute set and put back", async () => {
    const attributes = stubBrowser(true);
    let seen: string | undefined;
    await withMotion("reduce", async () => {
      seen = attributes.get("data-motion");
    });
    expect(seen).toBe("reduce");
    expect(attributes.has("data-motion")).toBe(false);
    expect(skipped).not.toHaveBeenCalled();
  });

  it("runs a full-motion check and skips nothing where the browser has no preference", async () => {
    const attributes = stubBrowser(false);
    attributes.set("data-motion", "reduce");
    let seen: string | undefined = "not run";
    await withMotion("full", async () => {
      seen = attributes.get("data-motion");
    });
    expect(seen).toBeUndefined();
    expect(attributes.get("data-motion")).toBe("reduce");
    expect(skipped).not.toHaveBeenCalled();
  });
});
