// Helpers for the play functions of the motion stories (#306). `expect`, `waitFor` and `userEvent` come from
// "storybook/test", in the play function itself.
//
// A play function runs in every variant (stories/../.storybook/visual-variants.ts), so it never branches on the
// toolbar's value: it takes control with `withMotion` and `withDialect`, which also covers `workspace-light-reduced`,
// the variant that starts with `data-motion="reduce"`.

/**
 * Waits for animation frames.
 *
 * @param n how many, default 2
 * @returns when the last has run
 */
export async function frames(n = 2): Promise<void> {
  for (let i = 0; i < n; i++)
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
}

/** How much of a beat a tick may take: the engine clamps every tick, its delay included, to this share (`m.tick`). */
const TICK_SHARE = 0.95;

/**
 * What is wrong with the tick animations a sampler saw, in words; an empty list is a clean run. It asserts what a
 * measure of the overlap between two ticks stood for, without its dependence on the scheduler: a beat's timer can
 * come late by whole frames under load, which moves a tick's start and so the overlap (a late tick plus an on-time one
 * left 20.8 ms against an allowance of 17), but never what the engine hands `animate()`. Per slot: every tick ends
 * within 95% of the beat measured from its own start (delay and duration, the #337 fault), and no two ticks start less
 * than a quarter of a beat apart (a beat ticked the slot twice; real beats are a whole interval apart, give or take
 * a few frames of jitter).
 *
 * @param animations the animations seen on each slot, by the slot's `pos`
 * @param interval the beat in milliseconds, 1000 / the story's rate
 * @returns one sentence per fault, naming the slot; empty when there is none
 */
export function tickFaults(animations: Map<number, Set<Animation>>, interval: number): string[] {
  const faults: string[] = [];
  for (const [slot, set] of animations) {
    // A null start time is an animation a Replay cancelled, or one that never started: nothing to measure.
    const started = [...set]
      .filter(a => a.startTime !== null)
      .toSorted((a, b) => Number(a.startTime) - Number(b.startTime));
    for (const a of started) {
      const end = Number(a.effect!.getComputedTiming().endTime);
      if (end > interval * TICK_SHARE + 0.01)
        faults.push(`slot ${slot}: a tick lasts ${end.toFixed(1)} ms from its start, past ${TICK_SHARE * 100}% of the ${interval} ms beat`);
    }
    started.slice(0, -1).forEach((a, i) => {
      const gap = Number(started[i + 1]!.startTime) - Number(a.startTime);
      if (gap < interval / 4)
        faults.push(`slot ${slot}: two ticks start ${gap.toFixed(1)} ms apart, so one beat ticked it twice (a beat is ${interval} ms)`);
    });
  }
  return faults;
}

/** Sets or removes an attribute, runs `fn`, and puts the attribute back as it was, also when `fn` throws. */
async function withAttribute(el: HTMLElement, name: string, value: string | null, fn: () => Promise<void>): Promise<void> {
  const before = el.getAttribute(name);
  const set = (v: string | null) => {
    if (v === null)
      el.removeAttribute(name);
    else
      el.setAttribute(name, v);
  };
  set(value);
  try {
    // The engine reads the attribute live, and its observer reacts on a microtask: two frames cover both.
    await frames();
    await fn();
  }
  finally {
    set(before);
    await frames();
  }
}

/**
 * Runs `fn` with `<html data-motion>` set to a mode: "full" removes the attribute, as the toolbar's decorator does.
 * The previous value is restored in `finally`.
 *
 * @param mode the motion preference to run under
 * @param fn the check
 * @returns when the check has run and the preference is back
 */
export function withMotion(mode: "full" | "reduce", fn: () => Promise<void>): Promise<void> {
  return withAttribute(document.documentElement, "data-motion", mode === "reduce"
    ? "reduce"
    : null, fn);
}

/**
 * Runs `fn` with `<body data-dialect>` set: null removes the attribute, which is Workspace. The previous value is
 * restored in `finally`.
 *
 * @param value the dialect to run under
 * @param fn the check
 * @returns when the check has run and the dialect is back
 */
export function withDialect(value: "broadcast" | "showcase" | null, fn: () => Promise<void>): Promise<void> {
  return withAttribute(document.body, "data-dialect", value, fn);
}

/** Every animation in the document, CSS transitions included. */
export const animations = (): Animation[] => document.getAnimations();

/** The animations that are running: not paused, not idle, not finished. A paused animation is not moving. */
export const live = (): Animation[] => animations().filter(a => a.playState === "running");

/** True for an animation that repeats forever, in any play state; false for one that ends by itself. */
export const isLoop = (a: Animation): boolean => a.effect?.getComputedTiming().iterations === Infinity;

/** True for a loop that is running now. A paused loop is still a loop (`isLoop`), and is not moving. */
export const isRunningLoop = (a: Animation): boolean => isLoop(a) && a.playState === "running";

/**
 * The loops running on an element and below it, or in the whole document: infinite, running now, and still running two
 * frames later. `v-loop`'s host pauses a loop when an observer reports its frame off-screen, and the report comes after a
 * frame, so a read taken in the frame the loop was made passes on a loop that is about to be paused (#355). The same
 * animation objects come back, so a story can read their timing. A loop made anew between the two reads (a dialect switch
 * rebuilds it) is not returned: retry with `waitFor`, which takes an async callback.
 *
 * @param root an element (its own animations and its descendants') or the document, by default
 * @returns the running loops, empty when there is none
 */
export async function runningLoops(root: Document | Element = document): Promise<Animation[]> {
  // Document.getAnimations() takes no options; an Element's needs `subtree` to include its children.
  const under = () => root instanceof Document
    ? root.getAnimations()
    : root.getAnimations({ subtree: true });
  const first = under().filter(isRunningLoop);
  await frames();
  const later = new Set(under().filter(isRunningLoop));
  return first.filter(a => later.has(a));
}

/**
 * The surface's particle layer.
 *
 * @returns the element
 * @throws {Error} when no layer is rendered
 */
export function layerEl(): HTMLElement {
  const el = document.querySelector<HTMLElement>("[data-particle-layer]");
  if (!el)
    throw new Error("No [data-particle-layer] in the document: the story is not decorated with withMotionSurface.");
  return el;
}

/** How many particles the layer holds now. */
export const particleCount = (): number => layerEl().children.length;

/**
 * Clicks a Replay button.
 *
 * @param canvasElement the story's canvas
 * @param id the button's `data-replay`, "all" (the group button) by default
 * @returns when the click has been dispatched
 * @throws {Error} when there is no such button
 */
export async function clickReplay(canvasElement: HTMLElement, id = "all"): Promise<void> {
  const button = canvasElement.querySelector<HTMLButtonElement>(`button[data-replay="${id}"]`);
  if (!button)
    throw new Error(`No button[data-replay="${id}"] in the story.`);
  button.click();
}
