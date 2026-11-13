/** The four cuts of Material Symbols Rounded the handoff ships: a folder each under `app/assets/icons/`. */
export type MaterialCut = "w500" | "w500-fill" | "w600" | "w700-fill";

/** The stroke weights the design uses: 500 by default, 600 on icon buttons, 700 inside buttons. */
export type MaterialWeight = 500 | 600 | 700;

/** `--icon-sm|md|lg|xl` (18, 22, 28, 30px) in `winnies-tokens.css`. */
export const MATERIAL_ICON_SIZES = ["sm", "md", "lg", "xl"] as const;
/** One of the four `--icon-*` sizes. */
export type MaterialIconSize = (typeof MATERIAL_ICON_SIZES)[number];

/**
 * Every icon the app ships, by the handoff's name. A new one is its four cuts copied into `app/assets/icons/` and its
 * name added here; `app/utils/material-icons.test.ts` fails when the two disagree.
 */
export const MATERIAL_ICON_NAMES = [
  "add",
  "bug_report",
  "cast",
  "check",
  "check_circle",
  "close",
  "cloud_off",
  "content_copy",
  "contrast",
  "control_point_duplicate",
  "dark_mode",
  "delete",
  "drag_indicator",
  "edit",
  "emoji_events",
  "error",
  "expand_less",
  "expand_more",
  "exposure_neg_1",
  "exposure_plus_1",
  "info",
  "light_mode",
  "link_off",
  "more_horiz",
  "more_vert",
  "pause",
  "play_arrow",
  "progress_activity",
  "push_pin",
  "radio_button_unchecked",
  "refresh",
  "remove",
  "restart_alt",
  "share",
  "timer",
  "visibility",
] as const;
/** The handoff's name of a shipped icon. */
export type MaterialIconName = (typeof MATERIAL_ICON_NAMES)[number];

/**
 * The cut that draws a weight and a fill. The handoff has no `w600-fill` and no `w700` outline, so those two snap to
 * the nearest cut (a tie goes lighter). The one place that knows which cuts exist: a cut added later is a case here.
 * @param weight 500, 600 or 700
 * @param fill whether the icon is the filled one
 * @returns the cut whose file draws it
 */
export function materialCut(weight: MaterialWeight, fill: boolean): MaterialCut {
  if (fill) {
    return weight === 700
      ? "w700-fill"
      : "w500-fill";
  }
  return weight === 500
    ? "w500"
    : "w600";
}

// The files are the bundle: `eager` puts the markup in the JS, so the server-rendered HTML and the client draw the same
// icon with no request. Relative, so Nuxt, Vitest and Storybook all expand it. Nothing else imports the folder.
const FILES = import.meta.glob<string>("../assets/icons/*/*.svg", { query: "?raw", import: "default", eager: true });

const SVG_BODY = /^<svg[^>]*>([\s\S]*)<\/svg>\s*$/;

/**
 * The markup between `<svg …>` and `</svg>` of one icon's file: one `<path d="…">`.
 * @param name the handoff's name of the icon
 * @param cut which of the four cuts
 * @returns the inner markup, ready for `v-html` inside an `<svg>`
 */
export function materialIconBody(name: MaterialIconName, cut: MaterialCut): string {
  const raw = FILES[`../assets/icons/${cut}/${name}.svg`];
  const body = raw?.match(SVG_BODY)?.[1];
  if (body === undefined) {
    throw new Error(`No Material icon "${name}" in the cut "${cut}": ship its four cuts in app/assets/icons/ and list it in MATERIAL_ICON_NAMES.`);
  }
  return body;
}
