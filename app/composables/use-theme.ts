import type { ThemePreference } from "~~/shared/constants";

/**
 * Includes the user's theme preference and a setter that applies + saves to account
 * @returns The current preference and the setter.
 */
export function useTheme() {
  const { $themePreference } = useNuxtApp();
  const user = useCurrentUser();

  const preference = computed<ThemePreference>(() => $themePreference.value ?? "system");

  /**
   * Applies a preference immediately; when signed in, also saves it and rolls back on failure.
   * @param nextPreference The chosen preference.
   */
  async function setPreference(nextPreference: ThemePreference) {
    const previousPreference = $themePreference.value;
    $themePreference.value = nextPreference;

    // Signed out: the cookie alone carries the choice
    if (!user.value)
      return;

    try {
      await $fetch("/api/user/theme", { method: "PUT", body: { theme: nextPreference } });
    }
    catch (error) {
      if ($themePreference.value === nextPreference)
        $themePreference.value = previousPreference;

      toastApiError(error, "Couldn't save theme.");
    }
  }

  return { preference, setPreference };
}
