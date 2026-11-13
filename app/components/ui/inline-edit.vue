<!-- app/components/ui/inline-edit.vue -->
<script setup lang="ts">
import type { HTMLAttributes, StyleValue } from "vue";
import type UiTextInput from "~/components/ui/text-input.vue";
import { settle } from "~/utils/inline-edit";

// `class` and `style` land on the root; every other attribute and listener (`@click`, `data-*`, `id`) on the resting
// text, so R3 can open the edit from a click or a double click without this component choosing which. The component
// sets no handler of its own on the text and makes it no button: how a keyboard user reaches the edit is the screen's.
defineOptions({ inheritAttrs: false });

const props = withDefaults(defineProps<{
  /** What the text shows. The component never changes it: the caller does, once its request has come back. */
  value: string;
  /** The input's accessible name, e.g. `Winnie name`. */
  label: string;
  /** The element of the resting text, so a title is a heading of its level. */
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p";
  /** The native limit, and what the counter counts against. */
  maxlength?: number;
  /** The caller's request is in flight: the input is read-only and a spinner turns beside it. */
  saving?: boolean;
  /** The caller's message. Its presence is the error state. */
  error?: string;
}>(), {
  as: "p",
  maxlength: undefined,
  saving: false,
  error: undefined,
});

const emit = defineEmits<{
  /** Enter or blur asked to save, with the trimmed text. A blank text only comes from Enter: the caller answers it with `error`. */
  save: [value: string];
}>();

/** Whether the input is showing. Works controlled (`v-model:editing`) or not. */
const editing = defineModel<boolean>("editing", { default: false });

const m = useWinniesMotion();
const vLoop = useLoopDirective();
const attrs = useAttrs();
const field = useTemplateRef<InstanceType<typeof UiTextInput>>("field");
const well = useTemplateRef<HTMLElement>("well");
const text = useTemplateRef<HTMLElement>("text");

// The text in the input. `value` until the user types.
const draft = ref(props.value);

// What the edit session knows. Neither is shown, so neither is reactive.
// `settled`: this attempt has been taken (Enter or blur emitted, or Esc cancelled), so a second trigger of the same
// attempt is ignored. The Enter that emits `save` leaves the input open (the caller closes it), and the blur that
// follows, or the one the browser fires when the focused input is removed, must not save again.
// `saved`: a `save` was emitted, which is what earns the label its hop (R12) once the caller closes the edit. Esc and a
// blank blur clear it: they never hop.
let settled = false;
let saved = false;

/** Starts an edit session: the draft is the text on show and nothing has been asked yet. */
function begin() {
  draft.value = props.value;
  settled = false;
  saved = false;
}

/** The caret goes into the input with the whole text selected, as the prototype's `startRename` does. Focus is never animated. */
function focusIn() {
  field.value?.focus();
  field.value?.select();
}

// R11 and R12 are the engine's recipes, which return null under reduced motion: that is the whole reduced end state.
// A story that starts in editing does not animate: the first session starts at mount, and only a change plays R11.
watch(editing, async (on) => {
  if (on) {
    begin();
    await nextTick();
    focusIn();
    m.editIn(well.value?.querySelector("input") ?? null);
    return;
  }
  if (!saved)
    return;
  saved = false;
  // The text exists again only after the render, and it already shows the new value.
  await nextTick();
  m.hopText(text.value);
});

onMounted(() => {
  if (editing.value)
    focusIn();
});

// A failed save can be tried again, by Enter or by a blur: a new message, or the end of `saving` with the input still
// open, makes the next trigger a new attempt.
watch(() => props.error, () => {
  settled = false;
});
watch(() => props.saving, (now, was) => {
  if (was && !now && editing.value)
    settled = false;
});

/**
 * Takes the native input's text into the draft. Typing is a new attempt.
 * @param next what the text input emits
 */
function onModel(next: string | number | null | undefined) {
  draft.value = String(next ?? "");
  settled = false;
}

