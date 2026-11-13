<!-- app/components/ui/progress-bar.vue -->
<script setup lang="ts">
import { clampedWon, progressPercent } from "~/utils/progress-bar";

// The handoff's `progress-bar` (03-components.md): a sunken track whose striped fill moves by `translateX`, never by
// width (the prototype wins over the reference CSS's `width`). It is the track only: the "3 / 8 won" label and its pop
// are R3's. Its props carry behaviour and it never fetches.
const props = withDefaults(defineProps<{
  /** Won Challenges, clamped to 0..total and to a whole number */
  won: number;
  /** All Challenges, 0 or more */
  total: number;
  /** The accessible name. The track has no visible text */
  label: string;
  /** The stripes loop while it is true (A07) */
  running?: boolean;
}>(), { running: false });

const m = useWinniesMotion();
// A directive cannot inject, so the component asks for it here.
const vLoop = useLoopDirective();
const fill = useTemplateRef<HTMLElement>("fill");

const counted = computed(() => clampedWon(props.won, props.total));
const percent = computed(() => progressPercent(props.won, props.total));

// The fill is as wide as its clip and only slides: `translateX` in percent of its own width, so 38 % shows 38 % of
// the track. The rest position is a plain `transform`, so reduced motion needs no code: the engine creates nothing and
// the fill is already where R29 would end. R29 lets go of its keyframes when done, so this style is what stays.
const rest = computed(() => `translateX(${percent.value - 100}%)`);

// R29 plays when the won count changes, up or down. A total that changes alone lands at once, a change of the count
// that leaves the percent where it was (4 of 8 to 5 of 10) has nothing to move, and a first render draws its end
// state: the watcher is not `immediate`.
watch(() => [counted.value, props.total] as const, ([won, total], [prevWon, prevTotal]) => {
  if (won === prevWon)
    return;
  const from = progressPercent(prevWon, prevTotal) - 100;
  const to = progressPercent(won, total) - 100;
  if (from !== to)
    m.progress(fill.value, from, to);
});
</script>

<template>
  <div
    role="progressbar"
    :aria-label="label"
    aria-valuemin="0"
    :aria-valuemax="total"
    :aria-valuenow="counted"
    class="box-border h-7 w-full rounded-sm bg-surface-sunken p-1 shadow-well"
  >
    <!-- The clip hides the overshoot of the spring, and the fill's rounded end at 0 % and 100 %. -->
    <div
      data-clip
      class="relative h-full overflow-hidden rounded-xs"
    >
      <!-- R29 runs here, so the stripes move with the fill. A07 runs on the stripes, a child: each sets `transform`,
           so they are never on one element. -->
      <div
        ref="fill"
        data-fill
        aria-hidden="true"
        class="absolute inset-0 overflow-hidden rounded-xs"
        :style="{ transform: rest }"
      >
        <!-- 30px wider than the fill on the left, so the loop's 28.28px shift never uncovers its left edge. At rest
             (reduced motion, the server's render) its transform is none: the layer's own first keyframe. -->
        <span
          v-loop="running && 'stripes'"
          data-stripes
          aria-hidden="true"
          class="absolute top-0 right-0 bottom-0 -left-[30px] [background:var(--texture-stripes-won)]"
        />
        <!-- The handoff's gloss: literals with no token. -->
        <span
          aria-hidden="true"
          class="absolute inset-0 rounded-xs shadow-[inset_0_-3px_4px_rgb(40_140_80/.3),inset_0_2px_2px_rgb(255_255_255/.6)]"
        />
      </div>
    </div>
  </div>
</template>
