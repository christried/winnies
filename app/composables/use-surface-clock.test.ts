import type { AnimateCall } from "../../tests/support/fake-motion";
import type { ClockBeat, ClockSource, SurfaceClock } from "./use-surface-clock";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSSRApp, defineComponent, h, ref, watch } from "vue";
import { renderToString } from "vue/server-renderer";
import { fakeElement, fakeEnv, fakeLayer, WORKSPACE } from "../../tests/support/fake-motion";
import { createSurfaceMotion } from "../utils/motion/surface";
import { createSurfaceClock, provideSurfaceClock, resolveSurfaceClock, useSurfaceClock } from "./use-surface-clock";

// The clock runs on fake timers and a source made of `Date.now()` plus an offset: what `useServerClock().now` is.
// `vi.setSystemTime` moves the source without firing a timer, as a `sync()` or a throttled tab would.
let offset = 0;
const source: ClockSource = {
  now: () => Date.now() + offset,
};

function at(iso: string) {
  vi.setSystemTime(new Date(iso));
}

const ms = (iso: string) => Date.parse(iso);

// A tab whose visibility the test flips.
function fakeVisibility(hidden = false) {
  let current = hidden;
  const subscribers = new Set<() => void>();
  return {
    hidden: () => current,
    subscribe: (cb: () => void) => {
      subscribers.add(cb);
      return () => subscribers.delete(cb);
    },
    set(value: boolean) {
      current = value;
      [...subscribers].forEach(cb => cb());
    },
    get subscribers() {
      return subscribers.size;
    },
  };
}

// A clock on the offset source, and a record of what it reported.
function setup(init: { source?: ClockSource; hidden?: boolean } = {}) {
  const visibility = fakeVisibility(init.hidden);
  const clock = createSurfaceClock({ source: init.source ?? source, visibility });
  const beats: { beat: ClockBeat; now: number }[] = [];
  clock.onBeat((beat, now) => beats.push({ beat, now }));
  return { clock, visibility, beats };
}

// A source that runs `rate` times faster than real time, from `iso`.
function fastSource(iso: string, rate: number): ClockSource {
  const from = Date.now();
  const base = ms(iso);
  return {
    now: () => base + (Date.now() - from) * rate,
    rate,
  };
}

