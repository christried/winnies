<script lang="ts" setup>
defineProps<{

  label?: string;
  // directly applied classes on Vue Elements fall through onto the outest div hier: not what I want
  // class props solve this issue so I can style both the elements that are styleworthy
  triggerClass?: string;
  menuClass?: string;
}>();

const id = useId();

const menu = useTemplateRef<HTMLElement>("menu");

// Passed DOWN to slot so menu can be closed from inside slotted components
function close(): void {
  menu.value?.hidePopover();
}

// Passed UP so menu can be closed from parent
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
