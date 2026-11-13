import type { AnimateCall, FakeAnimation, FakeElement, MotionHarness, TokenMap } from "../../../tests/support/fake-motion";
import type { LoopSpec } from "./loop-sync";
import { afterEach, describe, expect, it } from "vitest";
import { fakeLoopEnv } from "../../../tests/support/fake-loop-env";
import { fakeElement, fakeEnv, fakeLayer, motionHarness, SHOWCASE, WORKSPACE } from "../../../tests/support/fake-motion";
import { createLoopHost, LOOP_ORIGIN } from "./loop-sync";
import { createSurfaceMotion } from "./surface";

// The engine runs over the recorder here: jsdom has no Web Animations, so these tests see what the host asks of the
// engine and of its animations (start, pause, play, startTime, cancel). That a browser aligns the phase and resumes
// after `startTime` is assigned is proven in the motion stories (#305, #306).

const stops: (() => void)[] = [];
afterEach(() => {
  stops.splice(0).forEach(stop => stop());
});

// A harness whose engine is watched, as a surface does, with its subscriber count counted.
function setup(init: Parameters<typeof motionHarness>[0] = {}) {
  const h = motionHarness(init);
  stops.push(h.m.watch());
  let subscribers = 0;
  const subscribe = h.m.subscribe;
  h.m.subscribe = (cb) => {
    subscribers++;
    const off = subscribe(cb);
    return () => {
      subscribers--;
      off();
    };
  };
  const env = fakeLoopEnv();
  const host = createLoopHost(h.m, env);
  return {
    h,
    env,
    host,
    get subscribers() {
      return subscribers;
    },
  };
}

// The animations an element was given, newest last.
function anims(el: FakeElement): FakeAnimation[] {
  return el.animations;
}

function running(h: MotionHarness) {
  return h.log.map(c => c.animation).filter(a => !a.cancelled);
}

describe("start", () => {
  it("creates one infinite animation at the tokens' rate, aligned to the shared origin", () => {
    const { h, host } = setup({ tokens: SHOWCASE });
    const el = h.el();

    host.set(el, "breathe");

    expect(el.calls).toHaveLength(1);
    expect(el.calls[0]?.options.iterations).toBe(Infinity);
    expect(el.animations[0]?.playbackRate).toBe(1.4);
    expect(el.animations[0]?.startTime).toBe(LOOP_ORIGIN);
    expect(el.animations[0]?.playState).toBe("running");
  });
});

describe("cancel", () => {
  it("cancels the loop on remove and forgets the element", () => {
    const { h, host } = setup();
    const el = h.el();
    host.set(el, "breathe");
    expect(host.size).toBe(1);

    host.remove(el);

    expect(anims(el)[0]?.cancelled).toBe(true);
    expect(host.size).toBe(0);
  });

  it("does nothing when the element was never set", () => {
    const { h, host } = setup();

    expect(() => host.remove(h.el())).not.toThrow();
    expect(host.size).toBe(0);
  });
});

describe("a changed spec", () => {
  it("cancels the old loop and starts the new one when the name changes", () => {
    const { h, host } = setup();
    const el = h.el();
    host.set(el, "breathe");

    host.set(el, "glow");

    expect(anims(el)).toHaveLength(2);
    expect(anims(el)[0]?.cancelled).toBe(true);
    expect(anims(el)[1]?.cancelled).toBe(false);
    expect(el.calls[1]?.keyframes).toEqual([
      { opacity: 0.5 },
      { opacity: 1 },
      { opacity: 0.5 },
    ]);
  });

  it("creates nothing when the same name and delay are set again", () => {
    const { h, host } = setup();
    const el = h.el();
    host.set(el, "breathe");

    host.set(el, "breathe");
    host.set(el, { name: "breathe" });
    host.set(el, { name: "breathe", delay: 0 });

    expect(anims(el)).toHaveLength(1);
  });

  it("restarts the loop when the delay changes", () => {
    const { h, host } = setup();
    const el = h.el();
    host.set(el, { name: "bob", delay: 0 });

    host.set(el, { name: "bob", delay: -110 });

    expect(anims(el)).toHaveLength(2);
    expect(anims(el)[0]?.cancelled).toBe(true);
    expect(el.calls[1]?.options.delay).toBe(-110);
  });

  it("removes the loop for a falsy spec", () => {
    const { h, host } = setup();
    const el = h.el();
    host.set(el, "ring");

    host.set(el, false);

    expect(anims(el)[0]?.cancelled).toBe(true);
    expect(host.size).toBe(0);
  });
});

