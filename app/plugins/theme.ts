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

  // Browser only. While the preference is system the head value follows the OS instead of being undefined:
  // unhead removes an attribute whose value goes to undefined, and the attribute is never removed after
  // hydration. The server renders nothing for system; the inline script in <head> resolves it first.
  const systemTheme = ref<"light" | "dark">("light");
  if (import.meta.client) {
    const query = matchMedia("(prefers-color-scheme: dark)");
    const read = () => systemTheme.value = query.matches ? "dark" : "light";
    read();
    query.addEventListener("change", read);
  }

  useHead({
    htmlAttrs: {
      "data-theme": computed(() =>
        themeAttribute(preference.value ?? "system") ?? (import.meta.client
          ? systemTheme.value
          : undefined),
      ),
    },
  });

  return {
    provide: { themePreference: preference },
  };
});
