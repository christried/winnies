// The scaffolding the component stories of `UI/` share (#349, the R2 review's Q5): the page that holds a story, the panel
// that holds a control beside its chip, and the probes that read what the browser resolved. A story file keeps none of
// these as its own copy.
import type { VNode } from "vue";
import type { MaterialCut, MaterialIconName } from "../../app/utils/material-icons";
import { within } from "storybook/test";
import { h } from "vue";
import { materialIconBody } from "../../app/utils/material-icons";
import { chip, headingCss } from "./html";

const PAGE_STYLE = "display:flex;flex-direction:column;align-items:flex-start;gap:16px;padding:24px";

/**
 * A story's page: a landmark with its heading, so axe finds both. Text on it sits on a chip or a panel, never straight on
 * the dialect backdrop.
 *
 * @param title the landmark's name and the heading
 * @param body what the story shows
 * @returns the page
 */
export function page(title: string, ...body: VNode[]): VNode {
  return pageWithCss("", title, ...body);
}

/**
 * A story's page that also carries a rule of its own, such as one that hides a focused field's blinking caret.
 *
 * @param css the rule, a `<style>` before the heading
 * @param title the landmark's name and the heading
 * @param body what the story shows
 * @returns the page
 */
export function pageWithCss(css: string, title: string, ...body: VNode[]): VNode {
  return h("section", {
    "aria-label": title,
    "style": PAGE_STYLE,
  }, [
    ...css
      ? [
          h("style", css),
        ]
      : [],
    h("h1", { style: `${headingCss};font-size:var(--text-4xl)` }, title),
    ...body,
  ]);
}

/** How a panel lays its controls out. */
export interface PanelOptions {
  /** The space between the controls and the chip, in pixels. Default 16. */
  gap?: number;
  /** The panel's padding, in pixels. Default 16. */
  padding?: number;
  /** Whether the row wraps. Default true. */
  wrap?: boolean;
}

/**
 * A panel maker: every control on a surface panel with its story chip beside it, so axe judges the control against the
 * panel and not against the dialect backdrop.
 *
 * @param options the panel's gap, padding and wrapping
 * @returns a function that builds one panel from a story's chip text and its controls
 */
export function panel(options: PanelOptions = {}) {
  const { gap = 16, padding = 16, wrap = true } = options;
  const style = `display:flex;align-items:center;${wrap ? "flex-wrap:wrap;" : ""}gap:${gap}px;padding:${padding}px;`
    + "background:var(--color-surface);border-radius:var(--radius-xl)";
  return (story: string, ...body: VNode[]): VNode => h("div", { style }, [
    ...body,
    h("div", {
      innerHTML: chip(story),
    }),
  ]);
}

/** The usual panel: 16px of gap and padding, wrapping. */
export const labelled = panel();

/**
 * The button of that name, once it has rendered.
 *
 * @param scope the canvas, or the part of it to look in
 * @param name the accessible name
 * @returns the button
 */
export function findButton(scope: HTMLElement, name: string) {
  return within(scope).findByRole("button", { name });
}

/**
 * What a token's colour computes to, read from a probe so a check never writes the palette out.
 *
 * @param token the custom property, such as `--color-won`
 * @param property whether the probe wears it as its text colour or as its background; the value is the same, the property
 *   is what a check compares against
 * @returns the computed colour, as `getComputedStyle` writes it
 */
export function colourOf(token: string, property: "color" | "backgroundColor" = "color"): string {
  const probe = document.createElement("span");
  document.body.append(probe);
  probe.style[property] = `var(${token})`;
  const colour = getComputedStyle(probe)[property];
  probe.remove();
  return colour;
}

/**
 * The ring an element draws as a box shadow: a field's border, hover and focus ring. The well's resting look is the same in
 * every story: sunken, no ring but the well's own shadow.
 *
 * @param el the element
 * @returns the computed `box-shadow`
 */
export function ringOf(el: Element): string {
  return getComputedStyle(el).boxShadow;
}

/**
 * Waits for real time, for the check of something that must not happen.
 *
 * @param ms how long
 * @returns when it has passed
 */
export function sleep(ms: number): Promise<void> {
  return new Promise<void>(resolve => setTimeout(resolve, ms));
}

/**
 * The markup of an icon's cut as the browser serialises it: the shipped cut is read back through a probe the same way.
 *
 * @param name the icon
 * @param cut the cut
 * @returns what an `svg` holds when it draws that cut
 */
export function cutMarkup(name: MaterialIconName, cut: MaterialCut): string {
  const probe = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  probe.innerHTML = materialIconBody(name, cut);
  return probe.innerHTML;
}