describe("pausing", () => {
  it("pauses a loop whose element leaves the screen and resumes it, re-aligned, when it returns", () => {
    const { h, env, host } = setup();
    const el = h.el();
    host.set(el, "ring");
    const a = anims(el)[0] as FakeAnimation;

    env.setVisible(el, false);
    expect(a.playState).toBe("paused");

    a.startTime = 5000; // what a browser's clock would have moved it to
    env.setVisible(el, true);
    expect(a.playState).toBe("running");
    expect(a.startTime).toBe(LOOP_ORIGIN);
  });

  it("pauses every loop while the tab is hidden and resumes them when it is shown", () => {
    const { h, env, host } = setup();
    const els = [
      h.el(),
      h.el(),
      h.el(),
    ];
    els.forEach(el => host.set(el, "breathe"));

    env.setHidden(true);
    expect(els.every(el => anims(el)[0]?.playState === "paused")).toBe(true);

    env.setHidden(false);
    expect(els.every(el => anims(el)[0]?.playState === "running")).toBe(true);
    expect(els.every(el => anims(el)[0]?.startTime === LOOP_ORIGIN)).toBe(true);
  });

  it("keeps a loop paused while either reason holds", () => {
    const { h, env, host } = setup();
    const el = h.el();
    host.set(el, "ring");
    const a = anims(el)[0] as FakeAnimation;

    env.setVisible(el, false);
    env.setHidden(true);
    env.setHidden(false);
    expect(a.playState).toBe("paused");

    env.setVisible(el, true);
    expect(a.playState).toBe("running");
  });

  it("starts a loop paused when the tab is already hidden", () => {
    const { h, env, host } = setup();
    env.setHidden(true);
    const el = h.el();

    host.set(el, "ring");

    expect(anims(el)[0]?.playState).toBe("paused");
    expect(anims(el)[0]?.startTime).toBe(LOOP_ORIGIN);
  });

  it("starts the replacement paused when the element is off-screen", () => {
    const { h, env, host } = setup();
    const el = h.el();
    host.set(el, "ring");
    env.setVisible(el, false);

    host.set(el, "glow");

    expect(anims(el)[1]?.playState).toBe("paused");
  });
});

describe("a shared phase", () => {
  it("gives two same-named loops one startTime", () => {
    const { h, host } = setup();
    const [a, b] = [
      h.el(),
      h.el(),
    ];

    host.set(a, "ring");
    host.set(b, "ring");

    expect(anims(a)[0]?.startTime).toBe(anims(b)[0]?.startTime);
    expect(anims(a)[0]?.startTime).toBe(LOOP_ORIGIN);
  });

  it("offsets a stagger by the loop's delay and keeps the origin", () => {
    const { h, host } = setup();
    const [a, b] = [
      h.el(),
      h.el(),
    ];

    host.set(a, { name: "bob", delay: 0 });
    host.set(b, { name: "bob", delay: 300 });

    expect(a.calls[0]?.options.delay).toBe(0);
    expect(b.calls[0]?.options.delay).toBe(300);
    expect(anims(a)[0]?.startTime).toBe(LOOP_ORIGIN);
    expect(anims(b)[0]?.startTime).toBe(LOOP_ORIGIN);
  });

  it("puts a loop back in step with its sibling after it was off-screen for a while", () => {
    const { h, env, host } = setup();
    const [a, b] = [
      h.el(),
      h.el(),
    ];
    host.set(a, "ring");
    host.set(b, "ring");

    env.setVisible(b, false);
    (anims(a)[0] as FakeAnimation).startTime = 123; // a keeps running, its time reading drifts in the recorder
    env.setVisible(a, false);
    env.setVisible(b, true);
    env.setVisible(a, true);

    expect(anims(a)[0]?.startTime).toBe(anims(b)[0]?.startTime);
    expect(anims(b)[0]?.startTime).toBe(LOOP_ORIGIN);
  });

  it("re-aligns every running loop when the tokens change, and leaves a paused one paused", () => {
    const { h, env, host } = setup();
    const [a, b] = [
      h.el(),
      h.el(),
    ];
    host.set(a, "ring");
    host.set(b, "ring");
    env.setVisible(b, false);
    (anims(a)[0] as FakeAnimation).startTime = 77;

    h.env.styleOf(SHOWCASE);
    h.env.setAttr("data-dialect", "showcase");

    expect(anims(a)[0]?.playbackRate).toBe(1.4);
    expect(anims(a)[0]?.startTime).toBe(LOOP_ORIGIN);
    expect(anims(b)[0]?.playState).toBe("paused");
  });
});

