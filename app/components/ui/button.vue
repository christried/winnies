<!-- app/components/ui/button.vue -->
<script setup lang="ts">
import type { MaterialIconName } from "~/utils/material-icons";

const props = withDefaults(defineProps<{
  /** The colour: `primary` for the one action of a surface, `secondary` for the rest, `ghost` for a quiet one such as Cancel. */
  variant?: "primary" | "secondary" | "won" | "pinned" | "danger" | "ghost";
  /** Height: `sm` 38px, `md` 50px, `lg` 62px. */
  size?: "sm" | "md" | "lg";
  /** A leading icon. While `busy` the spinner takes its place. */
  icon?: MaterialIconName;
  /** A trailing icon, usually a caret. */
  trailingIcon?: MaterialIconName;
  /** The action is running: the spinner turns, presses are ignored, the button stays focusable. */
  busy?: boolean;
  /** The word shown while `busy`, e.g. "Creating…". Without it the label stays. */
  busyLabel?: string;
  /** Stops focus, click and Enter or Space. For `href` it is `aria-disabled` and the link goes nowhere. */
  disabled?: boolean;
  /** Renders a link (`<a>`) instead of a `<button>`. */
  href?: string;
  /** The button's `type`; a link has none. */
  type?: "button" | "submit" | "reset";
  /** A round button that draws one icon and no label; use `UiIconButton`, which makes the label required. */
  iconOnly?: boolean;
}>(), {
  variant: "secondary",
  size: "md",
  icon: undefined,
  trailingIcon: undefined,
  busy: false,
  busyLabel: undefined,
  disabled: false,
  href: undefined,
  type: "button",
  iconOnly: false,
});

const emit = defineEmits<{
  /** A press that took effect: never while `busy` or `disabled`. */
  click: [event: MouseEvent];
}>();

const vLoop = useLoopDirective();
const m = useWinniesMotion();
const root = useTemplateRef<HTMLElement>("root");

// The look of each variant and size, in one place so the icon-only form (#310) adds its cases beside them and does not copy them.
// Colours are tokens only: light, dark and the dialects come with them. `--lip` is the colour of the clay lip under
// the button; the shadows below read it. A state's selector matches the real pseudo-class or the story's hook class
// (`is-hover`, `is-active`), so one definition serves both.
const VARIANT_CLASSES = {
  primary: "bg-accent text-on-accent [--lip:var(--color-accent-lip)]",
  secondary: "bg-control text-text [--lip:var(--color-control-lip)]",
  won: "bg-won text-on-accent [--lip:var(--color-won-lip)]",
  pinned: "bg-pinned text-on-accent [--lip:var(--color-pinned-lip)]",
  danger: "bg-danger-surface text-danger-text [--lip:var(--color-danger)]",
  // No lip, no lift: the one variant whose hover and press change the colour instead.
  ghost: "bg-transparent text-text",
} as const satisfies Record<NonNullable<typeof props.variant>, string>;

const LIP = "[box-shadow:0_var(--btn-lip)_0_-1px_var(--lip),inset_0_4px_6px_var(--color-highlight)]";
// A disabled button has no lift and a lip of 2px.
const LIP_DISABLED = "[box-shadow:0_2px_0_-1px_var(--lip)]";

// What hover and press do. They are left off a busy or disabled button, so no selector has to rule those out. R01: the
// lift is half of `--hover-lift` (Workspace -2px, Showcase -4px and a tilt, Broadcast and reduced motion none, by the
// token), and the lip grows as far as the button rises. R02: the press collapses the lip, at once. A toggled-on button
// (`aria-pressed="true"`, #310) holds that press-down look, so it matches where `:active` does and never lifts.
const LIVELY_CLASSES = {
  clay: "[&:is(:hover,.is-hover):not(:is(:active,.is-active,[aria-pressed=true]))]:[translate:0_calc(var(--hover-lift)/2)] "
    + "[&:is(:hover,.is-hover):not(:is(:active,.is-active,[aria-pressed=true]))]:[box-shadow:0_calc(var(--btn-lip)-var(--hover-lift)/2)_0_-1px_var(--lip),inset_0_4px_6px_var(--color-highlight)] "
    + "showcase:[&:is(:hover,.is-hover):not(:is(:active,.is-active,[aria-pressed=true]))]:-rotate-1 "
    + "[&:is(:active,.is-active,[aria-pressed=true])]:[translate:0_calc(var(--btn-lip)-1px)] "
    + "[&:is(:active,.is-active,[aria-pressed=true])]:[box-shadow:0_1px_0_-1px_var(--lip)] "
    + "[&:is(:active,.is-active,[aria-pressed=true])]:[transition-duration:var(--dur-instant)]",
  ghost: "[&:is(:hover,.is-hover):not(:is(:active,.is-active,[aria-pressed=true]))]:bg-[color-mix(in_oklab,var(--color-text)_9%,transparent)] "
    + "[&:is(:active,.is-active,[aria-pressed=true])]:bg-[color-mix(in_oklab,var(--color-text)_14%,transparent)] "
    + "[&:is(:active,.is-active,[aria-pressed=true])]:shadow-well",
} as const;

