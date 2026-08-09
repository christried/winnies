<script lang="ts" setup>
import type { Winnie } from "~/types/winnie";

const props = defineProps<{
  /** The selected Winnie, shown on the trigger */
  currentWinnie: Winnie;
  /** Everything selectable, including `currentWinnie` */
  winnies: Winnie[];
}>();

const emit = defineEmits<{
  /**
   * Paired with the `currentWinnie` prop so the parent can bind
   * `v-model:current-winnie`
   */
  "update:currentWinnie": [winnie: Winnie];
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
function selectWinnie(winnie: Winnie, close: () => void): void {
  emit("update:currentWinnie", winnie);
  close();
}
</script>

<template>
  <UiDropdown trigger-class="btn btn-neutral">
    <template #trigger>
      {{ currentWinnie.title }}
      <UiIcon name="chevron" />
    </template>

    <template #default="{ close }">
      <li v-for="winnie in otherWinnies" :key="winnie.id">
        <button @click="selectWinnie(winnie, close)">
          {{ winnie.title }}
        </button>
      </li>
    </template>
  </UiDropdown>
</template>
