<!-- app/components/ui/icon-button.vue -->
<script setup lang="ts">
import type { MaterialIconName } from "~/utils/material-icons";

// The handoff's round icon button (#310). It is `UiButton`'s icon-only form: the press, the busy spinner, the click guard,
// the lift, the release jelly and the focus ring live once, in `ui/button.vue`. No `click` emit and no `type` prop here:
// `onClick`, `type`, `class`, `style`, `popovertarget` and `data-*` fall through to the one root, which the tooltip (#311)
// wraps next.
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

// The handoff's names for the button's own: an icon button's neutral colour is the `secondary` button's.
const VARIANTS = { default: "secondary", primary: "primary", ghost: "ghost" } as const;
const SIZES = { default: "md", sm: "sm" } as const;
</script>

<template>
  <UiButton
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
</template>
