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
 * Reports the choice. The menu has closed by itself.
 * @param winnie The entry that was clicked.
 */
function selectWinnie(winnie: WinnieRow): void {
  emit("update:currentWinnie", winnie);
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
  <span v-if="otherWinnies.length < 1" class="pointer-events-none">
    {{ currentWinnie.name }}
  </span>
  <UiMenu
    v-else
    wide
    align="start"
  >
    <template #trigger="{ trigger }">
      <!-- A name and a caret, so not an icon button. The accessible name stays the Winnie's name. -->
      <UiButton
        v-bind="trigger"
        variant="secondary"
        trailing-icon="expand_more"
      >
        <span class="max-w-56 truncate">{{ currentWinnie.name }}</span>
      </UiButton>
    </template>

    <UiMenuItem
      v-for="winnie in otherWinnies"
      :key="winnie.id"
      :meta="shortDate(winnie.createdAt)"
      @click="selectWinnie(winnie)"
    >
      {{ winnie.name }}
    </UiMenuItem>
  </UiMenu>
</template>
