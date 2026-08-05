<!-- app/components/ui/icon-button.vue -->
<script setup lang="ts">
import type { IconName } from "~/utils/icons";

const props = defineProps<{
  icon: IconName;
  label: string;
}>();
</script>

<template>
  <button class="btn btn-square" :aria-label="props.label">
    <UiIcon :name="icon" />
  </button>
</template>
