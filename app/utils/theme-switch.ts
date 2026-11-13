import type { ThemePreference } from "../../shared/constants";
import type { MaterialIconName } from "./material-icons";

/** A theme the page can be in: what `data-theme` holds. A preference adds "system" on top. */
export type ResolvedTheme = "light" | "dark";

/** One radio of the theme switch. */
export interface ThemeOption {
  value: ThemePreference;
  icon: MaterialIconName;
  /** The radio's visible word and its accessible name (06-copy.md, A3). */
  label: string;
}

/** The radios in the handoff's order: the explicit choices first, "Match system" last. Not `THEME_PREFERENCE`'s order. */
export const THEME_OPTIONS: readonly ThemeOption[] = [
  { value: "light", icon: "light_mode", label: "Light" },
  { value: "dark", icon: "dark_mode", label: "Dark" },
  { value: "system", icon: "contrast", label: "Match system" },
];

/**
 * The theme a preference puts the page in.
 * @param preference what the person chose
 * @param system what the system prefers
 * @returns the preference itself, or the system's theme for "system"
 */
export function resolveTheme(preference: ThemePreference, system: ResolvedTheme): ResolvedTheme {
  return preference === "system"
    ? system
    : preference;
}

/**
 * The radio an arrow key moves to, wrapping at both ends. Home, End, Enter, Space and every other key are not steps:
 * Enter and Space are the button's own click, and the group handles no Home or End.
 * @param index the focused radio
 * @param key a `KeyboardEvent.key`
 * @param count how many radios there are
 * @returns the new index, or `null` when the key is not an arrow
 */
export function stepIndex(index: number, key: string, count: number): number | null {
  if (key === "ArrowRight" || key === "ArrowDown")
    return (index + 1) % count;
  if (key === "ArrowLeft" || key === "ArrowUp")
    return (index - 1 + count) % count;
  return null;
}
