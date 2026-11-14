<!-- app/components/ui/win-toggle.vue -->
<script setup lang="ts">
const props = withDefaults(defineProps<{
  /** Whether the Challenge is Won. The parent holds it: the toggle only emits. */
  won: boolean;
  /** A request is in flight: the spinner turns, presses are ignored, the toggle stays focusable. */
  busy?: boolean;
  /** Stops focus, click and Space. */
  disabled?: boolean;
}>(), { busy: false, disabled: false });

const emit = defineEmits<{
  /** `next` (the opposite of `won`), asked for by a click or Space. Asked for, not done: `won` changes only if the parent takes it. */
  toggle: [next: boolean];
}>();

// The words are the component's own (`row.labels` in 06-copy.md). They are the accessible name: the disc has no text, and
// Won and Open differ by this word and by the icon's fill, never by colour alone.
const LABEL_OPEN = "Mark Won";
const LABEL_WON = "Won · undo";

// The motion of a Won change belongs to the row (C01, R17, R18: `playWon` and `playUnwon` in `utils/win-motion.ts`),
// because it moves the row's own elements and the row changes group. So the toggle starts nothing but its hover and
// press, which are CSS on the motion tokens, and the spinner (R35: the engine's `spin` loop, still under reduced motion).
const vLoop = useLoopDirective();

// The look is `button.vue`'s clay, as the handoff's `.w-win` draws it. `--lip` is the colour of the lip under the disc and
// the shadows below read it. A state's selector matches the real pseudo-class or the story's hook class (`is-hover`,
// `is-active`), so one definition serves both.
const STATE_CLASSES = {
  open: "bg-control text-text-muted [--lip:var(--color-control-lip)]",
  won: "bg-won text-on-accent [--lip:var(--color-won-lip)]",
} as const;

const LIP = "[box-shadow:0_var(--lip-md)_0_-1px_var(--lip)]";
// A disabled toggle has no lift and a lip of 2px.
const LIP_DISABLED = "[box-shadow:0_2px_0_-1px_var(--lip)]";

// R01: the lift is half of `--hover-lift` (Workspace -2px, Showcase -4px and a tilt, Broadcast and reduced motion none, by
// the token) and the lip grows as far as the disc rises. An Open toggle hints at what a press does: the check takes the
// won-text colour over a won lip. A Won toggle only lifts (the reference's `[aria-checked=true]` rule follows its hover
// rule). R02: the press collapses the lip, at once.
// The class names are written out whole: Tailwind finds them by scanning the source, so a name built from a variable is
// never generated.
const LIVELY_CLASSES = {
  open: "hovering:[&:not(:is(:active,.is-active))]:text-won-text "
    + "hovering:[&:not(:is(:active,.is-active))]:[--lip:var(--color-won-lip)] ",
  won: "",
  shared: "hovering:[&:not(:is(:active,.is-active))]:[translate:0_calc(var(--hover-lift)/2)] "
    + "hovering:[&:not(:is(:active,.is-active))]:[box-shadow:0_calc(var(--lip-md)-var(--hover-lift)/2)_0_-1px_var(--lip)] "
    + "showcase:hovering:[&:not(:is(:active,.is-active))]:-rotate-1 "
    + "[&:is(:active,.is-active)]:[translate:0_calc(var(--lip-md)-1px)] "
    + "[&:is(:active,.is-active)]:[box-shadow:0_1px_0_-1px_var(--lip)] "
    + "[&:is(:active,.is-active)]:[transition-duration:var(--dur-instant)]",
} as const;

// A disabled toggle is dimmed, and says so with its cursor as a busy one does with its own.
const DISABLED_CLASSES = "cursor-not-allowed opacity-45";
const BUSY_CLASSES = "cursor-progress";
const IDLE_CLASSES = "cursor-pointer";

// A busy toggle is not `disabled`, so it keeps its focus; it only swallows the press.
const inert = computed(() => props.busy || props.disabled);
const state = computed(() => props.won
  ? "won"
  : "open");
const cursor = computed(() => props.disabled
  ? DISABLED_CLASSES
  : props.busy
    ? BUSY_CLASSES
    : IDLE_CLASSES);
const lively = computed(() => inert.value
  ? ""
  : LIVELY_CLASSES[state.value] + LIVELY_CLASSES.shared);

/**
 * A press. A busy or disabled toggle swallows it, and `preventDefault` stops a busy toggle inside a form from submitting
 * it; otherwise the parent hears of it.
 * @param event The click, which Space on a button also makes.
 */
function onClick(event: MouseEvent) {
  if (inert.value) {
    event.preventDefault();
    event.stopPropagation();
    return;
  }
  emit("toggle", !props.won);
}
</script>

<template>
  <button
    type="button"
    role="switch"
    :aria-checked="won ? 'true' : 'false'"
    :aria-label="won ? LABEL_WON : LABEL_OPEN"
    :aria-busy="busy ? 'true' : undefined"
    :disabled="disabled"
    class="relative inline-flex size-(--toggle-size) flex-none appearance-none items-center justify-center rounded-round border-0 p-0 [transition:translate_var(--dur-hover)_var(--ease-hover),rotate_var(--dur-hover)_var(--ease-hover),box-shadow_var(--dur-fast)_var(--ease-spring),background_var(--dur-fast)_var(--ease-standard)] [&:is(:focus-visible,.is-focus)]:outline-[length:var(--focus-width)] [&:is(:focus-visible,.is-focus)]:outline-offset-[var(--focus-offset)] [&:is(:focus-visible,.is-focus)]:outline-focus [&:is(:focus-visible,.is-focus)]:outline-solid"
    :class="[
      STATE_CLASSES[state],
      disabled ? LIP_DISABLED : LIP,
      lively,
      cursor,
    ]"
    @click="onClick"
  >
    <UiIcon
      v-if="busy"
      v-loop="'spin'"
      name="progress_activity"
      size="xl"
      :weight="700"
    />
    <UiIcon
      v-else
      name="check"
      size="xl"
      :weight="700"
      :fill="won"
    />
  </button>
</template>
