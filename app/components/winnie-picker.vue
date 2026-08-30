<script lang="ts" setup>
import { DATE_FORMAT, DATE_LOCALE } from "~~/shared/constants";

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

/**
 * Formats a Winnie's creation date.
 * @param value The `createdAt` off a Winnie as an ISO string.
 * @returns The date in the user's local time.
 */
function shortDate(value: string) {
  return new Date(value).toLocaleDateString(DATE_LOCALE, DATE_FORMAT);
}
</script>

<template>
  <span v-if="otherWinnies.length < 1" class="btn pointer-events-none btn-neutral">
    {{ currentWinnie.name }}
  </span>
  <UiDropdown v-else trigger-class="btn btn-neutral">
    <template #trigger>
      <span class="max-w-56 truncate">{{ currentWinnie.name }} </span>
      <UiIcon name="chevron" />
    </template>

    <template #default="{ close }">
      <li v-for="winnie in otherWinnies" :key="winnie.id">
        <button @click="selectWinnie(winnie, close)">
          <span class="max-w-56 truncate">{{ winnie.name }}</span>
          <span class="type-meta"> {{ shortDate(winnie.createdAt) }} </span>
        </button>
      </li>
    </template>
  </UiDropdown>
</template>
