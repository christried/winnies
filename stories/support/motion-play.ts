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

/**
 * What a frame is, in milliseconds, for a check of two animations that meet. A rollover leaves 5% of a 250 ms beat (12.5 ms)
 * and an animation starts on the next frame (16.7 ms), so correct timing can overlap by a few milliseconds.
 */
export const ONE_FRAME = 17;

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

/** The animations that are running or paused: not idle, not finished. */
export const live = (): Animation[] => animations().filter(a => a.playState === "running" || a.playState === "paused");

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
