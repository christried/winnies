<script setup lang="ts">
import type { TimerStatus } from "~~/shared/utils/timer";
import type { TimerState, TimerVariant } from "~/utils/total-timer";
import { elapsedSeconds } from "~~/shared/utils/timer";
import { changedTimerSlots, formatTimerText, timerSlots, timerSpokenValue, timerTickBeat, timerTickKind } from "~/utils/total-timer";

// The one timer of every surface (#320): a time in fixed character slots, in a pill well (Workspace, Overlay) or bare
// (a Challenge Timer's row). Every running second only the slots whose digit changed hop, and the engine's `m.tick`
// does all of the moving (T01-T06): this component calls it and animates nothing itself. Its props carry behaviour and
// it never fetches. The look is the handoff's `total-timer` and its prototypes' `data-well`.
const props = withDefaults(defineProps<{
  /** Where it sits: the Winnie's Total Timer (66px), the Overlay's (68px) or a Challenge Timer in a row (22px) */
  variant?: TimerVariant;
  /** What to count: the value is `elapsedSeconds(timer, clock.now)`, the app's one definition of elapsed time */
  timer: TimerStatus;
  /** Its ink and, in the Overlay, its disc: `complete` is a Winnie's, and a Won Challenge's row is `complete` too */
  state: TimerState;
  /** The static accessible name; "Total Timer", or "Challenge Timer" for a row, which passes "Challenge Timer, {game}" */
  label?: string;
  /** A row inside the Overlay: it ticks as T06 instead of T02 */
  inOverlay?: boolean;
}>(), { variant: "workspace", label: undefined, inOverlay: false });

// A directive cannot inject, so the component asks for it here.
const vLoop = useLoopDirective();
const clock = useSurfaceClock();
const m = useWinniesMotion();
const root = useTemplateRef<HTMLElement>("root");

const seconds = computed(() => elapsedSeconds(props.timer, clock.now.value));
const text = computed(() => formatTimerText(seconds.value, props.variant, props.state === "untouched"));
const slots = computed(() => timerSlots(text.value));
// The same string for the whole minute: it never reads the seconds.
const spoken = computed(() => timerSpokenValue(seconds.value, props.state, props.variant));
const name = computed(() => props.label ?? (props.variant === "row"
  ? "Challenge Timer"
  : "Total Timer"));

// The text the DOM shows. It follows `text` after Vue has patched, so a beat handler that runs in the same tick that
// moved the clock still compares against what is on screen; a mount starts from the first text, so it never ticks.
let drawn = text.value;
watch(text, (next) => {
  drawn = next;
}, { flush: "post" });

/**
 * A clock beat: hops the digits that changed, once Vue has drawn them. A change that came with no beat (a prop, a
 * story's replay) moves the digits with no hop, and so does a hidden tab: the clock keeps running there, silently.
 */
async function onBeat() {
  const changed = changedTimerSlots(drawn, text.value);
  const beat = timerTickBeat(changed);
  if (!beat || props.state !== "running" || clock.hidden.value)
    return;
  await nextTick();
  const el = root.value;
  if (!el)
    return;
  const digits = [
    ...el.querySelectorAll<HTMLElement>("[data-digits] [data-pos]"),
  ]
    .filter(d => changed.includes(Number(d.dataset.pos)));
  // The well is the root, for the two Total Timers only; a row has none.
  m.tick(digits, timerTickKind(props.variant, props.inOverlay), beat, props.variant === "row"
    ? undefined
    : el);
}

let unsubscribe: (() => void) | null = null;
onMounted(() => {
  unsubscribe = clock.onBeat(() => {
    void onBeat();
  });
});
onBeforeUnmount(() => unsubscribe?.());

// By state, the ink of the digits; colours snap, so nothing here transitions.
const ink = computed(() => ({
  untouched: "text-text-muted",
  paused: "text-text",
  running: "text-running-text",
  complete: "text-won-text",
})[props.state]);

