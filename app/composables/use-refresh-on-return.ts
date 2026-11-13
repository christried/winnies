// Refreshes the current Winnie when the person comes back to the page, so a change made elsewhere shows up. It used to
// live inside the clock that stopped in a hidden tab; the surface clock only tells time, so it has its own file (#304).
// The core takes the document and the window as arguments, so a node test drives it with plain EventTargets, and
// nothing at module level touches a browser global.
import { onMounted, onUnmounted } from "vue";

/** Just what `refreshOnReturn` uses of the browser. */
export interface RefreshOnReturnEnv {
  doc: Pick<Document, "hidden" | "addEventListener" | "removeEventListener">;
  win: Pick<Window, "addEventListener" | "removeEventListener">;
}

/**
 * Calls `refresh` when the tab becomes visible and when the window gets focus. Going hidden does nothing. No debounce:
 * the store joins concurrent refreshes into one request.
 *
 * @param env the document and the window
 * @param refresh what to call on a return
 * @returns the stop, which removes both listeners
 */
export function refreshOnReturn(env: RefreshOnReturnEnv, refresh: () => void): () => void {
  function onVisibilityChange() {
    if (!env.doc.hidden)
      refresh();
  }

  env.doc.addEventListener("visibilitychange", onVisibilityChange);
  env.win.addEventListener("focus", refresh);
  return () => {
    env.doc.removeEventListener("visibilitychange", onVisibilityChange);
    env.win.removeEventListener("focus", refresh);
  };
}

/** Refreshes the current Winnie on every return to the page. Browser only; call it once per page that shows a Winnie. */
export function useRefreshOnReturn(): void {
  const winnieStore = useWinnieStore();
  let stop: (() => void) | null = null;

  onMounted(() => {
    stop = refreshOnReturn({ doc: document, win: window }, () => winnieStore.refreshCurrentWinnie());
  });
  onUnmounted(() => stop?.());
}
