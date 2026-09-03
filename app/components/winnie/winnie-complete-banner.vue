<script setup lang="ts">
const { isComplete } = storeToRefs(useWinnieStore());
</script>

<template>
  <div v-if="isComplete" class="alert border-success bg-success/10">
    <UiIcon name="trophy" class="text-success" />
    Win-challenge complete — This is a nice space to show interesting statistics.
  </div>
</template>
