import type { MotionEnv } from "./types";

const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";

function noop() {}

/**
 * The environment the engine runs in: the real computed style, `CSS.supports`, `matchMedia` and a
 * `MutationObserver` on `<html>` and `<body>`. Each member touches its global only when called and answers for the
 * server when the global is missing, so importing this module never needs a browser.
 *
 * @returns the browser's environment
 */
export function browserEnv(): MotionEnv {
  const hasWindow = () => typeof window !== "undefined";
  return {
    computedStyle: el => getComputedStyle(el),
    supportsLinear: () => typeof CSS !== "undefined" && typeof CSS.supports === "function"
      && CSS.supports("transition-timing-function", "linear(0, 1)"),
    mediaReduced: () => hasWindow() && typeof window.matchMedia === "function" && window.matchMedia(REDUCED_QUERY).matches,
    htmlMotion: () => (typeof document === "undefined"
      ? null
      : document.documentElement.getAttribute("data-motion")),
    onMediaChange: (cb) => {
      if (!hasWindow() || typeof window.matchMedia !== "function")
        return noop;
      const query = window.matchMedia(REDUCED_QUERY);
      query.addEventListener("change", cb);
      return () => query.removeEventListener("change", cb);
    },
    onAttrChange: (cb) => {
      if (typeof MutationObserver === "undefined" || typeof document === "undefined")
        return noop;
      // Theme and motion live on <html>, the dialect on <body>: one observer on each.
      const observer = new MutationObserver(cb);
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["data-motion", "data-theme"],
      });
      observer.observe(document.body, {
        attributes: true,
        attributeFilter: ["data-dialect"],
      });
      return () => observer.disconnect();
    },
  };
}
