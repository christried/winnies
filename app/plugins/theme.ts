import type { ThemePreference } from "~~/shared/constants";
import { THEME_COOKIE, THEME_COOKIE_MAX_AGE } from "~~/shared/constants";
import { themePreferenceSchema } from "~~/shared/schemas/user";

export default defineNuxtPlugin(() => {
  const user = useCurrentUser();

  const preference = useCookie<ThemePreference | undefined>(THEME_COOKIE, {
    maxAge: THEME_COOKIE_MAX_AGE,
    sameSite: "lax",
    default: () => user.value?.theme ?? undefined,
  });

  if (preference.value !== undefined && !themePreferenceSchema.safeParse(preference.value).success)
    preference.value = user.value?.theme ?? undefined;

  useHead({
    htmlAttrs: {
      "data-theme": computed(() => themeAttribute(preference.value ?? "system")),
    },
  });

  return { provide: { themePreference: preference } };
});
