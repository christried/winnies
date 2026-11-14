import type { WonMotion } from "./win-motion";
import { describe, expect, it, vi } from "vitest";
import { playUnwon, playWon } from "./win-motion";

// The engine's own recipes are tested by R1; here a hand-made spy stands in for them, so what is pinned is the order
// and the guards of the two sequences (C01 then R17, R18), not what a recipe draws.

type Flip = (key: string, el: HTMLElement, dy: number) => boolean | void;

const JELLY = 700;

interface Rig {
  m: WonMotion;
  calls: string[];
  /** The `special` each `flip` call was given, and the scale. */
  flips: { prev: unknown; els: [string, HTMLElement][]; sc: number | undefined; special: Flip | undefined }[];
  /** What `m.on` answers per tier. */
  tiers: { cel: boolean; resp: boolean };
  /** The `dy` the flip reports for each key when it calls `special`. */
  dys: Record<string, number>;
  arcs: { el: HTMLElement; dy: number; after: (() => void) | undefined }[];
}

function rig(): Rig {
  const calls: string[] = [];
  const flips: Rig["flips"] = [];
  const arcs: Rig["arcs"] = [];
  const tiers = { cel: true, resp: true };
  const dys: Record<string, number> = {};
  const m = {
    won: vi.fn((..._a: unknown[]) => {
      calls.push("won");
    }),
    wait: vi.fn(async (_ms: number) => {
      calls.push("wait");
    }),
    capture: vi.fn((els: [string, HTMLElement][]) => {
      calls.push("capture");
      return new Map(els.map(([k]) => [k, {} as DOMRect]));
    }),
    flip: vi.fn((prev: Map<string, DOMRect>, els: [string, HTMLElement][], sc?: number, special?: Flip) => {
      calls.push("flip");
      flips.push({
        prev,
        els,
        sc,
        special,
      });
      for (const [k, el] of els)
        special?.(k, el, dys[k] ?? 0);
    }),
    arc: vi.fn((el: HTMLElement, dy: number, after?: () => void) => {
      calls.push("arc");
      arcs.push({
        el,
        dy,
        after,
      });
      return null;
    }),
    land: vi.fn((_el: unknown) => {
      calls.push("land");
      return null;
    }),
    sticker: vi.fn((_el: unknown) => {
      calls.push("sticker");
      return null;
    }),
    on: vi.fn((tier: "amb" | "resp" | "cel") => tier === "cel"
      ? tiers.cel
      : tier === "resp"
        ? tiers.resp
        : true),
    T: vi.fn(() => ({
      D: { jelly: JELLY },
    })),
  } as unknown as WonMotion;
  return {
    m,
    calls,
    flips,
    tiers,
    dys,
    arcs,
  };
}

function el(name: string): HTMLElement {
  return { name } as unknown as HTMLElement;
}

function target(r: Rig, overrides: Record<string, unknown> = {}) {
  const row = el("row");
  const other = el("other");
  const mid = el("mid");
  const face = el("face");
  const sticker = el("sticker");
  let list: [string, HTMLElement][] = [
    ["a", row],
    ["b", other],
  ];
  const commit = vi.fn(async () => {
    r.calls.push("commit");
    // The list has moved by the time the DOM shows the new state.
    list = [
      ["b", other],
      ["a", row],
    ];
  });
  const rows = vi.fn(() => list);
  return {
    row,
    other,
    mid,
    face,
    sticker,
    commit,
    rows,
    t: {
      key: "a",
      rows,
      mid: () => mid,
      face: () => face,
      sticker: () => sticker,
      commit,
      ...overrides,
    },
  };
}

