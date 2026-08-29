<script lang="ts" setup>
const props = defineProps<{
  /** The selected Winnie, shown on the trigger */
  currentWinnie: WinnieRow;
  /** Everything selectable, including `currentWinnie` */
  winnies: WinnieRow[];
}>();

const emit = defineEmits<{
  /**
   * Emits the new currentWinnie so parent component can update the store.
   */
  "update:currentWinnie": [winnie: WinnieRow];
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
function selectWinnie(winnie: WinnieRow, close: () => void): void {
  emit("update:currentWinnie", winnie);
  close();
}
</script>

<template>
  <span v-if="otherWinnies.length < 1" class="btn pointer-events-none btn-neutral">
    {{ currentWinnie.name }}
  </span>
  <UiDropdown v-else trigger-class="btn btn-neutral">
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
