import type { LoopEnv } from "../../app/utils/motion/loop-sync";
// A fake browser for the loop host (#301): a tab that can be hidden, and an observer a test can tell that an element
// scrolled out of view. It sits beside `fake-motion.ts`, whose fake elements and animations it is meant to be used with.

/** The fake `LoopEnv`, and the switches and counters a test reads. */
export interface FakeLoopEnv extends LoopEnv {
  /** Hides or shows the tab and tells the visibility listeners. */
  setHidden: (hidden: boolean) => void;
  /** Tells one element's observer that it came into view or left it. */
  setVisible: (el: HTMLElement, visible: boolean) => void;
  /** Visibility listeners attached right now. */
  readonly visibilityListeners: number;
  /** Elements observed right now. */
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
  const observers = new Map<HTMLElement, (visible: boolean) => void>();
  return {
    hidden: () => hidden,
    onVisibilityChange: (cb) => {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },
    observe: (el, cb) => {
      observers.set(el, cb);
      cb(true);
      return () => {
        observers.delete(el);
      };
    },
    setHidden: (value) => {
      hidden = value;
      [...listeners].forEach(cb => cb());
    },
    setVisible: (el, visible) => {
      observers.get(el)?.(visible);
    },
    get visibilityListeners() {
      return listeners.size;
    },
    get observed() {
      return observers.size;
    },
  };
}
