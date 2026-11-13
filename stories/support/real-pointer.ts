// A real pointer for the play functions of the component stories (#312). The `userEvent` of "storybook/test" only
// dispatches events, so `:hover` never matches: a hover ring cannot be asserted with it. In the Vitest runner the
// browser's own `userEvent` moves a real mouse, and that is what this loads. It is imported on demand because the module
// exists only inside Vitest: Storybook's own UI has no `vitest/browser`.
import type { userEvent as BrowserUserEvent } from "vitest/browser";

/**
 * The browser's pointer, when the story runs in the Vitest runner.
 *
 * @returns `hover` and `unhover` that move a real mouse, or null in Storybook's UI, where `:hover` cannot be driven
 */
export async function realPointer(): Promise<Pick<typeof BrowserUserEvent, "hover" | "unhover"> | null> {
  try {
    const { userEvent } = await import("vitest/browser");
    return userEvent;
  }
  catch {
    return null;
  }
}
