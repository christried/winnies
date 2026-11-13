import type { WinniesMotion } from "../utils/motion/types";
import { describe, expect, it, vi } from "vitest";
import { defineComponent, h, ref } from "vue";
import { fakeElement, motionHarness } from "../../tests/support/fake-motion";
import { render } from "../../tests/support/ssr-render";
import { createTransitionHooks, useMotionTransition } from "./use-motion-transition";
import { provideWinniesMotion } from "./use-winnies-motion";

// The helper settles after a promise chain, so a test lets the microtasks and one macrotask run after it ends or
// cancels an animation.
const flush = () => new Promise(resolve => setTimeout(resolve, 0));

// A menu with four items: `menuIn` animates the panel and each child, the children delayed, so the last child ends
// after the panel.
function menu(harness: ReturnType<typeof motionHarness>) {
  return harness.el({
    children: [
      harness.el(),
      harness.el(),
      harness.el(),
      harness.el(),
    ],
  });
}

describe("transition hooks", () => {
  it("waits for every animation of an enter recipe, not only the panel", async () => {
    const h = motionHarness();
    const hooks = createTransitionHooks(h.m, {
      enter: (m, el) => m.menuIn(el),
    });
    const el = menu(h);
    const done = vi.fn();

    hooks.onEnter(el, done);

    expect(h.log).toHaveLength(5);
    expect(done).not.toHaveBeenCalled();
    h.log[0]!.animation.finish();
    await flush();
    expect(done).not.toHaveBeenCalled();
    h.log.slice(1).forEach(c => c.animation.finish());
    await flush();
    expect(done).toHaveBeenCalledTimes(1);
  });

  it("finds the animations of a recipe that animates two elements", async () => {
    const h = motionHarness();
    const scrim = h.el();
    const card = h.el();
    const hooks = createTransitionHooks(h.m, {
      enter: m => m.modalIn(scrim, card),
    });
    const root = h.el({
      children: [scrim, card],
    });
    const done = vi.fn();

    hooks.onEnter(root, done);

    // The recipe animated the root's children, not the root itself.
    expect(h.log).toHaveLength(2);
    h.log[0]!.animation.finish();
    await flush();
    expect(done).not.toHaveBeenCalled();
    h.log[1]!.animation.finish();
    await flush();
    expect(done).toHaveBeenCalledTimes(1);
  });

  it("calls done once a leave recipe's animation finishes", async () => {
    const h = motionHarness();
    const hooks = createTransitionHooks(h.m, {
      leave: (m, el) => m.menuOut(el),
    });
    const el = h.el();
    const done = vi.fn();

    hooks.onLeave(el, done);
    expect(done).not.toHaveBeenCalled();
    h.log[0]!.animation.finish();
    await flush();

    expect(done).toHaveBeenCalledTimes(1);
  });

  it("calls done at once under reduced motion, and animates nothing", () => {
    const h = motionHarness({
      cfg: {
        reduced: true,
      },
    });
    const hooks = createTransitionHooks(h.m, {
      enter: (m, el) => m.menuIn(el),
      leave: (m, el) => m.menuOut(el),
    });
    const enterDone = vi.fn();
    const leaveDone = vi.fn();

    hooks.onEnter(menu(h), enterDone);
    hooks.onLeave(h.el(), leaveDone);

    // Synchronously: Vue would otherwise hold the element for a frame that never comes.
    expect(enterDone).toHaveBeenCalledTimes(1);
    expect(leaveDone).toHaveBeenCalledTimes(1);
    expect(h.log).toHaveLength(0);
  });

  it("calls done at once when the tier is off, and when there is no recipe", () => {
    const h = motionHarness();
    h.setCfg({
      resp: false,
    });
    const tierOff = createTransitionHooks(h.m, {
      enter: (m, el) => m.menuIn(el),
      leave: (m, el) => m.menuOut(el),
    });
    const noRecipe = createTransitionHooks(h.m, {});
    const done = vi.fn();

    tierOff.onEnter(menu(h), done);
    tierOff.onLeave(h.el(), done);
    noRecipe.onEnter(h.el(), done);
    noRecipe.onLeave(h.el(), done);

    expect(done).toHaveBeenCalledTimes(4);
    expect(h.log).toHaveLength(0);
  });

  it("cancels the enter and calls done once when a leave comes during it, in Vue's order", async () => {
    const h = motionHarness();
    const hooks = createTransitionHooks(h.m, {
      enter: (m, el) => m.menuIn(el),
      leave: (m, el) => m.menuOut(el),
    });
    const el = menu(h);
    const doneA = vi.fn();
    const doneB = vi.fn();

    hooks.onEnter(el, doneA);
    const enterAnimations = h.log.map(c => c.animation);
    hooks.onEnterCancelled(el);
    await flush();

    expect(enterAnimations).toHaveLength(5);
    expect(enterAnimations.every(a => a.cancelled)).toBe(true);
    expect(doneA).toHaveBeenCalledTimes(1);

    hooks.onLeave(el, doneB);
    h.log[h.log.length - 1]!.animation.finish();
    await flush();

    expect(doneB).toHaveBeenCalledTimes(1);
    expect(doneA).toHaveBeenCalledTimes(1);
  });

  it("cancels the enter when a leave starts and no cancel hook ran", async () => {
    const h = motionHarness();
    const hooks = createTransitionHooks(h.m, {
      enter: (m, el) => m.menuIn(el),
      leave: (m, el) => m.menuOut(el),
    });
    const el = menu(h);
    const doneA = vi.fn();

    hooks.onEnter(el, doneA);
    const enterAnimations = h.log.map(c => c.animation);
    hooks.onLeave(el, vi.fn());
    await flush();

    expect(enterAnimations.every(a => a.cancelled)).toBe(true);
    expect(doneA).toHaveBeenCalledTimes(1);
  });

  it("releases the held end state when an enter cancels a leave, and the next enter runs normally", async () => {
    const h = motionHarness();
    const hooks = createTransitionHooks(h.m, {
      enter: (m, el) => m.menuIn(el),
      leave: (m, el) => m.menuOut(el),
    });
    const el = h.el();
    const doneL = vi.fn();
    const doneE = vi.fn();

    hooks.onLeave(el, doneL);
    const leaveAnimation = h.log[0]!.animation;
    hooks.onLeaveCancelled(el);
    await flush();

    expect(leaveAnimation.cancelled).toBe(true);
    // The leave's `fill: "forwards"` would otherwise keep the element invisible.
    expect(el.getAnimations()).toHaveLength(0);
    expect(doneL).toHaveBeenCalledTimes(1);

    hooks.onEnter(el, doneE);
    h.log[h.log.length - 1]!.animation.finish();
    await flush();
    expect(doneE).toHaveBeenCalledTimes(1);
  });

  it("releases a finished leave's held end state when the element enters again (v-show)", async () => {
    const h = motionHarness();
    const hooks = createTransitionHooks(h.m, {
      enter: (m, el) => m.menuIn(el),
      leave: (m, el) => m.menuOut(el),
    });
    const el = h.el();

    hooks.onLeave(el, vi.fn());
    const leaveAnimation = h.log[0]!.animation;
    leaveAnimation.finish();
    await flush();
    // Held: the element stays invisible until something cancels this.
    expect(el.getAnimations()).toContain(leaveAnimation);

    // v-show runs no cancel hook for a leave that has completed.
    hooks.onEnter(el, vi.fn());

    expect(leaveAnimation.cancelled).toBe(true);
  });

  it("calls done once when something else cancels the animations", async () => {
    // The instance cancels every animation when motion turns to reduce.
    const h = motionHarness();
    const hooks = createTransitionHooks(h.m, {
      enter: (m, el) => m.menuIn(el),
    });
    const done = vi.fn();

    hooks.onEnter(menu(h), done);
    h.log.forEach(c => c.animation.cancel());
    await flush();

    expect(done).toHaveBeenCalledTimes(1);
  });

  it("calls done and rethrows when a recipe throws", () => {
    const h = motionHarness();
    const hooks = createTransitionHooks(h.m, {
      leave: () => {
        throw new Error("recipe failed");
      },
    });
    const done = vi.fn();

    // A leave that never calls done would leave the element in the DOM for good.
    expect(() => hooks.onLeave(h.el(), done)).toThrow("recipe failed");
    expect(done).toHaveBeenCalledTimes(1);
  });

  it("declares both async hooks with two parameters", () => {
    const hooks = createTransitionHooks(motionHarness().m, {});

    // Vue's callAsyncHook calls done() itself after a hook whose length is 1 or less, so the animation would not be
    // waited for.
    expect(hooks.onEnter.length).toBe(2);
    expect(hooks.onLeave.length).toBe(2);
  });

  it("plays the recipe on the instance of the surface the component renders under", async () => {
    let layoutMotion: WinniesMotion | undefined;
    let seen: WinniesMotion | undefined;
    const hooks: { current?: ReturnType<typeof useMotionTransition> } = {};
    const layout = defineComponent({
      setup(_props, { slots }) {
        layoutMotion = provideWinniesMotion({
          root: ref(null),
        });
        return () => h("div", slots.default?.());
      },
    });
    const child = defineComponent({
      setup() {
        hooks.current = useMotionTransition({
          enter: (m) => {
            seen = m;
          },
        });
        return () => h("span");
      },
    });

    await render(defineComponent({
      render: () => h(layout, () => h(child)),
    }));
    hooks.current!.onEnter(fakeElement(), vi.fn());

    expect(seen).toBeDefined();
    expect(seen).toBe(layoutMotion);
  });
});
