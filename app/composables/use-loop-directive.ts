import type { ObjectDirective } from "vue";
import type { LoopHost, LoopSpec } from "../utils/motion/loop-sync";
import type { WinniesMotion } from "../utils/motion/types";
// The Vue side of `v-loop` (#301); the core is `utils/motion/loop-sync.ts`. Vue is imported explicitly and the motion
// modules by relative path, because the unit test runs in node without Nuxt.
import { createLoopHost, sameLoopSpec } from "../utils/motion/loop-sync";
import { useWinniesMotion } from "./use-winnies-motion";

// One host per engine, so every loop of a surface shares one visibility listener and one engine subscription. This is
// module state, which `use-winnies-motion.ts` warns against, and it is safe for the reason that warning gives: nothing
// in it is shared between requests. A host is made on the first `mounted`, which only runs in the browser, and the key
// is the engine, so the entry dies with it.
const hosts = new WeakMap<WinniesMotion, LoopHost>();

function hostOf(m: WinniesMotion): LoopHost {
  let host = hosts.get(m);
  if (!host) {
    host = createLoopHost(m);
    hosts.set(m, host);
  }
  return host;
}

/**
 * The `v-loop` directive of the surface a component renders under: it starts the named ambient loop when the element
 * mounts, switches it when the value changes, pauses it while the element is off-screen or the tab is hidden, and
 * cancels it when the element unmounts. Same-named loops share one phase; a `delay` offsets a stagger from it. The
 * engine decides whether a loop may exist at all (reduced motion, the tier, `--ambient-motion`).
 *
 * A directive cannot `inject`, so the component asks for it in its setup:
 *
 * ```vue
 * <script setup lang="ts">
 * const vLoop = useLoopDirective();
 * </script>
 *
 * <template>
 *   <div v-loop="'breathe'" />
 *   <span v-loop="{ name: 'bob', delay: -index * 110 }" />
 *   <i v-loop="running && 'ring'" />
 * </template>
 * ```
 *
 * The directive has no server hook, so a server render is identical with and without it, and the hooks run in the
 * browser only.
 *
 * @returns the directive, to bind to a `vLoop` constant
 */
export function useLoopDirective(): ObjectDirective<HTMLElement, LoopSpec> {
  const m = useWinniesMotion();
  return {
    mounted: (el, { value }) => hostOf(m).set(el, value),
    // Runs on every update of the component; the host is only told when the loop itself changed.
    updated: (el, { value, oldValue }) => {
      if (!sameLoopSpec(value, oldValue))
        hostOf(m).set(el, value);
    },
    unmounted: el => hosts.get(m)?.remove(el),
  };
}
