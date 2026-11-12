import type { AnimateCall } from "../../../tests/support/fake-motion";
import type { MotionDialect } from "./types";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BROADCAST, fakeElement, fakeEnv, fakeLayer, WORKSPACE } from "../../../tests/support/fake-motion";
import { bodyDialect, browserAnimations, createSurfaceMotion, parseDialect } from "./surface";

beforeEach(() => {
  vi.spyOn(Math, "random").mockReturnValue(0.5);
});
afterEach(() => {
  vi.restoreAllMocks();
});

// A surface over fakes. `log` is the layer's shared call log: every animation of every fake element lands in it, which
// is what `browserAnimations()` lists in a browser.
function setup(init: { interval?: () => number; dialect?: () => MotionDialect } = {}) {
  const log: AnimateCall[] = [];
  const layer = fakeLayer({ width: 1000, height: 800, log });
  const root = fakeElement({ log });
  const env = fakeEnv({ styles: WORKSPACE });
  const surface = createSurfaceMotion({
    root: () => root,
    layer: () => layer,
    dialect: init.dialect ?? (() => null),
    interval: init.interval,
    env,
    animations: () => log.map(c => c.animation) as unknown as Animation[],
  });
  const el = () => fakeElement({ log });
  return {
    surface,
    m: surface.m,
    log,
    layer,
    root,
    env,
    el,
  };
}

const cancelled = (a: Animation | null) => (a as unknown as { cancelled: boolean }).cancelled;

describe("start", () => {
  it("listens to nothing until it is called, once after, and still once after a second call", () => {
    const { surface, env } = setup();

    expect(env.mediaListeners).toBe(0);
    expect(env.attrObservers).toBe(0);

    surface.start();
    expect(env.mediaListeners).toBe(1);
    expect(env.attrObservers).toBe(1);

    surface.start();
    expect(env.mediaListeners).toBe(1);
    expect(env.attrObservers).toBe(1);
  });
});

describe("config", () => {
  it("clamps a tick to 95% of the interval it is given, and uses the flick token with none", () => {
    const withInterval = setup({
      interval: () => 300,
    });
    withInterval.surface.start();
    withInterval.m.tick([
      withInterval.el(),
    ], "row", "sec");
    const fast = withInterval.log.at(-1)?.options.duration;

    const withDefault = setup();
    withDefault.surface.start();
    withDefault.m.tick([
      withDefault.el(),
    ], "row", "sec");
    const normal = withDefault.log.at(-1)?.options.duration;

    expect(fast).toBeCloseTo(285);
    expect(normal).toBe(380);
  });

  it("reads the interval on every call", () => {
    let interval = 300;
    const { surface, m, log, el } = setup({
      interval: () => interval,
    });
    surface.start();

    m.tick([
      el(),
    ], "row", "sec");
    interval = 1000;
    m.tick([
      el(),
    ], "row", "sec");

    expect(log.map(c => c.options.duration)).toEqual([
      expect.closeTo(285),
      380,
    ]);
  });

  it("reads the dialect when an animation is requested, not when the surface is made", () => {
    let dialect: MotionDialect = null;
    const { surface, m, log, el } = setup({
      dialect: () => dialect,
    });
    surface.start();

    m.tick([
      el(),
    ], "row", "sec");
    dialect = "broadcast";
    m.tick([
      el(),
    ], "row", "sec");

    const rotations = log.map(c => c.keyframes[1]?.transform);
    expect(rotations[0]).toContain("rotate(-5deg)");
    expect(rotations[1]).toContain("rotate(0deg)");
  });

  it("leaves Calm off, so an Overlay row digit still ticks", () => {
    const { surface, m, log, el } = setup();
    surface.start();

    m.tick([
      el(),
    ], "ov-row", "sec");

    expect(log).toHaveLength(1);
  });
});

