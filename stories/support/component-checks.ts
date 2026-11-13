// Helpers for the play functions of the component stories (#307). Like the motion helpers, they take control of the
// motion preference themselves, so a play function runs the same in every variant.
import { expect } from "storybook/test";
import { animations, frames, withMotion } from "./motion-play";

/**
 * Runs an interaction under reduced motion and expects the component to have started nothing: no animation in the
 * document (CSS transitions included), and an empty particle layer when the story has one.
 *
 * A story calls it before any full-motion step: a finished `fill: "forwards"` animation stays in
 * `document.getAnimations()` until it is cancelled, so an earlier full-motion step would fail this check for the wrong
 * reason.
 *
 * @param interact what the component's user does: a hover, a click, a key press
 * @returns when the interaction has run, three frames have passed and the preference is back
 */
export function expectQuietAfter(interact: () => Promise<void> | void): Promise<void> {
  return withMotion("reduce", async () => {
    await interact();
    await frames(3);
    expect(animations()).toHaveLength(0);
    const layer = document.querySelector("[data-particle-layer]");
    if (layer)
      expect(layer.children).toHaveLength(0);
  });
}
