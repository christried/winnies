// What a menu does with a key, as pure functions (#313): which item a key moves to, where opening puts the focus, and
// where a menu without anchor positioning goes. `ui/menu.vue` reads the DOM into flags and labels and calls these, so
// the rules are pinned by a node test and the component keeps only the wiring. No import from Vue or Nuxt.

/**
 * The index of the item a key moves to. A disabled item is never a target.
 *
 * @param enabled one flag per item, in DOM order
 * @param from the focused item's index, or -1 when none is focused
 * @param key a `KeyboardEvent.key`: `ArrowDown`, `ArrowUp`, `Home` or `End` move, anything else does not
 * @returns the target's index, or -1 when no item is enabled or the key is not a move
 */
export function moveIndex(enabled: boolean[], from: number, key: string): number {
  const count = enabled.length;
  if (key === "Home")
    return enabled.indexOf(true);
  if (key === "End")
    return enabled.lastIndexOf(true);
  if (key !== "ArrowDown" && key !== "ArrowUp")
    return -1;
  const step = key === "ArrowDown"
    ? 1
    : -1;
  // From no focus, a step down starts before the first item and a step up after the last.
  const start = from < 0 && step < 0
    ? count
    : from;
  // Up to `count` steps: a full lap ends on the focused item itself, so a lone enabled item returns itself.
  for (let i = 1; i <= count; i++) {
    const index = (((start + step * i) % count) + count) % count;
    if (enabled[index])
      return index;
  }
  return -1;
}

/**
 * The index a typed letter jumps to: the next enabled item after `from`, wrapping, whose label starts with it.
 * The search ends on `from` itself, so one match stays put and two matches cycle.
 *
 * @param labels one label per item, in DOM order
 * @param enabled one flag per item
 * @param from the focused item's index, or -1
 * @param char the typed character
 * @returns the index, or -1 when nothing matches (the caller moves nothing)
 */
export function typeAheadIndex(labels: string[], enabled: boolean[], from: number, char: string): number {
  const count = labels.length;
  const wanted = char.toLowerCase();
  for (let i = 1; i <= count; i++) {
    const index = (from + i) % count;
    if (enabled[index] && labels[index]!.trim().toLowerCase().startsWith(wanted))
      return index;
  }
  return -1;
}

/**
 * Whether a keydown is type-ahead: one character that is not Space, with no Ctrl, Meta or Alt (a shortcut is not a letter).
 *
 * @param key a `KeyboardEvent.key`
 * @param mods which modifiers are held
 * @param mods.ctrl whether Ctrl is held
 * @param mods.meta whether Meta is held
 * @param mods.alt whether Alt is held
 * @returns true for a key that jumps
 */
export function isTypeAheadKey(key: string, mods: { ctrl: boolean; meta: boolean; alt: boolean }): boolean {
  return [...key].length === 1 && key !== " " && !mods.ctrl && !mods.meta && !mods.alt;
}

/**
 * Where opening puts the focus (07-accessibility.md, Menus): the current item, else the first.
 *
 * @param enabled one flag per item
 * @param current one flag per item: the marked one
 * @returns the first enabled `current` item, else the first enabled item, else -1
 */
export function initialIndex(enabled: boolean[], current: boolean[]): number {
  const marked = enabled.findIndex((on, i) => on && current[i]);
  return marked >= 0
    ? marked
    : enabled.indexOf(true);
}

/** A width and a height in pixels. */
export interface Extent {
  width: number;
  height: number;
}

/** A rectangle in viewport pixels, as `getBoundingClientRect` gives it. */
export interface Box {
  top: number;
  left: number;
  right: number;
  bottom: number;
}

/**
 * The fixed `top` and `left` of a menu in a browser without anchor positioning: below the trigger, above it when it fits
 * there and not below, the left or right edge lined up as `align` says, and kept `margin` inside the viewport.
 *
 * @param trigger the trigger's box
 * @param size the menu's width and height
 * @param viewport the viewport's width and height
 * @param align `start` lines up the left edges, `end` the right edges
 * @param gap the space between trigger and menu
 * @param margin the least distance to the viewport's edges
 * @returns the offsets for `position: fixed`
 */
export function fallbackPlacement(
  trigger: Box,
  size: Extent,
  viewport: Extent,
  align: "start" | "end",
  gap: number,
  margin = 8,
): { top: number; left: number } {
  const below = trigger.bottom + gap;
  const above = trigger.top - gap - size.height;
  const fitsBelow = below + size.height <= viewport.height - margin;
  const top = !fitsBelow && above >= margin
    ? above
    : below;
  const wanted = align === "start"
    ? trigger.left
    : trigger.right - size.width;
  const left = Math.max(margin, Math.min(wanted, viewport.width - size.width - margin));
  return { top, left };
}