/**
 * Enter asks to save, Esc cancels. Neither happens during an input method's composition: that Enter picks a candidate.
 * @param event the native input's `keydown`
 */
function onKeydown(event: KeyboardEvent) {
  if (event.isComposing)
    return;
  if (event.key === "Enter") {
    // A rename in a form must not submit it.
    event.preventDefault();
    if (props.saving || settled)
      return;
    settled = true;
    saved = true;
    emit("save", settle(draft.value, "enter").value);
    return;
  }
  if (event.key === "Escape") {
    // The edit gets the Escape and nothing else does: a rename inside a modal must not close the modal.
    event.preventDefault();
    event.stopPropagation();
    // The caller's request is out, and its answer needs the input open to show an error in.
    if (props.saving)
      return;
    settled = true;
    saved = false;
    draft.value = props.value;
    editing.value = false;
  }
}

/** A blur saves, unless the text is blank, which gives the edit up. It is ignored when this attempt is already settled, while saving, and once the input is gone (Chrome blurs a removed input). */
function onBlur() {
  if (settled || props.saving || !editing.value)
    return;
  const result = settle(draft.value, "blur");
  if (result.action === "save") {
    settled = true;
    saved = true;
    emit("save", result.value);
    return;
  }
  saved = false;
  draft.value = props.value;
  editing.value = false;
}

/**
 * What the caller styled the component with.
 * @returns `class` and `style`, for the root
 */
function rootBindings() {
  return { class: attrs.class as HTMLAttributes["class"], style: attrs.style as StyleValue };
}

/**
 * Everything the caller put on the component except `class` and `style`.
 * @returns the attributes and listeners of the resting text
 */
function textBindings() {
  return Object.fromEntries(Object.entries(attrs).filter(([key]) => key !== "class" && key !== "style"));
}

defineExpose({
  /**
   * Opens the edit, for a menu's Rename.
   */
  edit: () => {
    editing.value = true;
  },
});
</script>

<template>
  <!-- The default size is the reference's `text-xl`, at no specificity so that a size class on the root wins. The fill is the raised one the handoff gives an editing title; the rest of the input is the `inline` variant's. -->
  <div
    class="min-w-0 [&_input]:bg-surface-raised [:where(&)]:text-xl"
    :aria-busy="editing && saving ? 'true' : undefined"
    v-bind="rootBindings()"
  >
    <div
      v-if="editing"
      ref="well"
      class="flex items-start gap-3"
    >
      <UiTextInput
        ref="field"
        variant="inline"
        hide-label
        :label="label"
        :model-value="draft"
        :maxlength="maxlength"
        :counter="maxlength"
        :error="error"
        hint="Enter saves · Esc cancels"
        :readonly="saving"
        class="min-w-0 flex-1"
        @update:model-value="onModel"
        @keydown="onKeydown"
        @blur="onBlur"
      />
      <!-- Our own build: the handoff lists `saving` and draws none. The button's spinner, centred on the 50px well. -->
      <span v-if="saving" class="flex h-(--btn-h) flex-none items-center">
        <UiIcon
          v-loop="'spin'"
          name="progress_activity"
          size="md"
        />
      </span>
    </div>
    <!-- The padding is negative-margined away, so the text sits where it would without the hover fill. `1lh` keeps one line of height for an empty value. -->
    <component
      :is="as"
      v-else
      ref="text"
      class="mx-[calc(var(--space-3)*-1)] my-[calc(var(--space-1)*-1)] block min-h-[calc(1lh+var(--space-2))] w-fit cursor-text rounded-sm px-(--space-3) py-(--space-1) [font-family:var(--font-display)] leading-(--leading-label) [font-weight:var(--font-weight-display)] [overflow-wrap:anywhere] text-text hover:bg-surface-sunken"
      v-bind="textBindings()"
    >
      {{ value }}
    </component>
  </div>
</template>
