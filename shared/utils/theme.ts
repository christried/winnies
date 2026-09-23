import type { ThemePreference } from "../constants";
import { DAISY_THEMES } from "../constants";

/**
 * Dynamically set the "data-theme" value for the user's preference.
 * @param preference The user's theme choice.
 * @returns The daisyUI theme name. "undefined" results in "system"
 */
export function themeAttribute(preference: ThemePreference) {
  return preference === "system" ? undefined : DAISY_THEMES[preference];
}