// A disabled button is dimmed, and says so with its cursor as a busy one does with its own.
const DISABLED_CLASSES = "cursor-not-allowed opacity-45";
const BUSY_CLASSES = "cursor-progress";
const IDLE_CLASSES = "cursor-pointer";

const SIZE_CLASSES = {
  sm: "h-(--btn-h-sm) px-4 text-sm [--btn-lip:4px]",
  md: "h-(--btn-h) px-(--btn-pad-x) text-(length:--btn-text)",
  lg: "h-(--btn-h-lg) px-[30px] text-xl [--btn-lip:8px]",
} as const satisfies Record<NonNullable<typeof props.size>, string>;

// The round form: a square of the icon-button token with no padding, and `rounded-pill` on a square is the circle. It
// replaces SIZE_CLASSES and LEADING_CLASSES, so no class order decides between them. `lg` has no icon-only form and takes
// `md`'s.
const ICON_ONLY_CLASSES = {
  sm: "size-(--icon-btn-sm) p-0 [--btn-lip:4px]",
  md: "size-(--icon-btn) p-0",
  lg: "size-(--icon-btn) p-0",
} as const satisfies Record<NonNullable<typeof props.size>, string>;

// A leading icon takes the left padding in: the reference's 16px at md, 22px at lg (sm is 16px already).
const LEADING_CLASSES = {
  sm: "",
  md: "pl-4",
  lg: "pl-[22px]",
} as const satisfies Record<NonNullable<typeof props.size>, string>;

// Inside a button the icons are the 700 weight, and the 600 cut stands in for it (#308).
const ICON_SIZE = { sm: "md", md: "md", lg: "xl" } as const satisfies Record<NonNullable<typeof props.size>, "md" | "xl">;

// The round form draws its icon at 600, which has its own cut: the handoff's `.w-btn--icon .w-ico`, 28px, 22px at sm.
const iconSize = computed(() => props.iconOnly
  ? (props.size === "sm"
      ? "md"
      : "lg")
  : ICON_SIZE[props.size]);
const iconWeight = computed(() => props.iconOnly ? 600 : 700);

const hasLeading = computed(() => !props.iconOnly && (props.busy || !!props.icon));

// A busy or disabled link is not clickable, and a busy button is not `disabled`, so it keeps its focus.
const inert = computed(() => props.busy || props.disabled);
const cursor = computed(() => props.disabled
  ? DISABLED_CLASSES
  : props.busy
    ? BUSY_CLASSES
    : IDLE_CLASSES);
const clay = computed(() => props.variant !== "ghost");
// What hover and press do, for a button that is neither busy nor disabled.
const lively = computed(() => inert.value
  ? ""
  : LIVELY_CLASSES[clay.value
    ? "clay"
    : "ghost"]);

/**
 * A press. A busy or disabled button swallows it, and `preventDefault` is what stops a busy submit button from
 * submitting its form and a link from navigating; otherwise the jelly (R02) plays and the parent hears of it.
 * @param event The click, which Enter and Space on a button also make.
 */
function onClick(event: MouseEvent) {
  if (inert.value) {
    event.preventDefault();
    event.stopPropagation();
    return;
  }
  m.release(root.value);
  emit("click", event);
}
</script>

<template>
  <component
    :is="href ? 'a' : 'button'"
    ref="root"
    :href="href"
    :type="href ? undefined : type"
    :disabled="href ? undefined : disabled"
    :aria-disabled="href && inert ? 'true' : undefined"
    :aria-busy="busy ? 'true' : undefined"
    class="relative inline-flex flex-none appearance-none items-center justify-center gap-2 rounded-pill border-0 [font-family:var(--btn-font)] leading-none [font-weight:var(--font-weight-display)] whitespace-nowrap no-underline [transition:translate_var(--dur-hover)_var(--ease-hover),rotate_var(--dur-hover)_var(--ease-hover),box-shadow_var(--dur-fast)_var(--ease-spring),background_var(--dur-fast)_var(--ease-standard)] [&:is(:focus-visible,.is-focus)]:outline-[length:var(--focus-width)] [&:is(:focus-visible,.is-focus)]:outline-offset-[var(--focus-offset)] [&:is(:focus-visible,.is-focus)]:outline-focus [&:is(:focus-visible,.is-focus)]:outline-solid"
    :class="[
      VARIANT_CLASSES[variant],
      clay ? (disabled ? LIP_DISABLED : LIP) : '',
      lively,
      iconOnly ? ICON_ONLY_CLASSES[size] : SIZE_CLASSES[size],
      hasLeading ? LEADING_CLASSES[size] : '',
      cursor,
    ]"
    @click="onClick"
  >
    <UiIcon
      v-if="busy"
      v-loop="'spin'"
      name="progress_activity"
      :size="iconSize"
      :weight="iconWeight"
    />
    <UiIcon
      v-else-if="icon"
      :name="icon"
      :size="iconSize"
      :weight="iconWeight"
    />
    <!-- An icon-only button has no busy word, and a slotted glyph must not sit beside the spinner. -->
    <template v-if="busy && busyLabel && !iconOnly">
      {{ busyLabel }}
    </template>
    <slot v-else-if="!(iconOnly && busy)" />
    <UiIcon
      v-if="trailingIcon && !iconOnly"
      :name="trailingIcon"
      :size="iconSize"
      :weight="iconWeight"
    />
  </component>
</template>
