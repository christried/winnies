<!-- app/components/ui/state-pill.vue -->
<script setup lang="ts">
import type { StatePillVariant } from "~/utils/state-pill";
import { STATE_PILLS } from "~/utils/state-pill";

// The handoff's `state-pill` (03-components.md): one pill that says a state with a colour, an icon and a word, so no
// state reads by colour alone (07-accessibility.md). The size is the Shared View prototype's, which wins over the
// reference CSS (34px and `--text-sm`, not 28px and `--text-xs`). It is a label, not a control and not a live region:
// it has no hover, press or focus, and the page's own polite region announces a change. Its props carry behaviour and
// it never fetches.
const props = defineProps<{
  /** Which state: its colour, icon and built-in word. The default slot replaces the word, e.g. `Running · 2`. */
  variant: StatePillVariant;
}>();

// A directive cannot inject, so the component asks for it here.
const vLoop = useLoopDirective();

const pill = computed(() => STATE_PILLS[props.variant]);

// The colours of each variant, tokens only: light, dark and the dialects come with them. Only Running and Complete have
// the clay lip, as in the prototype's summary pill. The shadow of Paused is a ring, and Gone has none: its dashed
// outline, drawn inside the box, is the shape cue that makes it read beside the others.
const VARIANT_CLASSES = {
  running: "bg-accent text-on-accent [box-shadow:0_3px_0_-1px_var(--color-accent-lip)]",
  paused: "bg-surface-sunken text-text [box-shadow:inset_0_0_0_var(--border-thin)_var(--color-border)]",
  complete: "bg-complete text-on-accent [box-shadow:0_3px_0_-1px_var(--color-complete-lip)]",
  won: "bg-won text-on-accent",
  pinned: "bg-pinned text-on-accent",
  gone: "bg-transparent text-gone-text outline-dashed outline-gone-border outline-[length:var(--border-thin)] -outline-offset-2",
  error: "bg-danger-surface text-danger-text",
  offline: "bg-offline-surface text-offline-text",
  loading: "bg-surface-sunken text-text",
} as const satisfies Record<StatePillVariant, string>;
</script>

<template>
  <!-- One icon element for all nine, so a pill that changes state keeps the node and `v-loop`'s falsy value stops the
       spin (R35). The spinner is the engine's `spin` loop on the icon, as `UiButton` draws it: reduced motion creates
       nothing, and the word "Loading…" carries the state. -->
  <span
    :data-state="variant"
    :aria-busy="variant === 'loading' ? 'true' : undefined"
    class="inline-flex h-[34px] flex-none items-center gap-1.5 rounded-pill pr-[15px] pl-2.5 font-body text-sm leading-none [font-weight:var(--font-weight-heavy)] whitespace-nowrap"
    :class="VARIANT_CLASSES[variant]"
  >
    <UiIcon
      v-loop="variant === 'loading' && 'spin'"
      :name="pill.icon"
      size="sm"
      fill
      :weight="600"
    />
    <slot>{{ pill.word }}</slot>
  </span>
</template>
