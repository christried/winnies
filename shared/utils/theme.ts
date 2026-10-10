import type { ThemePreference } from "../constants";
import { DAISY_THEMES, THEME_PREFERENCE } from "../constants";

/**
 * Dynamically set the "data-theme" value for the user's preference.
 * @param preference The user's theme choice.
 * @returns The daisyUI theme name. "undefined" results in "system"
 */
export function themeAttribute(preference: ThemePreference) {
  return preference === "system" ? undefined : DAISY_THEMES[preference];
}

/**
 * The preference after this one, wrapping around: system → light → dark → system.
 * @param preference The current choice.
 * @returns The next choice in {@link THEME_PREFERENCE} order.
 */
export function nextThemePreference(preference: ThemePreference): ThemePreference {
  const index = THEME_PREFERENCE.indexOf(preference);

  return THEME_PREFERENCE[(index + 1) % THEME_PREFERENCE.length] ?? "system";
}
