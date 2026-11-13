<script lang="ts" setup>
defineProps<{
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
    <!-- The caller draws the trigger (a UiIconButton or a UiButton) and binds `trigger` onto it: the popover's id and the
     anchor the menu is placed against. -->
    <slot
      name="trigger"
      :trigger="{ popovertarget: id, style: `anchor-name: --${id}` }"
    />

    <ul
      :id="id"
      ref="menu"
      popover
      class="m-auto w-max border p-2 shadow-sm"
      :class="menuClass"
      :style="`position-anchor: --${id}`"
    >
      <!-- "Scoped Slot". Able to pass stuff into the parent, that fills the slot and there
     you can destructure it which is sick -->
      <slot :close="close" />
    </ul>
  </div>
</template>
