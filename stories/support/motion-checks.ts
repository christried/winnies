// Checks a play function shares across stories (#305). Like motion-play.ts it takes `expect` from "storybook/test",
// and it never branches on the toolbar's value: it takes control of `<html data-motion>` itself.
import { expect } from "storybook/test";
import { frames, withMotion } from "./motion-play";

/**
 * Asserts that a story is quiet under reduced motion: with `<html data-motion="reduce">`, every Replay button of the
 * story is clicked (the group button `data-replay="all"` first, then the others in document order), and after each one
 * `document.getAnimations()` is empty and so is the particle layer, when the story has one. Any story can call it, not
 * only a motion story: it needs only buttons with a `data-replay` attribute that start what the story animates.
 *
 * It asserts nothing before the first click. An animation that an earlier full-motion step left behind, a finished one
 * that holds its end state with `fill: "forwards"` for instance, is still listed until something cancels it. So the
 * story's group Replay must reset every element it animates before it plays, and a section's Replay its own. Click a
 * button and never move a pointer: a hover transition would be an animation too.
 *
 * @example
 * await step("a replay creates no animation when reduced", () => expectQuietWhenReduced(canvasElement));
 * @param canvasElement the story's canvas, where the buttons are
 * @returns when every button has been clicked and checked and `data-motion` is back as it was
 * @throws {Error} when the story has no `button[data-replay]`, which would make the check pass on nothing
 */
export function expectQuietWhenReduced(canvasElement: HTMLElement): Promise<void> {
  return withMotion("reduce", async () => {
    const buttons = [
      ...canvasElement.querySelectorAll<HTMLButtonElement>("button[data-replay]"),
    ];
    if (!buttons.length)
      throw new Error("No button[data-replay] in the story: nothing to replay, so nothing is checked.");
    // The group button first: it resets every element of the story, so the checks after it start clean. The sort is
    // stable, so the others keep their document order.
    buttons.sort((a, b) => Number(b.dataset.replay === "all") - Number(a.dataset.replay === "all"));
    for (const button of buttons) {
      button.click();
      await frames(3);
      expect(document.getAnimations(), `animations after replaying ${button.dataset.replay}`).toHaveLength(0);
      const layer = document.querySelector("[data-particle-layer]");
      expect(layer?.children.length ?? 0, `particles after replaying ${button.dataset.replay}`).toBe(0);
    }
  });
}
