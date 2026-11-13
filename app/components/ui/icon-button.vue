<!-- app/components/ui/icon-button.vue -->
<script setup lang="ts">
import type { StyleValue } from "vue";
import type { MaterialIconName } from "~/utils/material-icons";
import type { TooltipTrigger } from "~/utils/tooltip";
import { mergeProps } from "vue";
import { joinAnchorNames } from "~/utils/tooltip";

// The handoff's round icon button (#310). It is `UiButton`'s icon-only form: the press, the busy spinner, the click guard,
// the lift, the release jelly and the focus ring live once, in `ui/button.vue`. No `click` emit and no `type` prop here:
// what a caller binds (`onClick`, `onKeydown`, `type`, `id`, `aria-*`, `class`, `style`, `data-*`: a menu's trigger
// binding is all of these) lands on the one `<button>`, as if there were no tooltip. The tooltip (#311) wraps the button
// in a fragment, so the root no longer takes the attributes by itself: `bound` merges them with the tooltip's. The bubble
// repeats the `aria-label`, so it does not describe the button: a caller's own `aria-describedby` is the only description.
defineOptions({ inheritAttrs: false });

withDefaults(defineProps<{
  /** The glyph. Leave it out when the default slot draws one, such as a tabler icon that has no Material counterpart. */
  icon?: MaterialIconName;
  /** The accessible name, set as `aria-label`. There is no `title`: the tooltip (#311) shows it. */
  label: string;
  /** The colour: `default` for a control, `primary` for the one action of a surface, `ghost` for a quiet one such as a menu trigger. */
  variant?: "default" | "primary" | "ghost";
  /** Diameter: `default` 52px, `sm` 38px. */
  size?: "default" | "sm";
  /** A toggle: sets `aria-pressed` and holds the press-down look. Absent means the button is not a toggle. */
  pressed?: boolean;
  /** The action is running: the spinner replaces the glyph, presses are ignored, the button stays focusable. */
  busy?: boolean;
  /** Stops focus, click and Enter or Space. */
  disabled?: boolean;
}>(), {
  icon: undefined,
  variant: "default",
  size: "default",
  // Not `false`: Vue casts an absent Boolean to `false`, and `aria-pressed="false"` would make every icon button a toggle.
  pressed: undefined,
  busy: false,
  disabled: false,
});

const attrs = useAttrs();

// The handoff's names for the button's own: an icon button's neutral colour is the `secondary` button's.
const VARIANTS = { default: "secondary", primary: "primary", ghost: "ghost" } as const;
const SIZES = { default: "md", sm: "sm" } as const;

/**
 * Everything the button gets: the tooltip's binding and the caller's attributes, `on*` handlers and `class` joined. Both
 * can anchor a popover to this button (a menu's trigger sets `anchor-name`, and so does the tooltip), and `anchor-name` is
 * a list, so the style is joined by name and not merged by property.
 * @param trigger the tooltip's binding
 * @returns the attributes for `UiButton`
 */
function bound(trigger: TooltipTrigger) {
  return {
    ...mergeProps(trigger as unknown as Record<string, unknown>, attrs),
    style: joinAnchorNames(attrs.style as StyleValue | undefined, trigger.style["anchor-name"]),
  };
}
</script>

<template>
  <UiTooltip
    v-slot="{ trigger }"
    :text="label"
    :describes="false"
  >
    <UiButton
      v-bind="bound(trigger)"
      icon-only
      :variant="VARIANTS[variant]"
      :size="SIZES[size]"
      :icon="icon"
      :busy="busy"
      :disabled="disabled"
      :aria-label="label"
      :aria-pressed="pressed === undefined ? undefined : String(pressed)"
    >
      <slot />
    </UiButton>
  </UiTooltip>
</template>
