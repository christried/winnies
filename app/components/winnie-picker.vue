<script lang="ts" setup>
import type { Winnie } from "~/types/winnie";

const props = defineProps<{
  currentWinnie: Winnie;
  winnies: Winnie[];
}>();

const emit = defineEmits<{
  "update:currentWinnie": [winnie: Winnie];
}>();

const otherWinnies = computed(() =>
  props.winnies.filter(w => w.id !== props.currentWinnie.id),
);

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
