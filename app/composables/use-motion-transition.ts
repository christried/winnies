import type { WinniesMotion } from "../utils/motion/types";
// The hooks that turn an engine recipe into a Vue `<Transition :css="false">` (#302). The core, `createTransitionHooks`,
// takes the engine as an argument so the node test drives it over the recorder; `useMotionTransition` only injects the
// surface's instance. Imports are explicit and relative, as in `use-winnies-motion.ts`, because the unit test runs in
// node without Nuxt. Nothing at module level holds state: a module-level map would be shared between server requests.
import { isPlainAnimation } from "../utils/motion/surface";
import { useWinniesMotion } from "./use-winnies-motion";

/** What an enter or leave plays. It gets the engine and the transition's element; the recipe's return value is ignored. */
export type TransitionRecipe = (m: WinniesMotion, el: HTMLElement) => unknown;

/** The recipes of one transition; a missing one plays nothing and the transition ends at once. */
export interface TransitionRecipes {
  enter?: TransitionRecipe;
  leave?: TransitionRecipe;
}

/** The hooks of `<Transition :css="false">`, also usable as `@enter="hooks.onEnter"` and so on. */
export interface TransitionHooks {
  onEnter: (el: Element, done: () => void) => void;
  onLeave: (el: Element, done: () => void) => void;
  onEnterCancelled: (el: Element) => void;
  onLeaveCancelled: (el: Element) => void;
}

/** What the helper started on an element: stopping it cancels its animations and ends its transition. */
interface Run {
  stop: () => void;
}

/**
 * Turns an enter recipe and a leave recipe into the hooks of a `<Transition :css="false">`. Vue waits for `done`, which
 * is called once every animation the recipe created has ended or been cancelled, or at once when it created none
 * (reduced motion, the tier is off, no recipe). Starting a transition on an element first stops the helper's previous
 * one there, which also releases the held end state (`fill: "forwards"`) of a finished leave; without that a `v-show`
 * that shows the element again would end invisible.
 *
 * @param m the surface's motion instance
 * @param recipes what to play on enter and on leave
 * @returns the four hooks
 */
export function createTransitionHooks(m: WinniesMotion, recipes: TransitionRecipes): TransitionHooks {
  // An entry stays after its run settles: a finished leave still holds its end state until something cancels it.
  const runs = new WeakMap<Element, Run>();

  function start(el: Element, recipe: TransitionRecipe | undefined, done: () => void) {
    runs.get(el)?.stop();

    let settled = false;
    const settle = () => {
      if (settled)
        return;
      settled = true;
      done();
    };

    // The engine's in-recipes return nothing and may animate several elements (a menu's children, a modal's scrim and
    // card), so the recipe's animations are what appeared in the element's subtree while it ran.
    const before = new Set(plainAnimations(el));
    try {
      recipe?.(m, el as HTMLElement);
    }
    catch (error) {
      // A leave that never calls `done` would leave the element in the DOM.
      settle();
      throw error;
    }
    const animations = plainAnimations(el).filter(a => !before.has(a));

    runs.set(el, {
      stop: () => {
        animations.forEach(a => a.cancel());
        settle();
      },
    });

    if (!animations.length) {
      settle();
      return;
    }
    // Every animation, not only the longest-looking one. A cancellation from elsewhere (the instance cancels
    // everything when motion turns to reduce) rejects `finished`, so `allSettled`, and it ends the transition too.
    void Promise.allSettled(animations.map(a => a.finished)).then(settle);
  }

  // Declared with two parameters on purpose: Vue's `callAsyncHook` calls `done()` itself after a hook whose `length`
  // is 1 or less, and the animation would not be waited for.
  return {
    onEnter: (el, done) => start(el, recipes.enter, done),
    onLeave: (el, done) => start(el, recipes.leave, done),
    onEnterCancelled: el => runs.get(el)?.stop(),
    onLeaveCancelled: el => runs.get(el)?.stop(),
  };
}

function plainAnimations(el: Element): Animation[] {
  return el.getAnimations({
    subtree: true,
  }).filter(isPlainAnimation);
}

/**
 * The transition hooks of the surface a component renders under. The engine decides on reduced motion, so the recipes
 * are always called.
 *
 * @example
 * const hooks = useMotionTransition({
 *   enter: (m, el) => m.menuIn(el),
 *   leave: (m, el) => m.menuOut(el),
 * });
 * // <Transition :css="false" v-bind="hooks"><div v-if="open" /></Transition>
 * @param recipes what to play on enter and on leave
 * @returns the four hooks
 */
export function useMotionTransition(recipes: TransitionRecipes): TransitionHooks {
  return createTransitionHooks(useWinniesMotion(), recipes);
}
