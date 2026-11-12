<script setup lang="ts">
const { wonCount, totalCount, percentComplete } = storeToRefs(useWinnieStore());
</script>

<template>
  <div class="m-2 flex flex-col gap-1">
    <p>
      {{ wonCount }} / {{ totalCount }} won · {{ percentComplete }}%
    </p>

    <div class="h-1.5 w-full overflow-hidden rounded-full">
      <div
        class="h-full rounded-full transition-all duration-300"
        :style="{ width: `${percentComplete}%` }"
      />
    </div>
  </div>
</template>
