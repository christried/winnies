// What a motion story renders under (#306): the same surface a layout makes, with a clock a story can steer. It lives
// here and not in `.storybook/preview.ts` because it is opt-in per story file (`decorators: [withMotionSurface]`): the
// token stories' baselines must not gain a wrapper or a particle layer. Vue and Storybook are imported by name, and the
// app's composables by relative path, as the composables' own unit tests do; `.storybook/nuxt-globals.d.ts` types the
// Nuxt auto-imports those files mention and the stories never reach.
import type { Decorator } from "@storybook/vue3-vite";
import type { InjectionKey, Ref } from "vue";
import type { ClockSource, SurfaceClock } from "../../app/composables/use-surface-clock";
import type { WinniesMotion } from "../../app/utils/motion/types";
import { defineComponent, h, inject, provide, ref, resolveComponent, shallowRef } from "vue";
import ParticleLayer from "../../app/components/particle-layer.vue";
import { provideSurfaceClock, WINNIES_CLOCK_KEY } from "../../app/composables/use-surface-clock";
import { provideWinniesMotion, WINNIES_SURFACE_KEY } from "../../app/composables/use-winnies-motion";

/** Ten seconds before an hour boundary, so a story run at a high rate crosses a second, a minute and an hour quickly. */
export const FAKE_START = Date.UTC(2026, 0, 1, 9, 59, 50);

/** `parameters.motion` of a meta or a story. */
export interface MotionParameters {
  /** Source seconds per real second, default 1. */
  rate?: number;
  /** The first reading of the clock, in milliseconds since the epoch; `FAKE_START` by default. */
  start?: number;
}

/** A clock source a story steers: it starts at `start`, runs at `rate`, and can be moved. */
export interface FakeSource extends ClockSource {
  readonly rate: number;
  /** Rebases the source: the next `now()` reads `ms`, and it runs on from there. A replay of the clock uses it. */
  set: (ms: number) => void;
}

/**
 * Builds the clock source a motion story's surface reads.
 *
 * @param o the parameters of the story; none means the defaults
 * @returns a source whose `now()` is `base + (performance.now() - t0) * rate`
 */
export function createFakeSource(o: MotionParameters = {}): FakeSource {
  const rate = o.rate ?? 1;
  let base = o.start ?? FAKE_START;
  let t0 = performance.now();
  return {
    rate,
    now: () => base + (performance.now() - t0) * rate,
    set: (ms) => {
      base = ms;
      t0 = performance.now();
    },
  };
}

/** What a story component asks for: its surface's engine, particle layer, clock and the source behind it. */
export interface MotionStory {
  m: WinniesMotion;
  layer: Ref<HTMLElement | null>;
  clock: SurfaceClock;
  source: FakeSource;
}

// Module-private: only this file provides it, and `useMotionStory` is the one way to read it.
const SOURCE_KEY: InjectionKey<FakeSource> = Symbol("winnies-story-source");

/**
 * The motion surface a story renders under. It throws instead of delegating to `useWinniesMotion()`: Storybook does
 * not define `import.meta.dev`, so that composable would quietly hand back an inert engine outside a surface, and a
 * story that forgot its decorator would draw nothing and say nothing.
 *
 * @returns the engine, the layer ref, the clock and the clock's source
 * @throws {Error} when the story is not decorated with `withMotionSurface`
 */
export function useMotionStory(): MotionStory {
  const surface = inject(WINNIES_SURFACE_KEY, null);
  const clock = inject(WINNIES_CLOCK_KEY, null);
  const source = inject(SOURCE_KEY, null);
  if (!surface || !clock || !source)
    throw new Error("useMotionStory() was called outside a motion surface. Add `decorators: [withMotionSurface]` to the story file's meta.");
  return {
    m: surface.m,
    layer: surface.layer,
    clock,
    source,
  };
}

function motionSurface(params: MotionParameters) {
  return defineComponent({
    name: "MotionSurface",
    setup() {
      const root = shallowRef<HTMLElement | null>(null);
      const source = createFakeSource(params);
      // Both options passed: `provideSurfaceClock` then never calls `useState` / `useServerClock` (Nuxt auto-imports).
      const clock = provideSurfaceClock({
        source,
        now: ref(source.now()),
      });
      // Before any await; the interval is the clock's, so a story at a high rate ticks at that rate.
      provideWinniesMotion({ root, interval: clock.interval });
      provide(SOURCE_KEY, source);
      // `prepare()` in @storybook/vue3 registers the inner story as the component `story`. Resolve it here, and never
      // call `story()` in a render function: that would rebuild the decorator chain on every render.
      // The story renders on the first pass, as a layout's children do: the engine reads the tokens on the first call that
      // finds the root, so a recipe or a `v-loop` of the first render needs no gate before `start()`. The layer is the
      // app's own component, not a copy.
      return () => h("div", { ref: root }, [
        h(resolveComponent("story")),
        h(ParticleLayer),
      ]);
    },
  });
}

/** Wraps a story in a surface: an engine, a clock on a fake source, and a particle layer. Opt-in, per story file. */
export const withMotionSurface: Decorator = (_story, context) =>
  motionSurface((context.parameters.motion ?? {}) as MotionParameters);
