<!-- app/components/ui/counter.vue -->
<script setup lang="ts">
import type UiTextInput from "~/components/ui/text-input.vue";

// The handoff's counter (#319): `-`, a typeable count over a Target, `+`. It is controlled like `UiSwitch`: it asks, the
// parent decides, and the count it shows always ends as `value`. It never fetches and applies no rule (clamp, win,
// un-win): `shared/utils/counter.ts` is the caller's. No screen uses it yet; R3 swaps it for `counter-pill.vue`.
const props = defineProps<{
  /** The count. The parent holds it: it changes only when the parent takes what `step` or `set` asked for. */
  value: number;
  /** The Target, a whole number of 1 or more. */
  target: number;
  /** What is counted, e.g. the game. Only in the names: "Decrease Boss Rush", "Boss Rush count". */
  subject?: string;
  /** The whole counter is inert and dimmed once. */
  disabled?: boolean;
}>();

const emit = defineEmits<{
  /** `-` or `+` was pressed: asked for, not done. Never while that button is disabled. */
  step: [delta: 1 | -1];
  /** A typed count was saved (Enter or blur): the whole number as typed, not clamped, and only when it differs from `value`. Asked for, not done. */
  set: [count: number];
}>();

const m = useWinniesMotion();
const input = useTemplateRef<InstanceType<typeof UiTextInput>>("input");
const well = useTemplateRef<HTMLElement>("well");
const count = useTemplateRef<HTMLElement>("count");

// `value >= target`, as `isWonByCounter`: a count above the Target reads full too.
const full = computed(() => props.target > 0 && props.value >= props.target);
const atMinimum = computed(() => props.disabled || props.value <= 0);
const atMaximum = computed(() => props.disabled || full.value);

const decreaseLabel = computed(() => props.subject
  ? `Decrease ${props.subject}`
  : "Decrease");
const increaseLabel = computed(() => props.subject
  ? `Increase ${props.subject}`
  : "Increase");
const countLabel = computed(() => props.subject
  ? `${props.subject} count`
  : "Counter");

// What the field shows, and whether the user has typed since it last showed `value`. `dirty` is not shown, so it is not
// reactive: it decides whether a change of `value` may overwrite the draft and whether a blur has anything to save.
const draft = ref<number | "">(props.value);
let dirty = false;

/**
 * Takes what the field emits as the draft. Typing is a new edit.
 * @param next what the number input emits: a number, or `""` when the text is empty or not a number
 */
function onDraft(next: string | number | null | undefined) {
  draft.value = typeof next === "number"
    ? next
    : "";
  dirty = true;
}

/**
 * Saves the edit: asks for the whole number typed when it differs from `value`. An empty or unreadable draft asks for
 * nothing. Either way the field shows `value` afterwards, once the parent has had its tick to take the count: it may
 * take it, clamp it or refuse it.
 */
async function commit() {
  if (!dirty)
    return;
  dirty = false;
  const typed = draft.value === ""
    ? Number.NaN
    : draft.value;
  if (Number.isFinite(typed)) {
    const whole = Math.trunc(typed);
    if (whole !== props.value)
      emit("set", whole);
  }
  await nextTick();
  draft.value = props.value;
}

/**
 * Enter saves and leaves the field. The blur it causes finds nothing left to save.
 * @param event the native input's `keydown`
 */
function onEnter(event: KeyboardEvent) {
  if (event.isComposing)
    return;
  void commit();
  (event.target as HTMLInputElement).blur();
}

/**
 * Esc gives the edit up: nothing is asked, nothing animates, and the field shows `value` again.
 * @param event the native input's `keydown`
 */
function onEsc(event: KeyboardEvent) {
  dirty = false;
  draft.value = props.value;
  (event.target as HTMLInputElement).blur();
}

/**
 * Focus selects the whole count, as the pill it replaces did, so a typed number replaces it.
 */
function selectAll() {
  input.value?.select();
}

