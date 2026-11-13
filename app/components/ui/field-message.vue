<!-- app/components/ui/field-message.vue -->
<script setup lang="ts">
import type { MaterialIconName } from "~/utils/material-icons";

const props = withDefaults(defineProps<{
  /** `hint` is muted, `error` is Cherry and announced, `success` is Matcha and polite. */
  variant?: "hint" | "error" | "success";
  /** Replaces the variant's icon: `info`, `error` or `check_circle`. */
  icon?: MaterialIconName;
}>(), { variant: "hint", icon: undefined });

// `check_circle` for success is our own build: the handoff draws a hint and an error only (#312).
const DEFAULT_ICON = {
  hint: "info",
  error: "error",
  success: "check_circle",
} as const satisfies Record<"hint" | "error" | "success", MaterialIconName>;

// The template is `.w-msg` of the reference CSS: the icon and the text on one line, 6px apart; it wraps, and never widens
// its parent. No comment sits at its root: a comment next to the `<p>` can make the root a fragment, and then the
// caller's `id` (the input's `aria-describedby` target) and `class` would not fall through.

// The element exists only while there is a message, so an insert is announced and a changed text is announced again.
const role = computed(() => ({ hint: undefined, error: "alert", success: "status" })[props.variant]);
</script>

<template>
  <p
    :role="role"
    class="mt-1.5 flex items-center gap-1.5 pl-4 text-xs leading-[1.3] [font-weight:var(--font-weight-strong)]"
    :class="{
      'text-text-muted': variant === 'hint',
      'text-danger-text': variant === 'error',
      'text-won-text': variant === 'success',
    }"
  >
    <UiIcon
      :name="icon ?? DEFAULT_ICON[variant]"
      size="sm"
      :fill="variant !== 'hint'"
    />
    <span class="min-w-0 [overflow-wrap:anywhere]"><slot /></span>
  </p>
</template>
