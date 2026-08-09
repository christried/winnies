<script lang="ts" setup>
defineProps<{
  /** Accessible name for the trigger button */
  label?: string;
  /** Classes for the trigger button. */
  triggerClass?: string;
  /** Classes for the popover <ul> */
  menuClass?: string;
}>();

const id = useId();

const menu = useTemplateRef<HTMLElement>("menu");

/**
 * Dismisses the menu. Selecting an item does not close the popover on its own!
 * Passed DOWN to slot so menu can be closed from inside slotted components
 * Passed UP by defineExpose below so parent can control closing as well.
 */
function close(): void {
  menu.value?.hidePopover();
}

defineExpose({ close });
</script>

<template>
  <div class="inline-block">
    <button
      :class="triggerClass"
      :popovertarget="id"
      :aria-label="label"
      :style="`anchor-name: --${id}`"
    >
      <slot name="trigger" />
    </button>

    <ul
      :id="id"
      ref="menu"
      popover
      class="menu dropdown w-max rounded-box border border-neutral bg-base-100 shadow-sm"
      :class="menuClass"
      :style="`position-anchor: --${id}`"
    >
      <!-- "Scoped Slot". Able to pass stuff into the parent, that fills the slot and there
     you can destructure it which is sick -->
      <slot :close="close" />
    </ul>
  </div>
</template>
