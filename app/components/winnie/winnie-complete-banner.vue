<script setup lang="ts">
const { isComplete } = storeToRefs(useWinnieStore());
</script>

<template>
  <div v-if="isComplete" class="flex items-center gap-2">
    <UiTablerIcon name="trophy" />
    Win-challenge complete — This is a nice space to show interesting statistics.
  </div>
</template>
