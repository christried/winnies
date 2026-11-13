<!-- app/components/ui/text-input.vue -->
<script setup lang="ts">
import type { HTMLAttributes, StyleValue } from "vue";
import { counterState, numberValue } from "~/utils/text-input";

// `class` and `style` land on the root, everything else (`aria-*`, `data-*`, `autofocus`, `min`, vee-validate's
// `nameAttrs`, `onBlur`, `onKeydown`, ...) on the native input. So the only emit is `update:modelValue`: a declared
// `blur` or `input` emit would be taken out of the attrs and never reach the input.
defineOptions({ inheritAttrs: false });

const props = withDefaults(defineProps<{
  /** Accessible name: the visible label, or the `aria-label` when `hideLabel` is set. */
  label: string;
  /** No visible label row: the label is the input's `aria-label`. */
  hideLabel?: boolean;
  /** `number` is a 110px Mochiy well, `inline` is the 50px well inside rows and edit cards. */
  variant?: "default" | "number" | "inline";
  /** The native placeholder, which is also what the e2e tests find the field by. */
  placeholder?: string;
  /** The native limit, which stops typing. A field with a `counter` has none. */
  maxlength?: number;
  /** Dims the well and stops focus and typing. No hover ring. */
  disabled?: boolean;
  /** Keeps focus, selection and the hover ring, and stops typing. */
  readonly?: boolean;
  /** The message under the input, in Cherry. A truthy `error` is the error state. */
  error?: string;
  /** Wins over `hint`, loses to `error`. */
  success?: string;
  /** The muted line under the input. Loses to `success` and `error`. */
  hint?: string;
  /** The limit the counter counts against: shows `n / limit`, Cherry above it. */
  counter?: number;
}>(), {
  hideLabel: false,
  variant: "default",
  placeholder: undefined,
  maxlength: undefined,
  disabled: false,
  readonly: false,
  error: undefined,
  success: undefined,
  hint: undefined,
  counter: undefined,
});

/** `undefined` and `null` show as empty. The number variant emits a number when the text parses and `""` when empty. */
const model = defineModel<string | number | null | undefined>();

const attrs = useAttrs();
const uid = useId();
const inputId = `${uid}-input`;
const messageId = `${uid}-message`;
const counterId = `${uid}-counter`;

const m = useWinniesMotion();
const input = useTemplateRef<HTMLInputElement>("input");

const isNumber = computed(() => props.variant === "number");

// What the user typed, kept while it still stands for the model: a number input holding `1.0` has the model `1`, and
// writing "1" back would eat the zero the user is on the way to a `1.05` with.
const typed = ref<string>();
const shown = computed(() => {
  const value = model.value ?? "";
  if (typed.value !== undefined) {
    const same = isNumber.value
      ? numberValue(typed.value) === value
      : typed.value === value;
    if (same)
      return typed.value;
  }
  return String(value);
});

/**
 * Takes the native input's text into the model.
 * @param event the native `input` event, whose target is the input
 */
function onInput(event: Event) {
  const text = (event.target as HTMLInputElement).value;
  typed.value = text;
  model.value = isNumber.value
    ? numberValue(text)
    : text;
}

const message = computed(() => {
  if (props.error)
    return { variant: "error", text: props.error } as const;
  if (props.success)
    return { variant: "success", text: props.success } as const;
  if (props.hint)
    return { variant: "hint", text: props.hint } as const;
  return null;
});

const invalid = computed(() => Boolean(props.error));
const count = computed(() => props.counter === undefined
  ? null
  : counterState(String(model.value ?? ""), props.counter));

// Only the ids of what is rendered: an id with no element behind it describes nothing.
const describedBy = computed(() => [
  message.value ? messageId : null,
  count.value ? counterId : null,
]
  .filter(Boolean)
  .join(" ") || undefined);

/**
 * What the caller styled the component with.
 * @returns `class` and `style`, for the root
 */
function rootBindings() {
  return { class: attrs.class as HTMLAttributes["class"], style: attrs.style as StyleValue };
}

/**
 * Everything the caller put on the component except `class` and `style`, then what this component owns: the caller
 * does not pass `id`, `aria-invalid` or `aria-describedby`, and if it does the input's own wins.
 * @returns the attributes and listeners of the native input
 */
