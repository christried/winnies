<script setup lang="ts">
import type { ThemePreference } from "~~/shared/constants";
import type { ResolvedTheme } from "~/utils/theme-switch";
import { resolveTheme, stepIndex, THEME_OPTIONS } from "~/utils/theme-switch";

// The three-way theme radiogroup (#324): Light, Dark and Match system. A choice plays the theme wipe (R28) from the
// chosen radio, and the caller swaps `data-theme` at its end: this component never sets the theme, and it holds no
// state of its own. R3 places it in the account popover.
const props = defineProps<{
  /** What the person chose. The parent holds it: the switch only emits, so `aria-checked` stays until it takes the value. */
  modelValue: ThemePreference;
  /** What the system prefers: the theme "Match system" resolves to. A prop, so the component reads no `matchMedia`. */
  systemTheme: ResolvedTheme;
  /**
   * Called with the resolved theme when the page should swap: at the end of the wipe, or at once when no wipe plays
   * (reduced motion, no particle layer, or a choice that leaves the resolved theme as it is). A prop and not an event:
   * the wipe outlives this component, and a Vue emit after unmount is dropped, so a popover that closes on choose
   * would leave the stored theme changed and the page unswapped.
   */
  swap: (theme: ResolvedTheme) => void;
}>();

const emit = defineEmits<{
  /** The chosen preference, at once, on a click or an arrow key that picks another radio. */
  "update:modelValue": [value: ThemePreference];
}>();

const { m, layer } = useWinniesSurface();
const root = useTemplateRef<HTMLElement>("root");
const radios = useTemplateRef<HTMLElement[]>("radios");

// The wipe circle is painted as is, so it needs the NEXT page colour, and `var(--color-page)` would resolve under the
// current theme. The token file declares the colours under `[data-theme]` on any element, so a throwaway probe that
// sets the other theme on itself resolves it. Read, and gone, in the same synchronous step.
/**
 * The page colour of a theme, as a computed `rgb()` string.
 * @param theme the theme the page is about to take
 * @returns the colour, or "" when the group is not mounted
 */
function pageColor(theme: ResolvedTheme): string {
  const host = root.value;
  if (!host)
    return "";
  const probe = host.ownerDocument.createElement("span");
  probe.dataset.theme = theme;
  probe.setAttribute("aria-hidden", "true");
  probe.style.cssText = "position:absolute;visibility:hidden;pointer-events:none;background-color:var(--color-page)";
  host.appendChild(probe);
  const color = getComputedStyle(probe).backgroundColor;
  probe.remove();
  return color;
}

/**
 * Chooses a radio: emits the preference and plays the wipe, or swaps at once when none plays.
 * @param value the preference of the radio
 * @param radio the radio's button, whose centre the wipe grows from
 */
function choose(value: ThemePreference, radio: HTMLElement) {
  // The checked radio does nothing.
  if (value === props.modelValue)
    return;
  const current = resolveTheme(props.modelValue, props.systemTheme);
  const next = resolveTheme(value, props.systemTheme);
  emit("update:modelValue", value);
  // Props stay readable after unmount, so `swap` is read when the wipe ends, not now.
  const swap = () => props.swap(next);
  if (next === current) {
    swap();
    return;
  }
  const rect = radio.getBoundingClientRect();
  m.themeWipe(layer.value, rect.left + rect.width / 2, rect.top + rect.height / 2, pageColor(next), swap);
}

// The move is relative to the focused radio, not to `modelValue`: the parent may not have taken the last value yet.
/**
 * Arrow keys move focus to the next or previous radio and choose it.
 * @param event the key press
 * @param index the focused radio's position
 */
function onKeydown(event: KeyboardEvent, index: number) {
  const to = stepIndex(index, event.key, THEME_OPTIONS.length);
  const radio = to === null
    ? undefined
    : radios.value?.[to];
  if (to === null || !radio)
    return;
  event.preventDefault();
  radio.focus();
  choose(THEME_OPTIONS[to]!.value, radio);
}
</script>

<template>
  <!-- No transition and no animation on any state (R32): the checked fill and the focus ring change instantly. -->
  <div
    ref="root"
    role="radiogroup"
    aria-label="Theme"
    class="inline-flex gap-1 rounded-pill bg-surface-sunken p-1 shadow-well"
  >
    <button
      v-for="(option, index) in THEME_OPTIONS"
      :key="option.value"
      ref="radios"
      type="button"
      role="radio"
      :aria-checked="modelValue === option.value ? 'true' : 'false'"
      :tabindex="modelValue === option.value ? 0 : -1"
      class="inline-flex h-[42px] cursor-pointer appearance-none items-center gap-1.5 rounded-pill border-0 pr-3.5 pl-2.5 text-xs leading-none [font-weight:var(--font-weight-heavy)] whitespace-nowrap focus-visible:outline-[length:var(--focus-width)] focus-visible:outline-offset-1 focus-visible:outline-focus focus-visible:outline-solid"
      :class="modelValue === option.value
        ? 'bg-control text-text shadow-[0_var(--lip-sm)_0_-1px_var(--color-control-lip)]'
        : 'bg-transparent text-text-muted'"
      @click="choose(option.value, $event.currentTarget as HTMLElement)"
      @keydown="onKeydown($event, index)"
    >
      <UiIcon
        :name="option.icon"
        size="sm"
        fill
      />
      {{ option.label }}
    </button>
  </div>
</template>