describe("gating", () => {
  it("creates nothing while motion is reduced by the config", () => {
    const { h, host } = setup({
      cfg: { reduced: true },
    });
    const el = h.el();

    host.set(el, "breathe");

    expect(el.calls).toHaveLength(0);
    expect(host.size).toBe(1);
  });

  it("creates nothing while the media query says reduce", () => {
    const { h, host } = setup();
    h.env.changeMedia(true);
    const el = h.el();

    host.set(el, "breathe");

    expect(el.calls).toHaveLength(0);
  });

  it("cancels every running loop when reduced motion turns on, and starts them again when it turns off", () => {
    const { h, host } = setup();
    const els = [
      h.el(),
      h.el(),
    ];
    host.set(els[0] as FakeElement, "breathe");
    host.set(els[1] as FakeElement, "spin");

    h.env.changeMedia(true);
    expect(running(h)).toHaveLength(0);
    expect(host.size).toBe(2);

    h.env.changeMedia(false);
    expect(running(h)).toHaveLength(2);
    expect(running(h).every(a => a.startTime === LOOP_ORIGIN)).toBe(true);
    expect(els.every(el => el.calls.length === 2)).toBe(true);
  });

  it("follows <html data-motion> the same way", () => {
    const { h, host } = setup();
    const el = h.el();
    host.set(el, "breathe");

    h.env.setAttr("data-motion", "reduce");
    expect(running(h)).toHaveLength(0);

    h.env.setAttr("data-motion", null);
    expect(running(h)).toHaveLength(1);
  });

  it("cancels Ambient loops under --ambient-motion: paused, keeps Responsive ones, and restarts on running", () => {
    const { h, host } = setup();
    const [amb, spin, skel] = [
      h.el(),
      h.el(),
      h.el(),
    ];
    host.set(amb, "breathe");
    host.set(spin, "spin");
    host.set(skel, "skel");

    h.env.styleOf({ ...WORKSPACE, "--ambient-motion": "paused" });
    h.env.setAttr("data-dialect", "broadcast");

    expect(anims(amb)[0]?.cancelled).toBe(true);
    expect(anims(spin)[0]?.cancelled).toBe(false);
    expect(anims(skel)[0]?.cancelled).toBe(false);

    h.env.styleOf(WORKSPACE);
    h.env.setAttr("data-dialect", "showcase");

    expect(anims(amb)).toHaveLength(2);
    expect(anims(amb)[1]?.cancelled).toBe(false);
    expect(anims(spin)).toHaveLength(1);
    expect(anims(skel)).toHaveLength(1);
  });

  it("does not start a loop under --ambient-motion: paused", () => {
    const { h, host } = setup({
      tokens: { ...WORKSPACE, "--ambient-motion": "paused" },
    });
    const [amb, spin] = [
      h.el(),
      h.el(),
    ];

    host.set(amb, "glow");
    host.set(spin, "spin");

    expect(amb.calls).toHaveLength(0);
    expect(spin.calls).toHaveLength(1);
  });

  it("starts a restarted loop paused when its element is off-screen", () => {
    const { h, env, host } = setup();
    const el = h.el();
    host.set(el, "ring");
    env.setVisible(el, false);

    h.env.changeMedia(true);
    h.env.changeMedia(false);

    expect(anims(el)[1]?.playState).toBe("paused");
  });
});