function inputBindings() {
  const rest = Object.fromEntries(Object.entries(attrs).filter(([key]) => key !== "class" && key !== "style"));
  const callers = [rest.onInput].flat().filter((listener): listener is (event: Event) => void => typeof listener === "function");
  return {
    ...rest,
    // The model first, then the caller's own `onInput` (vee-validate's among them), which then reads the new value.
    "onInput": (event: Event) => {
      onInput(event);
      for (const listener of callers)
        listener(event);
    },
    "id": inputId,
    "aria-label": props.hideLabel
      ? props.label
      : undefined,
    "aria-invalid": invalid.value
      ? ("true" as const)
      : undefined,
    "aria-describedby": describedBy.value,
  };
}

// The input's classes, in the template. No `transition` and no `animation` on any state (R32): the rings appear at once.
// The ring is a box-shadow on the well, like the reference; the transparent outline is what forced-colors mode draws.
// The Cherry ring wins on a focused field in error. Hover shows only on a field that is neither focused nor in error: a
// hover rule that stacked more variants than the focus one would out-specify it, and a field clicked into would show no
// focus ring.

// R33: the error shakes once, when its message appears or changes. Not on first render, so a page that loads in error
// stays still. The ring and the message are there at once and the shake runs on top; reduced motion makes no animation.
watch(() => props.error, (next, previous) => {
  if (next && next !== previous)
    m.shake(input.value);
});

defineExpose({
  /**
   * Puts the caret in the input.
   * @returns nothing
   */
  focus: () => input.value?.focus(),
  /**
   * Selects the whole text.
   * @returns nothing
   */
  select: () => input.value?.select(),
});
</script>

<template>
  <div
    class="min-w-0"
    :class="isNumber && 'w-[110px]'"
    v-bind="rootBindings()"
  >
    <div v-if="!hideLabel" class="mb-1.5 flex items-baseline justify-between gap-3 px-2">
      <label :for="inputId" class="text-sm leading-[1.4] [font-weight:var(--font-weight-heavy)]">{{ label }}</label>
      <span
        v-if="count"
        :id="counterId"
        class="[font-family:var(--font-display)] text-xs leading-[1.45] [font-weight:var(--font-weight-display)]"
        :class="count.over ? 'text-danger-text' : 'text-text-muted'"
      >{{ count.text }}<span v-if="count.over" class="sr-only"> over the limit</span></span>
    </div>

    <input
      ref="input"
      :value="shown"
      :type="isNumber ? 'number' : 'text'"
      :placeholder="placeholder"
      :maxlength="maxlength"
      :disabled="disabled"
      :readonly="readonly"
      class="box-border block w-full min-w-0 appearance-none rounded-pill border-0 bg-surface-sunken text-text caret-focus shadow-well outline-none placeholder:text-text-muted focus-visible:shadow-[var(--shadow-well),0_0_0_var(--focus-width)_var(--color-focus)] focus-visible:outline-[length:var(--focus-width)] focus-visible:outline-transparent focus-visible:outline-solid enabled:not-aria-invalid:not-focus-visible:hover:shadow-[var(--shadow-well),0_0_0_var(--border-thin)_var(--color-border)] disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:shadow-[var(--shadow-well),0_0_0_var(--focus-width)_var(--color-danger)] aria-invalid:focus-visible:shadow-[var(--shadow-well),0_0_0_var(--focus-width)_var(--color-danger)]"
      :class="{
        'h-(--input-h) px-(--input-pad-x) text-base leading-none [font-weight:var(--font-weight-strong)]': variant === 'default',
        'h-(--input-h) [appearance:textfield] px-4 text-center [font-family:var(--font-display)] text-base leading-none [font-weight:var(--font-weight-display)] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none': variant === 'number',
        'h-(--btn-h) px-[18px] text-md leading-none [font-weight:var(--font-weight-strong)]': variant === 'inline',
      }"
      v-bind="inputBindings()"
    >

    <div v-if="message || (hideLabel && count)" class="flex items-start justify-between gap-3">
      <UiFieldMessage
        v-if="message"
        :id="messageId"
        :variant="message.variant"
        class="min-w-0 flex-1"
      >
        {{ message.text }}
      </UiFieldMessage>
      <span
        v-if="hideLabel && count"
        :id="counterId"
        class="mt-1.5 ml-auto pr-2 [font-family:var(--font-display)] text-xs leading-[1.45] [font-weight:var(--font-weight-display)]"
        :class="count.over ? 'text-danger-text' : 'text-text-muted'"
      >{{ count.text }}<span v-if="count.over" class="sr-only"> over the limit</span></span>
    </div>
  </div>
</template>
