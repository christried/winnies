import type { LoopEnv } from "../../app/utils/motion/loop-sync";
// A fake browser for the loop host (#301): a tab that can be hidden, and an observer a test can tell that an element
// scrolled out of view. It sits beside `fake-motion.ts`, whose fake elements and animations it is meant to be used with.

/** The fake `LoopEnv`, and the switches and counters a test reads. */
export interface FakeLoopEnv extends LoopEnv {
  /** Hides or shows the tab and tells the visibility listeners. */
  setHidden: (hidden: boolean) => void;
  /** Tells every observer of one element that it came into view or left it. Nothing happens for an element nobody observes. */
  setVisible: (el: HTMLElement, visible: boolean) => void;
  /** Whether anyone observes this element right now. */
  isObserved: (el: HTMLElement) => boolean;
  /** Visibility listeners attached right now. */
  readonly visibilityListeners: number;
  /** Observations right now: two loops under one parent are two. */
  readonly observed: number;
}

/**
 * Builds the fake loop environment: the tab is visible, and an observed element reports itself visible once, when it
 * is registered, as the browser's IntersectionObserver reports its initial state.
 *
 * @returns the environment
 */
export function fakeLoopEnv(): FakeLoopEnv {
  let hidden = false;
  const listeners = new Set<() => void>();
  // One element can be observed by several loops (they share a parent), each with its own callback.
  const observers = new Map<HTMLElement, Set<(visible: boolean) => void>>();
  return {
    hidden: () => hidden,
    onVisibilityChange: (cb) => {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },
    observe: (el, cb) => {
      const watchers = observers.get(el) ?? new Set();
      watchers.add(cb);
      observers.set(el, watchers);
      cb(true);
      return () => {
        watchers.delete(cb);
        if (!watchers.size)
          observers.delete(el);
      };
    },
    setHidden: (value) => {
      hidden = value;
      [...listeners].forEach(cb => cb());
    },
    setVisible: (el, visible) => {
      [
        ...(observers.get(el) ?? []),
      ].forEach(cb => cb(visible));
    },
    isObserved: el => observers.has(el),
    get visibilityListeners() {
      return listeners.size;
    },
    get observed() {
      return [
        ...observers.values(),
      ].reduce((n, watchers) => n + watchers.size, 0);
    },
  };
}