describe("teardown", () => {
  it("holds no listener, observer or subscription after the last loop goes, and works again after", () => {
    const s = setup();
    const [a, b] = [
      s.h.el(),
      s.h.el(),
    ];
    s.host.set(a, "ring");
    s.host.set(b, "glow");
    expect(s.env.visibilityListeners).toBe(1);
    expect(s.env.observed).toBe(2);
    expect(s.subscribers).toBe(1);

    s.host.remove(a);
    expect(s.env.observed).toBe(1);
    expect(s.env.visibilityListeners).toBe(1);

    s.host.remove(b);
    expect(s.env.visibilityListeners).toBe(0);
    expect(s.env.observed).toBe(0);
    expect(s.subscribers).toBe(0);

    const c = s.h.el();
    s.host.set(c, "ring");
    expect(c.calls).toHaveLength(1);
    expect(s.env.visibilityListeners).toBe(1);
    expect(s.subscribers).toBe(1);
  });

  it("releases everything when the last loop is set to a falsy spec", () => {
    const s = setup();
    const el = s.h.el();
    s.host.set(el, "ring");

    s.host.set(el, null);

    expect(s.env.visibilityListeners).toBe(0);
    expect(s.env.observed).toBe(0);
    expect(s.subscribers).toBe(0);
  });

  it("keeps a gated element's observer and the subscription until it is removed", () => {
    const s = setup({
      cfg: { reduced: true },
    });
    const el = s.h.el();
    s.host.set(el, "ring");

    expect(s.env.observed).toBe(1);
    expect(s.subscribers).toBe(1);

    s.host.remove(el);
    expect(s.env.observed).toBe(0);
    expect(s.subscribers).toBe(0);
  });

  it("stops reacting to the tab and the engine once empty", () => {
    const s = setup();
    const el = s.h.el();
    s.host.set(el, "ring");
    s.host.remove(el);

    s.env.setHidden(true);
    s.h.env.changeMedia(true);
    s.h.env.changeMedia(false);

    expect(el.calls).toHaveLength(1);
  });
});

describe("edges", () => {
  it("attaches no listener for zero elements", () => {
    const s = setup();

    expect(s.host.size).toBe(0);
    expect(s.env.visibilityListeners).toBe(0);
    expect(s.env.observed).toBe(0);
    expect(s.subscribers).toBe(0);
  });

  it("handles one element", () => {
    const s = setup();
    s.host.set(s.h.el(), "stripes");

    expect(s.host.size).toBe(1);
    expect(s.env.visibilityListeners).toBe(1);
  });

  it("shares one origin and one visibility listener across 50 same-named loops", () => {
    const s = setup();
    const els = Array.from({ length: 50 }, () => s.h.el());

    els.forEach(el => s.host.set(el, "glow"));

    expect(s.host.size).toBe(50);
    expect(s.env.visibilityListeners).toBe(1);
    expect(s.subscribers).toBe(1);
    expect(s.env.observed).toBe(50);
    expect(els.every(el => anims(el)[0]?.startTime === LOOP_ORIGIN)).toBe(true);

    s.env.setHidden(true);
    expect(els.every(el => anims(el)[0]?.playState === "paused")).toBe(true);
  });

  it("ignores an unknown name without throwing, creating or keeping anything", () => {
    const s = setup();
    const el = s.h.el();

    expect(() => s.host.set(el, "nope" as never)).not.toThrow();
    expect(el.calls).toHaveLength(0);
    expect(s.host.size).toBe(0);
    expect(s.env.visibilityListeners).toBe(0);
  });

  it("keeps the running loop when a later spec has an unknown name", () => {
    const s = setup();
    const el = s.h.el();
    s.host.set(el, "ring");

    s.host.set(el, { name: "nope" as never });

    expect(anims(el)[0]?.cancelled).toBe(false);
    expect(s.host.size).toBe(1);
  });

  it("treats every falsy spec as no loop", () => {
    const s = setup();
    const el = s.h.el();

    const specs: LoopSpec[] = [false, null, undefined];
    specs.forEach(spec => s.host.set(el, spec));

    expect(el.calls).toHaveLength(0);
    expect(s.host.size).toBe(0);
  });
});

// A surface as a layout builds it: the engine holds the handoff's defaults until `start()`, and the tokens the page
// really has (`tokens`) are only read then. A `v-loop` of the first render sets its loop in a child's `mounted`, which
// runs before the layout's `onMounted` starts the surface (#335).
function firstRender(tokens: TokenMap, init: { reduced?: boolean } = {}) {
  const log: AnimateCall[] = [];
  const env = fakeEnv({ styles: tokens, reduced: init.reduced });
  const root = fakeElement({ log });
  const surface = createSurfaceMotion({
    root: () => root,
    layer: () => fakeLayer({ width: 1000, height: 800, log }),
    dialect: () => null,
    env,
    animations: () => log.map(c => c.animation) as unknown as Animation[],
  });
  stops.push(surface.dispose);
  const loopEnv = fakeLoopEnv();
  const host = createLoopHost(surface.m, loopEnv);
  return {
    surface,
    m: surface.m,
    env,
    loopEnv,
    host,
    el: () => fakeElement({ log }),
  };
}

