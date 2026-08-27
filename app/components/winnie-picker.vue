<script lang="ts" setup>
import type { SelectWinnie } from "~~/server/db/schema";

const props = defineProps<{
  /** The selected Winnie, shown on the trigger */
  currentWinnie: SelectWinnie;
  /** Everything selectable, including `currentWinnie` */
  winnies: SelectWinnie[];
}>();

const emit = defineEmits<{
  /**
   * Emits the new currentWinnie so parent component can update the store.
   */
  "update:currentWinnie": [winnie: SelectWinnie];
}>();

const otherWinnies = computed(() =>
  props.winnies.filter(w => w.id !== props.currentWinnie.id),
);

/**
 * Reports the choice and dismisses the menu.
 * @param winnie The entry that was clicked.
 * @param close Closer handed down by `UiDropdown`'s slot scope
 * selecting an item does not dismiss the popover on its own!!
 */
function selectWinnie(winnie: SelectWinnie, close: () => void): void {
  emit("update:currentWinnie", winnie);
  close();
}
</script>

<template>
  <UiDropdown trigger-class="btn btn-neutral">
    <template #trigger>
      {{ currentWinnie.name }}
      <UiIcon name="chevron" />
    </template>

    <template #default="{ close }">
      <li v-for="winnie in otherWinnies" :key="winnie.id">
        <button @click="selectWinnie(winnie, close)">
          {{ winnie.name }}
        </button>
      </li>
    </template>
  </UiDropdown>
</template>