/**
 * Asks for a step. A button that switches itself off under the keyboard (the Target reached by `+`, 0 by `-`) would
 * drop the focus to the page, so the focus goes to the count.
 * @param delta the direction of the step
 * @param event the click, whose button is the one to look at once the parent has answered
 */
async function press(delta: 1 | -1, event: MouseEvent) {
  const button = event.currentTarget as HTMLButtonElement;
  emit("step", delta);
  await nextTick();
  if (button.disabled)
    input.value?.focus();
}

// Not immediate: a first render draws its end state. R23 and R24 follow the prop, never the click, so a refused step plays
// nothing and a count the parent pushed (a realtime update) rolls too. Both recipes return null under reduced motion.
watch(() => props.value, (now, before) => {
  if (!dirty)
    draft.value = now;
  if (now === before)
    return;
  m.roll(count.value, Math.sign(now - before));
  if (props.target > 0 && before < props.target && now >= props.target)
    m.full(well.value);
});
</script>

<template>
  <!-- Dimmed once, here: the buttons and the count dim themselves when disabled (`!`, as their own single-class opacity is out-specified by a state variant). `aria-disabled` is what lets axe see that the dimmed `/ target`, which is no control, is part of a disabled widget. -->
  <div
    data-counter
    :aria-disabled="disabled || undefined"
    class="inline-flex items-center gap-2"
    :class="disabled && 'cursor-not-allowed opacity-45 [&_button]:opacity-100! [&_input]:opacity-100!'"
  >
    <UiIconButton
      size="sm"
      icon="remove"
      :label="decreaseLabel"
      :disabled="atMinimum"
      @click="press(-1, $event)"
    />
    <!-- The well clips the roll (R23). The jelly (R24) is on the well, the roll on `data-count`: the engine never animates the input itself. -->
    <span
      ref="well"
      data-well
      class="inline-flex h-(--icon-btn-sm) min-w-24 items-center justify-center gap-[5px] overflow-hidden rounded-pill bg-surface-sunken px-3 [font-family:var(--font-display)] text-base leading-none [font-weight:var(--font-weight-display)] text-text shadow-well"
      :class="full && 'bg-won! text-on-accent! shadow-[0_var(--lip-sm)_0_-1px_var(--color-won-lip)]!'"
    >
      <!-- The number input, flattened into the well. Its own classes are single, so `[&_input]:` beats them, but its focus and
           hover shadows are variants of a higher specificity: the shadow is `!` in every state, and the card's outline stands
           in for the ring. -->
      <span
        ref="count"
        data-count
        class="inline-flex"
      >
        <UiTextInput
          ref="input"
          variant="number"
          hide-label
          :label="countLabel"
          :model-value="draft"
          :disabled="disabled"
          class="w-auto! [&_input]:[field-sizing:content] [&_input]:h-auto [&_input]:w-[4.5ch] [&_input]:min-w-[1.6em] [&_input]:rounded-[6px] [&_input]:bg-transparent [&_input]:p-0 [&_input]:text-right [&_input]:text-inherit [&_input]:[box-shadow:none]! [&_input:focus-visible]:[outline:var(--border-thin)_solid_var(--color-focus)]! [&_input:focus-visible]:outline-offset-2"
          @update:model-value="onDraft"
          @focus="selectAll"
          @keydown.enter.prevent="onEnter"
          @keydown.esc.prevent="onEsc"
          @blur="commit"
        />
      </span>
      <span
        data-target
        aria-hidden="true"
        :class="full ? 'text-on-accent opacity-75' : 'text-text-muted'"
      >/ {{ target }}</span>
    </span>
    <!-- Butter, as the card draws it: the inline style beats the button's `[--lip:…]`, and hover and press read `--lip`. -->
    <UiIconButton
      size="sm"
      icon="add"
      :label="increaseLabel"
      :disabled="atMaximum"
      style="background:var(--color-complete);--lip:var(--color-complete-lip);color:var(--color-on-accent)"
      @click="press(1, $event)"
    />
  </div>
</template>