describe("reduced motion", () => {
  function running() {
    const s = setup();
    s.surface.start();
    const looped = s.el();
    const oneShot = s.el();
    const loop = s.m.loop(looped, "breathe");
    const jelly = s.m.jelly("resp", oneShot);
    s.m.burst("resp", s.el());
    return { ...s, loop, jelly };
  }

  it.each([
    [
      "the media query",
      (s: ReturnType<typeof running>) => s.env.changeMedia(true),
    ],
    [
      "<html data-motion>",
      (s: ReturnType<typeof running>) => s.env.setAttr("data-motion", "reduce"),
    ],
  ])("cancels loops, one-shots and particles when %s says reduce", (_name, reduce) => {
    const s = running();
    expect(s.layer.children.length).toBeGreaterThan(0);
    expect(cancelled(s.loop)).toBe(false);
    expect(cancelled(s.jelly)).toBe(false);

    reduce(s);

    expect(cancelled(s.loop)).toBe(true);
    expect(cancelled(s.jelly)).toBe(true);
    expect(s.log.every(c => c.animation.cancelled)).toBe(true);
    expect(s.layer.children).toHaveLength(0);
    expect(s.m.on("resp")).toBe(false);
    expect(s.m.on("amb")).toBe(false);
  });

  it("creates nothing afterwards", () => {
    const s = running();
    s.env.changeMedia(true);
    const before = s.log.length;

    expect(s.m.jelly("resp", s.el())).toBeNull();
    expect(s.log).toHaveLength(before);
  });

  it("leaves an animation that finished holding its end state alone, so an exited row does not snap back", () => {
    const s = setup();
    s.surface.start();
    const row = s.el();
    const exit = row.animate([
      { opacity: 1 },
      { opacity: 0 },
    ], { duration: 100, fill: "forwards" });
    exit.finish();

    s.env.changeMedia(true);

    expect((exit as unknown as { cancelled: boolean }).cancelled).toBe(false);
  });

  it("does nothing when the preference is lifted again", () => {
    const s = running();
    s.env.changeMedia(true);
    s.env.changeMedia(false);

    expect(s.m.on("resp")).toBe(true);
  });
});

describe("tokens", () => {
  it.each(["data-theme", "data-dialect", "data-motion"])("are read again when %s changes", (name) => {
    const { surface, m, env } = setup();
    surface.start();
    expect(m.T().C.gain).toBe(1);

    env.styleOf(BROADCAST);
    env.setAttr(name, "x");

    expect(m.T().C.gain).toBe(1.25);
  });
});

describe("dispose", () => {
  it("stops listening, cancels loops and one-shots and empties the layer", () => {
    const s = setup();
    s.surface.start();
    const loop = s.m.loop(s.el(), "breathe");
    const jelly = s.m.jelly("resp", s.el());
    s.m.burst("resp", s.el());

    s.surface.dispose();

    expect(s.env.mediaListeners).toBe(0);
    expect(s.env.attrObservers).toBe(0);
    expect(cancelled(loop)).toBe(true);
    expect(cancelled(jelly)).toBe(true);
    expect(s.layer.children).toHaveLength(0);
  });

  it("can be called twice", () => {
    const { surface } = setup();
    surface.start();
    surface.dispose();

    expect(() => surface.dispose()).not.toThrow();
  });

  it("can be called without start", () => {
    const { surface } = setup();

    expect(() => surface.dispose()).not.toThrow();
  });

  it("lets the surface start again afterwards", () => {
    const { surface, env } = setup();
    surface.start();
    surface.dispose();
    surface.start();

    expect(env.mediaListeners).toBe(1);
    expect(env.attrObservers).toBe(1);
  });
});

describe("parseDialect", () => {
  it.each([
    ["broadcast", "broadcast"],
    ["showcase", "showcase"],
    [null, null],
    [undefined, null],
    ["", null],
    ["workspace", null],
    ["x", null],
  ] as const)("%j is %j", (value, expected) => {
    expect(parseDialect(value)).toBe(expected);
  });
});

describe("on the server", () => {
  it("touches no browser global until start", () => {
    // The test runs in node: a stray `window` or `document` access would throw.
    expect(typeof document).toBe("undefined");
    const surface = createSurfaceMotion({
      root: () => null,
      layer: () => null,
      dialect: () => null,
    });

    expect(surface.m.on("resp")).toBe(true);
    expect(() => surface.dispose()).not.toThrow();
  });

  it("has no body dialect and no animations", () => {
    expect(bodyDialect()).toBeNull();
    expect(browserAnimations()).toEqual([]);
  });
});
