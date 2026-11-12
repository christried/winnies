import type { InjectionKey, Ref } from "vue";
import type { MotionDialect, WinniesMotion } from "../utils/motion/types";
// A surface's motion instance, handed down from its layout to its components (#300). The core is
// `utils/motion/surface.ts`; this file is the Vue side: provide, inject, start on mount, dispose on unmount. Vue is
// imported explicitly and the motion modules by relative path, because the unit test runs in node without Nuxt.
// Nothing at module level holds state: a module-level instance would be shared between server requests.
import { inject, onBeforeUnmount, onMounted, provide, shallowRef } from "vue";
import { createMotionEngine } from "../utils/motion/engine";
import { bodyDialect, createSurfaceMotion, DEFAULT_TICK_INTERVAL_MS } from "../utils/motion/surface";

/** A surface's engine, and the particle layer the engine draws into once `<ParticleLayer>` has mounted. */
export interface WinniesSurface {
  m: WinniesMotion;
  layer: Ref<HTMLElement | null>;
}

export const WINNIES_SURFACE_KEY: InjectionKey<WinniesSurface> = Symbol("winnies-surface");

/**
 * Creates the surface's one motion instance and provides it to everything below the layout. Call it first in the
 * layout's `<script setup>`, before any `await`: a provide after an await is lost.
 *
 * @param options the surface
 * @param options.root the layout's root element, from `useTemplateRef`; it must sit inside `<body>`
 * @param options.interval the surface clock's tick interval; 1000 ms until the clock passes its own (#303)
 * @returns the instance, for the layout's own use
 */
export function provideWinniesMotion(options: {
  root: Readonly<Ref<HTMLElement | null>>;
  interval?: () => number;
}): WinniesMotion {
  const layer = shallowRef<HTMLElement | null>(null);
  const { m, start, dispose } = createSurfaceMotion({
    root: () => options.root.value,
    layer: () => layer.value,
    // Read when an animation is asked for: the page sets its dialect after the layout is set up.
    dialect: (): MotionDialect => bodyDialect(),
    interval: options.interval,
  });
  provide(WINNIES_SURFACE_KEY, { m, layer });
  // `onMounted` does not run on the server, so `watch()` never reaches `matchMedia` there.
  onMounted(start);
  onBeforeUnmount(dispose);
  return m;
}

/**
 * Picks the surface a component found, or says there is none.
 *
 * @param found what `inject` returned
 * @param strict true in development: a component outside a surface is a bug to see, not to survive
 * @returns the surface; when there is none and `strict` is false, an inert one that animates nothing
 */
export function resolveSurface(found: WinniesSurface | null, strict: boolean): WinniesSurface {
  if (found)
    return found;
  if (strict)
    throw new Error("useWinniesMotion() was called outside a surface. Render the component under a layout that calls provideWinniesMotion().");
  // A fresh engine on every call: an engine holds a set of subscribers, and one shared across requests would leak.
  return {
    m: createMotionEngine({
      root: () => null,
      fx: () => null,
      cfg: () => ({ reduced: true, dialect: null, interval: DEFAULT_TICK_INTERVAL_MS }),
    }),
    layer: shallowRef(null),
  };
}

/**
 * The surface a component renders under, including the layer ref that `<ParticleLayer>` fills in.
 *
 * @returns the instance and its layer ref, or the inert fallback outside a surface in production
 */
export function useWinniesSurface(): WinniesSurface {
  return resolveSurface(inject(WINNIES_SURFACE_KEY, null), import.meta.dev);
}

/**
 * The motion instance of the surface a component renders under. A component never creates an engine.
 *
 * @returns the instance
 */
export function useWinniesMotion(): WinniesMotion {
  return useWinniesSurface().m;
}
