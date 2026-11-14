// What a tooltip decides without the DOM (#311): the delay and the distances the handoff gives, the support check for
// anchor positioning, the join of two `anchor-name` lists on one trigger, and where a bubble goes in a browser that
// cannot anchor it. `ui/tooltip.vue` reads the DOM into these arguments. Explicit imports only, so a node test runs it.
import type { StyleValue } from "vue";
import { normalizeStyle } from "vue";

/** R10: the pause of a resting mouse before the bubble shows. */
export const TOOLTIP_DELAY_MS = 450;
/** The space between the bubble and its trigger (the prototype's `top - 10`). */
export const TOOLTIP_GAP = 10;
/** The least space between the bubble and the viewport's edge. */
export const TOOLTIP_MARGIN = 8;

/**
 * Whether the browser can place a box by anchor. Read when a bubble shows, never at import: the server has no `CSS`.
 *
 * @returns true where `position-area` is a property, the one the bubble's style places it with; the menu asks the same
 */
export function anchorPositioningSupported(): boolean {
  return typeof CSS !== "undefined" && CSS.supports("position-area", "top");
}

const DASHED = "anchor-name";
const CAMEL = "anchorName";

/**
 * A trigger can anchor more than one popover: a menu's `anchor-name` and the tooltip's. `anchor-name` is a list, so the
 * tooltip's name is appended to the caller's instead of replacing it.
 *
 * @param style the caller's `style` binding: a string, an object, an array of both, or nothing
 * @param own the tooltip's own name, such as `--tip-v-0`
 * @returns the caller's other properties as given, and one `anchor-name` key that holds every name once
 */
export function joinAnchorNames(style: StyleValue | undefined, own: string): Record<string, string> {
  // Wrapped in an array so a lone string is parsed too: `normalizeStyle` returns a string as it is.
  const merged = normalizeStyle([style]) as Record<string, string | number>;
  const { [DASHED]: dashed, [CAMEL]: camel, ...rest } = merged;
  const names = [dashed, camel, own]
    .flatMap(list => list === undefined
      ? []
      : String(list).split(","))
    .map(name => name.trim())
    .filter(Boolean);
  return {
    ...rest as Record<string, string>,
    [DASHED]: [
      ...new Set(names),
    ].join(", "),
  };
}

/** What `UiTooltip` hands its slot: bound onto the one element that triggers the bubble. */
export interface TooltipTrigger {
  /** The bubble's id: the trigger is described by it, and its accessible name stays its own. Absent when the bubble only repeats the name. */
  "aria-describedby"?: string;
  /** The name the bubble anchors to. A caller that has its own `anchor-name` joins the two with `joinAnchorNames`. */
  "style": { "anchor-name": string };
  "onPointerenter": (event: PointerEvent) => void;
  "onPointerleave": () => void;
  "onPointerdown": () => void;
  "onFocus": (event: FocusEvent) => void;
  "onBlur": () => void;
}

// The two names below start with `Tooltip` because `menu-nav` exports a `Box` and a `fallbackPlacement`, and Nuxt
// auto-imports every file of this folder: the same name twice would shadow one of them.
/** A width and a height in pixels. */
export interface TooltipSize {
  width: number;
  height: number;
}

/** A rectangle in viewport pixels, as `getBoundingClientRect` gives. */
export interface TooltipBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * The bubble's top-left corner where there is no anchor positioning: centred over the trigger, below it when it does
 * not fit above, and inside the viewport sideways.
 *
 * @param trigger the trigger's box
 * @param bubble the bubble's layout size (`offsetWidth`, `offsetHeight`: the pop-in's scale must not shrink it)
 * @param viewport the viewport's size
 * @returns the corner for `position: fixed`, and whether the bubble went below
 */
export function tooltipPlacement(
  trigger: TooltipBox,
  bubble: TooltipSize,
  viewport: TooltipSize,
): { left: number; top: number; below: boolean } {
  const above = trigger.top - TOOLTIP_GAP - bubble.height;
  const below = trigger.top + trigger.height + TOOLTIP_GAP;
  const fitsAbove = above >= TOOLTIP_MARGIN;
  const fitsBelow = below + bubble.height <= viewport.height - TOOLTIP_MARGIN;
  // No room either way: above, where the bubble at least leaves the trigger uncovered.
  const goesBelow = !fitsAbove && fitsBelow;
  const wanted = trigger.left + trigger.width / 2 - bubble.width / 2;
  const left = Math.max(TOOLTIP_MARGIN, Math.min(wanted, viewport.width - bubble.width - TOOLTIP_MARGIN));
  return {
    left,
    top: goesBelow ? below : above,
    below: goesBelow,
  };
}