// The animation an element is left running, and the keyframes it was built from.
function live(el: FakeElement) {
  const a = el.animations.filter(x => !x.cancelled);
  const i = el.animations.indexOf(a[0] as FakeAnimation);
  return {
    count: a.length,
    anim: a[0],
    keyframes: el.calls[i]?.keyframes,
  };
}

// `breathe` at a gain: the one recipe here whose keyframes carry the amplitude.
function breatheAt(gain: number): Keyframe[] {
  const a = 0.04 * gain;
  return [
    { transform: "scale(1,1)" },
    { transform: `scale(${1 + a},${1 - a})` },
    { transform: `scale(${1 - a / 2},${1 + a * 0.75})` },
    { transform: "scale(1,1)" },
  ];
}

describe("a loop of the first render", () => {
  it("runs at the surface's own gain and rate once the surface has started", () => {
    const s = firstRender(SHOWCASE);
    const el = s.el();
    s.host.set(el, "breathe");

    s.surface.start();

    const l = live(el);
    expect(l.count).toBe(1);
    expect(l.keyframes).toEqual(breatheAt(1.6));
    expect(l.anim?.playbackRate).toBe(1.4);
    expect(l.anim?.startTime).toBe(LOOP_ORIGIN);
  });

  it("leaves no Ambient loop running under --ambient-motion: paused, and keeps a Responsive one", () => {
    const s = firstRender({ ...WORKSPACE, "--ambient-motion": "paused" });
    const [amb, spin] = [
      s.el(),
      s.el(),
    ];
    s.host.set(amb, "breathe");
    s.host.set(spin, "spin");
    expect(live(amb).count).toBe(1); // the engine does not know yet

    s.surface.start();

    expect(live(amb).count).toBe(0);
    expect(live(spin).count).toBe(1);
  });

  it("brings the Ambient loop back when --ambient-motion runs again", () => {
    const s = firstRender({ ...WORKSPACE, "--ambient-motion": "paused" });
    const el = s.el();
    s.host.set(el, "breathe");
    s.surface.start();

    s.env.styleOf(WORKSPACE);
    s.env.setAttr("data-dialect", "broadcast");

    expect(live(el).count).toBe(1);
  });

  it("creates no loop at all under reduced motion", () => {
    const s = firstRender(SHOWCASE, {
      reduced: true,
    });
    const [amb, spin] = [
      s.el(),
      s.el(),
    ];

    s.host.set(amb, "breathe");
    s.host.set(spin, "spin");
    s.surface.start();

    expect(amb.calls).toHaveLength(0);
    expect(spin.calls).toHaveLength(0);
  });

  it("keeps the same animation when the first refresh changes nothing the loop was built from", () => {
    const s = firstRender(WORKSPACE);
    const [gain, still] = [
      s.el(),
      s.el(),
    ];
    s.host.set(gain, "breathe");
    s.host.set(still, "ring");
    const before = [gain.animations[0], still.animations[0]];

    s.surface.start();

    expect(gain.animations).toEqual([before[0]]);
    expect(still.animations).toEqual([before[1]]);
    expect(live(gain).anim).toBe(before[0]);
    expect(live(still).anim).toBe(before[1]);
  });

  it("keeps the same animation through a later refresh that changes nothing", () => {
    const s = firstRender(WORKSPACE);
    const el = s.el();
    s.host.set(el, "breathe");
    s.surface.start();
    const a = live(el).anim;

    s.env.setAttr("data-theme", "dark");

    expect(el.animations).toHaveLength(1);
    expect(live(el).anim).toBe(a);
  });

  it("shares one startTime with a same-named loop that starts after the surface", () => {
    const s = firstRender(SHOWCASE);
    const [early, late] = [
      s.el(),
      s.el(),
    ];
    s.host.set(early, "breathe");
    s.surface.start();

    s.host.set(late, "breathe");

    expect(live(early).anim?.startTime).toBe(LOOP_ORIGIN);
    expect(live(late).anim?.startTime).toBe(live(early).anim?.startTime);
    expect(live(late).keyframes).toEqual(live(early).keyframes);
    expect(live(late).anim?.playbackRate).toBe(live(early).anim?.playbackRate);
  });

  it("stays paused through the surface's start while the tab is hidden, and resumes aligned", () => {
    const s = firstRender(SHOWCASE);
    s.loopEnv.setHidden(true);
    const el = s.el();
    s.host.set(el, "breathe");

    s.surface.start();
    expect(live(el).count).toBe(1);
    expect(live(el).anim?.playState).toBe("paused");
    expect(live(el).keyframes).toEqual(breatheAt(1.6));

    (live(el).anim as FakeAnimation).startTime = 4000;
    s.loopEnv.setHidden(false);
    expect(live(el).anim?.playState).toBe("running");
    expect(live(el).anim?.startTime).toBe(LOOP_ORIGIN);
  });

  it("stays paused through the surface's start while the element is off-screen, and resumes aligned", () => {
    const s = firstRender(SHOWCASE);
    const el = s.el();
    s.host.set(el, "breathe");
    s.loopEnv.setVisible(el, false);

    s.surface.start();
    expect(live(el).anim?.playState).toBe("paused");

    (live(el).anim as FakeAnimation).startTime = 4000;
    s.loopEnv.setVisible(el, true);
    expect(live(el).anim?.playState).toBe("running");
    expect(live(el).anim?.startTime).toBe(LOOP_ORIGIN);
  });

  it("holds no extra listener or subscription once the first-render loop is removed", () => {
    const s = firstRender(SHOWCASE);
    const el = s.el();
    s.host.set(el, "breathe");
    s.surface.start();

    s.host.remove(el);

    expect(s.loopEnv.visibilityListeners).toBe(0);
    expect(s.loopEnv.observed).toBe(0);
    expect(s.env.mediaListeners).toBe(1); // the surface's own, until it is disposed
  });
});

