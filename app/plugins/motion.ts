import { MOTION_COOKIE, MOTION_COOKIE_MAX_AGE } from "~~/shared/constants";

// Its own plugin and its own key: a plugin runs for every page, layout and the Overlay, so the attribute
// is on every surface, and unhead merges it with the theme plugin's `data-theme` by key.
export default defineNuxtPlugin(() => {
  const user = useCurrentUser();

  // `unknown`: the cookie is whatever the browser sends, parsed below
  const cookie = useCookie<unknown>(MOTION_COOKIE, {
    maxAge: MOTION_COOKIE_MAX_AGE,
    sameSite: "lax",
    default: () => user.value?.reduceMotion,
  });

  // A readable cookie wins, then the account, then off. An unreadable cookie is left alone, not rewritten.
  const reduceMotion = computed(() => parseMotionCookie(cookie.value) ?? user.value?.reduceMotion ?? false);

  useHead({
    htmlAttrs: {
      "data-motion": computed(() => motionAttribute(reduceMotion.value)),
    },
  });
});
