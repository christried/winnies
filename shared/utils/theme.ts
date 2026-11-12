import type { ThemePreference } from "../constants";
import { THEME_PREFERENCE } from "../constants";

/**
 * The "data-theme" value of <html> for the user's preference.
 * @param preference The user's theme choice.
 * @returns "light" or "dark" as chosen; undefined for system, which the inline script resolves.
 */
export function themeAttribute(preference: ThemePreference): Exclude<ThemePreference, "system"> | undefined {
  return preference === "system"
    ? undefined
    : preference;
}

/**
 * Resolves Match system before the first paint: it runs inline in <head>, only where the server left
 * "data-theme" off, so a Light or Dark rendered for a cookie, an account or the Overlay is never touched.
 * Inline on purpose, there is no CSP today; one added later needs a nonce or hash for this script.
 */
export const MATCH_SYSTEM_SCRIPT = `(function(){var r=document.documentElement;if(!r.hasAttribute("data-theme"))r.setAttribute("data-theme",matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light")})()`;

/**
 * The preference after this one, wrapping around: system → light → dark → system.
 * @param preference The current choice.
 * @returns The next choice in {@link THEME_PREFERENCE} order.
 */
export function nextThemePreference(preference: ThemePreference): ThemePreference {
  const index = THEME_PREFERENCE.indexOf(preference);

  return THEME_PREFERENCE[(index + 1) % THEME_PREFERENCE.length] ?? "system";
}
