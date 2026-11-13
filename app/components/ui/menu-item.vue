<!-- app/components/ui/menu-item.vue -->
<script setup lang="ts">
import type { MaterialIconName } from "~/utils/material-icons";

// An item of `UiMenu` (#313), also its separator. A real <button role="menuitem">, so Enter and Space are its click and
// `class`, `data-*` and `@click` of the caller fall through to it: no `click` emit is declared. The menu owns the focus
// (`tabindex="-1"`, it moves it with the keys) and reads `[data-menu-label]` for type-ahead.
// The look is the prototype's item: 44px, radius 22px (no token). Hover and focus fill with the sunken colour and the ring
// sits inside the item (offset -2px), so the panel's `overflow` never clips it. R32: no transition on either. A state's
// selector matches the real pseudo-class or the story's hook class (`is-hover`, `is-focus`). No comment sits between the
// two roots of the template: it would make the root a fragment, and `@click` would reach no button.
withDefaults(defineProps<{
  /** The leading glyph. */
  icon?: MaterialIconName;
  /** Right-aligned text: a date, a shortcut, "soon". */
  meta?: string;
  /** The marked item: a sunken fill, a trailing check and `aria-current`. Opening the menu focuses it. */
  current?: boolean;
  /** Cherry text. The word and the icon carry it too. */
  danger?: boolean;
  /** Takes no focus and no click, and every key skips it. */
  disabled?: boolean;
  /** Draws a rule instead; every other prop is ignored. */
  separator?: boolean;
}>(), {
  icon: undefined,
  meta: undefined,
  current: false,
  danger: false,
  disabled: false,
  separator: false,
});
</script>

<template>
  <div
    v-if="separator"
    role="separator"
    class="mx-2.5 my-1 h-0.5 flex-none rounded-[2px] bg-surface-sunken"
  />
  <button
    v-else
    type="button"
    role="menuitem"
    tabindex="-1"
    :disabled="disabled"
    :aria-current="current ? 'true' : undefined"
    class="flex h-11 w-full flex-none appearance-none items-center gap-3 rounded-[22px] border-0 px-3.5 text-left font-body text-sm leading-none [font-weight:var(--font-weight-strong)] disabled:cursor-not-allowed disabled:opacity-45 [&:is(:focus,.is-focus)]:bg-surface-sunken [&:is(:focus-visible,.is-focus)]:outline-[length:var(--focus-width)] [&:is(:focus-visible,.is-focus)]:-outline-offset-2 [&:is(:focus-visible,.is-focus)]:outline-focus [&:is(:focus-visible,.is-focus)]:outline-solid [&:is(:hover,.is-hover):not(:disabled)]:bg-surface-sunken"
    :class="[
      current ? 'bg-surface-sunken' : 'bg-transparent',
      danger ? 'text-danger-text' : 'text-text',
      disabled ? '' : 'cursor-pointer',
    ]"
  >
    <UiIcon
      v-if="icon"
      :name="icon"
      size="md"
    />
    <span data-menu-label class="min-w-0 flex-1 truncate text-left">
      <slot />
    </span>
    <span
      v-if="meta"
      class="flex-none text-2xs [font-weight:var(--font-weight-heavy)] text-text-muted"
    >{{ meta }}</span>
    <UiIcon
      v-if="current"
      name="check"
      size="md"
      :weight="700"
    />
  </button>
</template>
