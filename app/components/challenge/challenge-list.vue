<script setup lang="ts">
const { totalCount, pending } = storeToRefs(useWinnieStore());
const showSkeleton = useDelayed(pending);
</script>

<template>
  <div v-if="showSkeleton" class="h-24 w-full skeleton" />
  <div v-else-if="totalCount === 0" class="flex flex-col items-center gap-2 py-8">
    <p class="font-semibold">
      No Challenges yet
    </p>
    <p class="type-meta">
      Add the first Challenge now.
    </p>
  </div>
  <!-- challenge components follow in a later epic -->
</template>
