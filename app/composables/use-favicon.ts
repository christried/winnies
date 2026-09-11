import type { MaybeRefOrGetter } from "vue";

/** Which icon the browser tab shows for a Winnie. */
export type FaviconState = "idle" | "running" | "won";

/** What decides the favicon: the Winnie's total timer and whether every Challenge is won. */
export interface FaviconInput {
  running: boolean;
  complete: boolean;
}

export const FAVICON_HREF: Record<FaviconState, string> = {
  idle: "/favicon.svg",
  running: "/favicon-running.svg",
  won: "/favicon-won.svg",
};

/**
 * Picks the favicon for a Winnie.
 * @param input The Winnie's state.
 * @param input.running Whether the Winnie's total timer runs.
 * @param input.complete Whether every Challenge of the Winnie is won.
 * @returns "won" beats "running", otherwise "idle".
 */
export function faviconState({ running, complete }: FaviconInput): FaviconState {
  if (complete)
    return "won";

  return running ? "running" : "idle";
}

/**
 * Points favicon at the icon for the respective Winnie state
 * @param state Whether the Winnie's total timer runs and whether it is complete.
 */
export function useFavicon(state: MaybeRefOrGetter<FaviconInput>) {
  useHead({
    link: [{
      key: "favicon",
      rel: "icon",
      type: "image/svg+xml",
      href: computed(() => FAVICON_HREF[faviconState(toValue(state))]),
    }],
  });
}
