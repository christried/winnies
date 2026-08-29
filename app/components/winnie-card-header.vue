<script setup lang="ts">
const winnieStore = useWinnieStore();
const { currentWinnie, runningCount, isComplete } = storeToRefs(winnieStore);
</script>

<template>
  <div
    v-if="currentWinnie"
    class="card m-4 flex flex-col gap-2 bg-base-200 p-4"
    :class="isComplete && 'border border-success bg-success/10'"
  >
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <h2 class="truncate text-base font-semibold">
          {{ currentWinnie.name }}
        </h2>

        <p class="type-meta">
          {{ new Date(currentWinnie.createdAt).toLocaleDateString() }}
          <PulseIndicator v-if="runningCount > 0" :count="runningCount" />
          <!-- Test Indicator to keep running until Challenges are added
             TODO: REMOVE THAT -->
          <PulseIndicator v-if="true" :count="4" />
        </p>
      </div>

      <div class="flex shrink-0 items-center gap-2">
        <TimerDisplay
          :seconds="5"
          size="total"
          status="running"
        />
        <button
          type="button"
          class="btn btn-circle btn-lg"
          aria-label="Start Winnie"
        >
          <UiIcon name="play" />
        </button>
        <!-- Overflow Menu deferred to later  -->
        <WinnieOverflowMenu />
      </div>
    </div>
  </div>
</template>