const discGlyph = computed(() => ({
  untouched: "pause",
  paused: "pause",
  running: "timer",
  complete: "emoji_events",
} as const)[props.state]);

const discTone = computed(() => ({
  untouched: "bg-control text-text shadow-[0_4px_0_-1px_var(--color-control-lip)]",
  paused: "bg-control text-text shadow-[0_4px_0_-1px_var(--color-control-lip)]",
  running: "bg-accent text-on-accent shadow-[0_4px_0_-1px_var(--color-accent-lip)]",
  complete: "bg-complete text-on-accent shadow-[0_4px_0_-1px_var(--color-complete-lip)]",
})[props.state]);

const frame = computed(() => ({
  workspace: "relative inline-flex h-(--timer-total-h) items-center rounded-pill bg-surface-sunken px-(--timer-total-pad-x) text-(length:--timer-total-size) shadow-well [--timer-gloss:rgb(255_255_255/.7)] dark:[--timer-gloss:rgb(255_255_255/.1)]",
  overlay: "relative box-border flex h-(--timer-overlay-h) items-center gap-3.5 rounded-pill bg-surface-sunken pr-7.5 pl-5 text-(length:--timer-overlay-size) shadow-well [--timer-gloss:rgb(255_255_255/.75)] dark:[--timer-gloss:rgb(255_255_255/.1)]",
  row: "relative inline-flex items-center text-(length:--timer-row-size)",
})[props.variant]);

// Mochiy has no tabular figures, so every character sits in a fixed slot and nothing shifts as a digit changes.
// A row's slots are slightly tighter in the prototype (0.66em, 0.34em).
/**
 * The width class of a slot.
 *
 * @param sep a colon, not a digit
 * @returns the class, in em of the timer's own font size
 */
function slotWidth(sep: boolean) {
  return props.variant === "row"
    ? (sep
        ? "w-[0.34em]"
        : "w-[0.66em]")
    : (sep
        ? "w-(--timer-colon-w)"
        : "w-(--timer-digit-w)");
}
</script>

<template>
  <div
    ref="root"
    role="timer"
    :aria-label="name"
    :data-variant="variant"
    :data-state="state"
    class="[font-family:var(--font-display)] leading-none [font-weight:var(--font-weight-display)] whitespace-nowrap [font-variant-numeric:var(--timer-numeric)]"
    :class="[frame, ink]"
  >
    <!-- A05, while a Total Timer runs. The band's own transform is the loop's first keyframe, so with no loop (reduced
         motion, the server's render) it rests outside the clip and no gloss shows. -->
    <span
      v-if="variant !== 'row' && state === 'running'"
      aria-hidden="true"
      class="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]"
    >
      <span
        v-loop="'shimmer'"
        class="absolute -top-[10%] -bottom-[10%] left-0"
        :class="variant === 'overlay'
          ? 'w-[24%]'
          : 'w-[26%]'"
        style="background: linear-gradient(100deg, transparent, var(--timer-gloss), transparent); transform: translateX(-150%) skewX(-18deg)"
      />
    </span>
    <span
      v-if="variant === 'overlay'"
      data-disc
      aria-hidden="true"
      class="relative flex h-[58px] w-[58px] flex-none items-center justify-center rounded-round"
      :class="discTone"
    >
      <UiIcon
        :name="discGlyph"
        size="xl"
        fill
        :weight="600"
        style="font-size: 34px"
      />
    </span>
    <span
      data-digits
      aria-hidden="true"
      class="relative"
      :class="variant === 'overlay'
        ? 'flex flex-1 justify-end'
        : 'inline-flex'"
    >
      <span
        v-for="slot in slots"
        :key="slot.pos"
        :data-pos="slot.pos"
        class="inline-block shrink-0 origin-[50%_100%] text-center"
        :class="[slotWidth(slot.sep), slot.sep && 'text-text-muted']"
      >{{ slot.char }}</span>
    </span>
    <span class="sr-only">{{ spoken }}</span>
  </div>
</template>
