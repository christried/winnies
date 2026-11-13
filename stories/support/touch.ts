// What a phone does with a hover (#349, the R2 review's P5). A tap puts `:hover` on a button and leaves it there until the
// next tap, so a hover look that is not guarded by `@media (hover: hover)` sticks. Chromium's touch emulation is what
// turns `(hover: hover)` off, as a phone's browser does; the real mouse then still sets `:hover`, which is the point.
import { expect, waitFor } from "storybook/test";
import { settled } from "./component-checks";
import { withDialect, withMotion } from "./motion-play";
import { realPointer } from "./real-pointer";

/** The look a hover changes on the controls of the kit: the lift, the lip, the colours. */
function lookOf(el: HTMLElement) {
  const style = getComputedStyle(el);
  return [
    style.translate,
    style.boxShadow,
    style.color,
    style.backgroundColor,
  ].join(" | ");
}

/**
 * Expects a hover to change an element on a device that can hover, and to change nothing where it cannot. Under the
 * Workspace dialect and full motion, so the lift exists to be seen. Runs only in the Vitest runner, which has a real
 * mouse and the browser's protocol: Storybook's own UI can drive neither.
 *
 * @param el an idle, enabled control, not forced into its hover look with `is-hover`
 */
export async function expectHoverOnlyWhereTheDeviceHovers(el: HTMLElement) {
  const pointer = await realPointer();
  if (!pointer)
    return;
  const { cdp } = await import("vitest/browser");
  const hover = async () => {
    await pointer.hover(el);
    await waitFor(() => expect(el.matches(":hover")).toBe(true));
    await settled();
  };
  const leave = async () => {
    await pointer.unhover(el);
    await waitFor(() => expect(el.matches(":hover")).toBe(false));
    await settled();
  };

  await withMotion("full", () => withDialect(null, async () => {
    await settled();
    const rest = lookOf(el);

    // A device that can hover: the look changes, so the check below is about the media query and not about a dead hover.
    await hover();
    expect(lookOf(el)).not.toBe(rest);
    await leave();
    expect(lookOf(el)).toBe(rest);

    // A phone: `(hover: hover)` is false, the mouse is still over the element, and nothing changes.
    // The provider types that name `send` are not loaded in the stories' tsconfig.
    const session = cdp() as unknown as { send: (method: string, params: object) => Promise<unknown> };
    await session.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 1 });
    try {
      expect(matchMedia("(hover: hover)").matches).toBe(false);
      await hover();
      expect(lookOf(el)).toBe(rest);
    }
    finally {
      await session.send("Emulation.setTouchEmulationEnabled", { enabled: false });
      await leave();
    }
  }));
}