beforeEach(() => {
  offset = 0;
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("alignment", () => {
  it("ticks on the next full second of the source and then once per second", () => {
    at("2026-11-12T12:00:00.400Z");
    const { clock, beats } = setup();
    const started = Date.now();

    clock.start();
    vi.advanceTimersByTime(599);
    expect(clock.now.value).toBe(started);
    expect(beats).toEqual([]);

    vi.advanceTimersByTime(1);
    expect(clock.now.value).toBe(ms("2026-11-12T12:00:01.000Z"));
    expect(clock.beat.value).toBe("sec");

    vi.advanceTimersByTime(1000);
    vi.advanceTimersByTime(1000);
    expect(beats.map(b => b.now)).toEqual([
      ms("2026-11-12T12:00:01.000Z"),
      ms("2026-11-12T12:00:02.000Z"),
      ms("2026-11-12T12:00:03.000Z"),
    ]);
    clock.stop();
  });

  it("sets the beat before the reading, so a watcher on the reading sees this tick's beat", () => {
    at("2026-11-12T11:59:59.500Z");
    const { clock } = setup();
    const seen: ClockBeat[] = [];
    // A synchronous watcher runs inside the write to `now`.
    const stop = watch(clock.now, () => seen.push(clock.beat.value), { flush: "sync" });
    clock.start();

    vi.advanceTimersByTime(500);

    expect(seen).toEqual(["hour"]);
    stop();
    clock.stop();
  });
});

describe("server correction", () => {
  it("ticks on the source's boundaries, not the local ones", () => {
    at("2026-11-12T12:00:00.100Z");
    offset = 250;
    const { clock, beats } = setup();

    clock.start();
    vi.advanceTimersByTime(649);
    expect(beats).toEqual([]);

    vi.advanceTimersByTime(1);
    vi.advanceTimersByTime(1000);
    vi.advanceTimersByTime(1000);
    expect(beats).toHaveLength(3);
    expect(beats.every(b => b.now % 1000 === 0)).toBe(true);
    expect(beats[0]?.now).toBe(ms("2026-11-12T12:00:01.000Z"));
    clock.stop();
  });
});

describe("a source that moves under the clock", () => {
  // A `sync()` changes the offset without telling the clock; the armed timer then fires on the old boundary.
  const secondsOf = (beats: { now: number }[]) => beats.map(b => Math.floor(b.now / 1000) % 60);

  it("lands on the new boundary once the offset moved forward, with no tick doubled or dropped", () => {
    at("2026-11-12T12:00:00.500Z");
    const { clock, beats } = setup();
    clock.start();
    vi.advanceTimersByTime(500);

    offset = 300;
    vi.advanceTimersByTime(1000);
    vi.advanceTimersByTime(700);
    vi.advanceTimersByTime(1000);

    expect(secondsOf(beats)).toEqual([1, 2, 3, 4]);
    expect(beats.slice(-2).every(b => b.now % 1000 === 0)).toBe(true);
    clock.stop();
  });

  it("lands on the new boundary once the offset moved back, with no tick doubled or dropped", () => {
    at("2026-11-12T12:00:00.500Z");
    const { clock, beats } = setup();
    clock.start();
    vi.advanceTimersByTime(500);

    offset = -300;
    vi.advanceTimersByTime(1000);
    vi.advanceTimersByTime(300);
    vi.advanceTimersByTime(1000);

    expect(secondsOf(beats)).toEqual([1, 2, 3]);
    expect(beats.slice(-2).every(b => b.now % 1000 === 0)).toBe(true);
    clock.stop();
  });

  it("does not stand still when the source went back by whole seconds", () => {
    at("2026-11-12T12:00:30.000Z");
    const { clock, beats } = setup();
    clock.start();
    vi.advanceTimersByTime(1000);

    offset = -10_000;
    vi.advanceTimersByTime(1000);
    vi.advanceTimersByTime(1000);
    vi.advanceTimersByTime(1000);

    expect(beats.length).toBeGreaterThanOrEqual(3);
    expect(Math.floor(beats.at(-1)?.now ?? 0)).toBe(Date.now() + offset);
    clock.stop();
  });
});

describe("early or frozen", () => {
  it("reports nothing when the source still says the same second at fire time, and keeps the chain going", () => {
    let t = ms("2026-11-12T12:00:00.400Z");
    const { clock, beats } = setup({
      source: {
        now: () => t,
      },
    });
    clock.start();

    vi.advanceTimersByTime(600);
    expect(beats).toEqual([]);
    expect(clock.now.value).toBe(ms("2026-11-12T12:00:00.400Z"));
    expect(vi.getTimerCount()).toBe(1);

    t = ms("2026-11-12T12:00:01.050Z");
    vi.advanceTimersByTime(600);
    expect(beats.map(b => b.now)).toEqual([
      ms("2026-11-12T12:00:01.050Z"),
    ]);
    clock.stop();
  });

  it("makes no beat and no tight loop for five real seconds of a frozen source", () => {
    const { clock, beats } = setup({
      source: {
        now: () => ms("2026-11-12T12:00:00.500Z"),
      },
    });
    clock.start();

    vi.advanceTimersByTime(5000);

    expect(beats).toEqual([]);
    expect(clock.now.value).toBe(ms("2026-11-12T12:00:00.500Z"));
    expect(vi.getTimerCount()).toBe(1);
    clock.stop();
  });
});

describe("beats", () => {
  it("is sec on a second, min at :00 of a minute, and hour (not min) at the full hour", () => {
    at("2026-11-11T11:59:58.500Z");
    const { clock, beats } = setup();
    clock.start();

    vi.advanceTimersByTime(500);
    expect(beats.at(-1)).toEqual({
      beat: "sec",
      now: ms("2026-11-11T11:59:59.000Z"),
    });

    vi.advanceTimersByTime(1000);
    expect(beats.at(-1)).toEqual({
      beat: "hour",
      now: ms("2026-11-11T12:00:00.000Z"),
    });

    vi.advanceTimersByTime(59_000);
    expect(beats.at(-1)).toEqual({
      beat: "sec",
      now: ms("2026-11-11T12:00:59.000Z"),
    });

    vi.advanceTimersByTime(1000);
    expect(beats.at(-1)).toEqual({
      beat: "min",
      now: ms("2026-11-11T12:01:00.000Z"),
    });

    vi.advanceTimersByTime(1000);
    expect(beats.at(-1)).toEqual({
      beat: "sec",
      now: ms("2026-11-11T12:01:01.000Z"),
    });
    clock.stop();
  });

  it("reports the biggest boundary a jump of several seconds crossed", () => {
    at("2026-11-11T12:01:00.500Z");
    const { clock, beats } = setup();
    clock.start();

    at("2026-11-11T12:02:03.200Z");
    vi.advanceTimersToNextTimer();
    expect(beats.at(-1)?.beat).toBe("min");

    at("2026-11-11T13:00:30.000Z");
    vi.advanceTimersToNextTimer();
    expect(beats.at(-1)?.beat).toBe("hour");

    at("2026-11-11T13:00:40.000Z");
    vi.advanceTimersToNextTimer();
    expect(beats.at(-1)?.beat).toBe("sec");
    clock.stop();
  });
});

describe("a hidden tab", () => {
  it("keeps ticking, mirrors the tab, and reads the source at once when it comes back", () => {
    at("2026-11-12T12:00:00.000Z");
    const { clock, visibility, beats } = setup();
    expect(clock.hidden.value).toBe(false);
    clock.start();
    expect(clock.hidden.value).toBe(false);

    visibility.set(true);
    expect(clock.hidden.value).toBe(true);
    const before = clock.now.value;
    vi.advanceTimersByTime(5000);
    expect(beats).toHaveLength(5);
    expect(clock.now.value).toBe(before + 5000);

    // The browser throttled the timer: the source moved, no timer fired.
    at("2026-11-12T12:00:08.500Z");
    visibility.set(false);
    expect(clock.hidden.value).toBe(false);
    expect(clock.now.value).toBe(ms("2026-11-12T12:00:08.500Z"));
    expect(vi.getTimerCount()).toBe(1);

    vi.advanceTimersByTime(500);
    expect(clock.now.value).toBe(ms("2026-11-12T12:00:09.000Z"));
    clock.stop();
  });

  it("starts out hidden when the tab already is", () => {
    const { clock } = setup({ hidden: true });

    clock.start();

    expect(clock.hidden.value).toBe(true);
    clock.stop();
  });
});

describe("a fast source", () => {
  it("reports its interval, and still lands its beats on the source's :00 and the hour", () => {
    at("2026-11-11T11:59:57.500Z");
    const { clock, beats } = setup({
      source: fastSource("2026-11-11T11:59:57.500Z", 60),
    });
    expect(clock.interval()).toBeCloseTo(1000 / 60);

    clock.start();
    // 1.2 real seconds are 72 source seconds.
    vi.advanceTimersByTime(1200);

    const hour = beats.filter(b => b.beat === "hour");
    const min = beats.filter(b => b.beat === "min");
    expect(hour).toHaveLength(1);
    expect(min).toHaveLength(1);
    expect(Math.floor(hour[0]!.now / 1000)).toBe(ms("2026-11-11T12:00:00.000Z") / 1000);
    expect(Math.floor(min[0]!.now / 1000)).toBe(ms("2026-11-11T12:01:00.000Z") / 1000);
    // One source second apart, ticks that are close to a real 17 ms apart.
    const seconds = beats.map(b => Math.floor(b.now / 1000));
    expect(seconds.every((s, i) => i === 0 || s === seconds[i - 1]! + 1)).toBe(true);
    clock.stop();
  });

  it("reports 1000 ms at the default rate", () => {
    expect(setup().clock.interval()).toBe(1000);
  });

  it("refuses a rate that is not above zero", () => {
    expect(() => createSurfaceClock({
      source: {
        now: () => 0,
        rate: 0,
      },
    })).toThrow(RangeError);
    expect(() => createSurfaceClock({
      source: {
        now: () => 0,
        rate: -1,
      },
    })).toThrow(RangeError);
    expect(() => createSurfaceClock({
      source: {
        now: () => 0,
        rate: Number.NaN,
      },
    })).toThrow(RangeError);
    expect(() => createSurfaceClock({
      source: {
        now: () => 0,
        rate: Infinity,
      },
    })).toThrow(RangeError);
  });
});

describe("lifecycle", () => {
  it("arms one chain however often it is started, and leaves nothing behind when stopped", () => {
    const { clock, visibility } = setup();

    clock.start();
    clock.start();
    expect(vi.getTimerCount()).toBe(1);
    expect(visibility.subscribers).toBe(1);

    clock.stop();
    expect(vi.getTimerCount()).toBe(0);
    expect(visibility.subscribers).toBe(0);

    expect(() => clock.stop()).not.toThrow();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("stops calling a listener once it has unsubscribed, and a stopped clock ticks no more", () => {
    at("2026-11-12T12:00:00.000Z");
    const { clock } = setup();
    const kept = vi.fn();
    const dropped = vi.fn();
    clock.onBeat(kept);
    const unsubscribe = clock.onBeat(dropped);
    clock.start();

    vi.advanceTimersByTime(1000);
    unsubscribe();
    vi.advanceTimersByTime(1000);
    expect(kept).toHaveBeenCalledTimes(2);
    expect(dropped).toHaveBeenCalledTimes(1);

    clock.stop();
    vi.advanceTimersByTime(5000);
    expect(kept).toHaveBeenCalledTimes(2);
  });

  it("is left with no timer when a listener stops it", () => {
    at("2026-11-12T12:00:00.000Z");
    const { clock } = setup();
    clock.onBeat(() => clock.stop());
    clock.start();

    vi.advanceTimersByTime(1000);

    expect(vi.getTimerCount()).toBe(0);
  });

  it("keeps the chain when a listener throws", () => {
    at("2026-11-12T12:00:00.000Z");
    const { clock } = setup();
    clock.onBeat(() => {
      throw new Error("boom");
    });
    clock.start();

    expect(() => vi.advanceTimersByTime(1000)).toThrow("boom");

    expect(vi.getTimerCount()).toBe(1);
    clock.stop();
  });
});

describe("the tick clamp", () => {
  // What the motion instance does with the interval the clock reports: a digit's tick is 480 ms long at the default
  // interval, clamped to 95% of a shorter one, and skipped below 60 ms.
  function tickOf(rate: number): AnimateCall | undefined {
    const clock = createSurfaceClock({
      source: {
        now: () => 0,
        rate,
      },
      visibility: fakeVisibility(),
    });
    const log: AnimateCall[] = [];
    const surface = createSurfaceMotion({
      root: () => fakeElement({ log }),
      layer: () => fakeLayer({ width: 1000, height: 800, log }),
      dialect: () => null,
      interval: clock.interval,
      env: fakeEnv({ styles: WORKSPACE }),
    });
    surface.start();
    surface.m.tick([
      fakeElement({ log }),
    ], "total", "sec");
    return log.at(-1);
  }

  it("is 480 ms at the default rate", () => {
    expect(tickOf(1)?.options.duration).toBe(480);
  });

  it("is 475 ms at twice the rate", () => {
    expect(tickOf(2)?.options.duration).toBeCloseTo(475);
  });

  it("is no animation at twenty times the rate", () => {
    expect(tickOf(20)).toBeUndefined();
  });
});

describe("a surface's clock", () => {
  it("resolveSurfaceClock throws when strict and nothing was found", () => {
    expect(() => resolveSurfaceClock(null, true)).toThrow(/outside a surface/);
  });

  it("resolveSurfaceClock gives an inert clock when not strict: a new one each time, never ticking", () => {
    const first = resolveSurfaceClock(null, false);

    expect(first.hidden.value).toBe(false);
    expect(first.interval()).toBe(1000);
    vi.advanceTimersByTime(5000);
    expect(vi.getTimerCount()).toBe(0);
    expect(resolveSurfaceClock(null, false)).not.toBe(first);
  });

  it("resolveSurfaceClock hands back the clock it was given", () => {
    const found = resolveSurfaceClock(null, false);

    expect(resolveSurfaceClock(found, true)).toBe(found);
  });

  it("gives the components under a layout the layout's clock, and arms no timer on the server", async () => {
    // The test runs in node: a stray `document` access would throw. `onMounted` does not run in a server render.
    let provided: SurfaceClock | undefined;
    let injected: SurfaceClock | undefined;
    const child = defineComponent({
      setup() {
        injected = useSurfaceClock();
        return () => h("span");
      },
    });
    const layout = defineComponent({
      setup(_props, { slots }) {
        provided = provideSurfaceClock({
          source: {
            now: () => 0,
          },
          now: ref(0),
        });
        return () => h("div", slots.default?.());
      },
    });

    await renderToString(createSSRApp(defineComponent({
      render: () => h(layout, () => h(child)),
    })));

    expect(provided).toBeDefined();
    expect(injected).toBe(provided);
    expect(typeof document).toBe("undefined");
    expect(vi.getTimerCount()).toBe(0);
  });
});