describe("playWon", () => {
  it("plays C01, waits for the jelly, captures, commits, then flips", async () => {
    const r = rig();
    const x = target(r);
    await playWon(r.m, x.t);
    expect(r.calls.slice(0, 5)).toEqual([
      "won",
      "wait",
      "capture",
      "commit",
      "flip",
    ]);
    expect(r.m.won).toHaveBeenCalledWith(x.mid, x.face, false);
  });

  it("waits 0.9 of the jelly, so the row moves as the squash ends", async () => {
    const r = rig();
    await playWon(r.m, target(r).t);
    expect(r.m.wait).toHaveBeenCalledWith(JELLY * 0.9);
  });

  it("does not wait when the celebratory tier is off", async () => {
    const r = rig();
    r.tiers.cel = false;
    await playWon(r.m, target(r).t);
    expect(r.m.wait).toHaveBeenCalledWith(0);
  });

  it("captures the list before the commit and reads it again after it", async () => {
    const r = rig();
    const x = target(r);
    await playWon(r.m, x.t);
    const captured = vi.mocked(r.m.capture).mock.calls[0]![0].map(([k]) => k);
    expect(captured).toEqual(["a", "b"]);
    expect(r.flips[0]!.els.map(([k]) => k)).toEqual(["b", "a"]);
    expect(x.rows).toHaveBeenCalledTimes(2);
  });

  it("awaits the commit before it flips", async () => {
    const r = rig();
    let release!: () => void;
    const x = target(r, {
      commit: () => new Promise<void>((resolve) => {
        release = resolve;
      }),
    });
    const done = playWon(r.m, x.t);
    await vi.waitFor(() => expect(r.m.capture).toHaveBeenCalled());
    await Promise.resolve();
    expect(r.m.flip).not.toHaveBeenCalled();
    release();
    await done;
    expect(r.m.flip).toHaveBeenCalledTimes(1);
  });

  it("passes the surface scale to the flip, 1 when none is given", async () => {
    const r = rig();
    await playWon(r.m, target(r).t);
    await playWon(r.m, target(r, { scale: 0.8 }).t);
    expect(r.flips.map(f => f.sc)).toEqual([1, 0.8]);
  });

  it("sends the row through the arc, and lands and slaps the sticker when it arrives", async () => {
    const r = rig();
    r.dys.a = 160;
    const x = target(r);
    await playWon(r.m, x.t);
    expect(r.arcs).toHaveLength(1);
    expect(r.arcs[0]!.el).toBe(x.row);
    expect(r.arcs[0]!.dy).toBe(160);
    // Nothing lands before the arc says it is there.
    expect(r.m.land).not.toHaveBeenCalled();
    expect(r.m.sticker).not.toHaveBeenCalled();
    r.arcs[0]!.after!();
    expect(r.calls.slice(-2)).toEqual(["land", "sticker"]);
    expect(r.m.land).toHaveBeenCalledWith(x.mid);
    expect(r.m.sticker).toHaveBeenCalledWith(x.sticker);
  });

  it("reads the mid and the sticker when the arc ends, not when it starts", async () => {
    const r = rig();
    r.dys.a = 160;
    let mid: HTMLElement | null = null;
    const x = target(r, {
      mid: () => mid,
    });
    // The sticker exists only once Won: it is not there before the commit.
    await playWon(r.m, {
      ...x.t,
      mid: () => mid,
    });
    mid = el("late-mid");
    r.arcs[0]!.after!();
    expect(r.m.land).toHaveBeenCalledWith(mid);
  });

  it("lands at once when the row has nowhere to travel", async () => {
    const r = rig();
    r.dys.a = 1;
    const x = target(r);
    await playWon(r.m, x.t);
    expect(r.m.arc).not.toHaveBeenCalled();
    expect(r.calls.slice(-2)).toEqual(["land", "sticker"]);
  });

  it("lands at once when the responsive tier is off, however far the row moves", async () => {
    const r = rig();
    r.dys.a = 160;
    r.tiers.resp = false;
    await playWon(r.m, target(r).t);
    expect(r.m.arc).not.toHaveBeenCalled();
    expect(r.calls.slice(-2)).toEqual(["land", "sticker"]);
  });

  it("claims the changing row and leaves every other row to the plain flip", async () => {
    const r = rig();
    r.dys.a = 160;
    r.dys.b = -80;
    const x = target(r);
    await playWon(r.m, x.t);
    // The flip offered both rows to `special`; only the changing one travelled.
    expect(r.arcs.map(a => a.el)).toEqual([x.row]);
    const special = r.flips[0]!.special!;
    expect(special("a", x.row, 160)).toBe(true);
    expect(special("a", x.row, 0)).toBe(true);
    expect(special("b", x.other, -80)).toBeUndefined();
  });
});

describe("playUnwon", () => {
  it("captures, commits, then flips, with no celebration", async () => {
    const r = rig();
    const x = target(r);
    await playUnwon(r.m, x.t);
    expect(r.calls).toEqual(["capture", "commit", "flip"]);
    expect(r.m.won).not.toHaveBeenCalled();
    expect(r.m.arc).not.toHaveBeenCalled();
    expect(r.m.land).not.toHaveBeenCalled();
    expect(r.m.sticker).not.toHaveBeenCalled();
  });

  it("flips every row alike: no special for the changing one", async () => {
    const r = rig();
    r.dys.a = 160;
    await playUnwon(r.m, target(r, { scale: 0.8 }).t);
    expect(r.flips[0]!.special).toBeUndefined();
    expect(r.flips[0]!.sc).toBe(0.8);
    expect(r.flips[0]!.els.map(([k]) => k)).toEqual(["b", "a"]);
  });

  it("awaits the commit before it flips", async () => {
    const r = rig();
    let release!: () => void;
    const x = target(r, {
      commit: () => new Promise<void>((resolve) => {
        release = resolve;
      }),
    });
    const done = playUnwon(r.m, x.t);
    await Promise.resolve();
    expect(r.m.flip).not.toHaveBeenCalled();
    release();
    await done;
    expect(r.m.flip).toHaveBeenCalledTimes(1);
  });
});
