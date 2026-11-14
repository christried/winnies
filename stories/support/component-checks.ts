// Helpers for the play functions of the component stories (#307). Like the motion helpers, they take control of the
// motion preference themselves, so a play function runs the same in every variant.
import { expect } from "storybook/test";
import { animations, frames, withMotion } from "./motion-play";
import { realPointer } from "./real-pointer";

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

/** Waits for every animation that ends (a CSS transition, a release jelly), so a picture or a read never catches one halfway. */
export async function settled() {
  await frames();
  const ending = animations().filter(a => a.effect?.getComputedTiming().iterations !== Infinity);
  await Promise.all(ending.map(a => a.finished.catch(() => undefined)));
  await frames();
}

/**
 * Stops every spinner at its first frame. The spin loop never ends, so a picture of a busy button would catch it at a
 * different angle each run: the pictures show the icon, the plays check that it turns. A spinner is the icon of
 * anything that says `aria-busy`: a busy button or link, the loading state pill (#321).
 */
export function freezeSpinners(canvasElement: HTMLElement) {
  for (const svg of canvasElement.querySelectorAll("[aria-busy='true'] svg")) {
    for (const a of svg.getAnimations()) {
      a.pause();
      a.currentTime = 0;
    }
  }
}

/**
 * Leaves the page as its picture should find it: nothing focused, every spinner still, no animation half-run, and the
 * page painted from scratch, not on top of what the interaction left (the shot compares at the pixel).
 */
export async function finish(canvasElement: HTMLElement) {
  (document.activeElement as HTMLElement | null)?.blur();
  freezeSpinners(canvasElement);
  await settled();
  document.body.style.visibility = "hidden";
  await frames();
  document.body.style.visibility = "";
  await frames();
}

/**
 * Moves the runner's real mouse out of the way. It stays where the last story left it, and over a control it would draw
 * the hover ring in the picture: which story ran before would decide the baseline.
 */
export async function parkPointer() {
  const pointer = await realPointer();
  await pointer?.unhover(document.body);
}

/**
 * Paints the canvas again from scratch while the focus stays where it is. The ring is drawn over a page that was already
 * painted, and the shot compares at the pixel: on some runners the anti-aliased edge pixels of that increment differ from
 * a fresh paint. Promoting the canvas to its own layer and back makes the browser raster it anew. `finish()` of the
 * shared checks does it by hiding the body, which would also drop the focus; the ring is this picture.
 *
 * @param canvasElement the story's canvas
 */
export async function repaint(canvasElement: HTMLElement) {
  canvasElement.style.willChange = "opacity";
  await frames();
  canvasElement.style.willChange = "";
  await frames();
}
