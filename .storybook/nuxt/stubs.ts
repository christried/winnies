// The Nuxt-only names a story is allowed to reach, each the smallest stand-in. Every other Nuxt global stays undefined,
// so a component that needs one fails its own story with a ReferenceError (CODING_STANDARDS.md § Tests).
import type { Ref } from "vue";
import { ref } from "vue";

const state = new Map<string, Ref<unknown>>();

/**
 * Nuxt's `useState`: a ref per key, shared by every caller of that key. `useServerClock` and the default branch of
 * `provideSurfaceClock` call it.
 *
 * @param key the state's key
 * @param init the first value, read once per key
 * @returns the key's ref
 */
export function useState<T>(key: string, init?: () => T): Ref<T> {
  if (!state.has(key))
    state.set(key, ref(init?.()));
  return state.get(key) as Ref<T>;
}