describe("a dialect change under a running loop", () => {
  it("rebuilds the loop at the new gain, in phase, and again on the way back", () => {
    const s = firstRender(WORKSPACE);
    const el = s.el();
    s.host.set(el, "breathe");
    s.surface.start();
    expect(live(el).keyframes).toEqual(breatheAt(1));

    s.env.styleOf(SHOWCASE);
    s.env.setAttr("data-dialect", "showcase");

    expect(el.animations).toHaveLength(2);
    expect(el.animations[0]?.cancelled).toBe(true);
    expect(live(el).keyframes).toEqual(breatheAt(1.6));
    expect(live(el).anim?.playbackRate).toBe(1.4);
    expect(live(el).anim?.startTime).toBe(LOOP_ORIGIN);

    s.env.styleOf(WORKSPACE);
    s.env.setAttr("data-dialect", null);

    expect(live(el).keyframes).toEqual(breatheAt(1));
    expect(live(el).anim?.playbackRate).toBe(1);
  });

  it("keeps a paused loop paused through the rebuild, and resumes it aligned", () => {
    const s = firstRender(WORKSPACE);
    const el = s.el();
    s.host.set(el, "breathe");
    s.surface.start();
    s.loopEnv.setVisible(el, false);

    s.env.styleOf(SHOWCASE);
    s.env.setAttr("data-dialect", "showcase");
    expect(live(el).keyframes).toEqual(breatheAt(1.6));
    expect(live(el).anim?.playState).toBe("paused");

    s.loopEnv.setVisible(el, true);
    expect(live(el).anim?.playState).toBe("running");
    expect(live(el).anim?.startTime).toBe(LOOP_ORIGIN);
  });

  it("leaves a loop whose keyframes do not depend on the dialect running as it is", () => {
    const s = firstRender(WORKSPACE);
    const el = s.el();
    s.host.set(el, "ring");
    s.surface.start();
    const a = live(el).anim;

    s.env.styleOf(SHOWCASE);
    s.env.setAttr("data-dialect", "showcase");

    expect(el.animations).toHaveLength(1);
    expect(live(el).anim).toBe(a);
    expect(a?.playbackRate).toBe(1.4);
  });
});
