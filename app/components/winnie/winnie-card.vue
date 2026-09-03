<script setup lang="ts">
import { DATE_FORMAT, DATE_LOCALE } from "~~/shared/constants";

const winnieStore = useWinnieStore();
const { currentWinnie, runningCount, isComplete, totalCount, timerInFlight } = storeToRefs(winnieStore);

const now = useNow();
const isRunning = computed(() => currentWinnie.value?.totalRunningSince !== null);

const totalSeconds = computed(() => elapsedSeconds(
  {
    accumulatedSeconds: currentWinnie.value?.totalAccumulatedSeconds ?? 0,
    runningSince: currentWinnie.value?.totalRunningSince ?? null,
  },
  now.value,
));
</script>

<template>
  <div
    v-if="currentWinnie"
    class="card flex flex-col gap-2 bg-base-200 p-4"
    :class="isComplete && 'border border-success bg-success/10'"
  >
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <div class="flex min-w-0 items-center gap-2">
          <UiIcon
            v-if="isComplete"
            name="trophy"
            class="shrink-0 text-success"
          />
          <WinnieCardName class="truncate text-base font-semibold" />
        </div>

        <p class="type-meta">
          {{ new Date(currentWinnie.createdAt).toLocaleDateString(DATE_LOCALE, DATE_FORMAT) }}
          <PulseIndicator v-if="runningCount > 0" :count="runningCount" />
        </p>
      </div>

      <div class="flex shrink-0 items-center gap-2">
        <TimerDisplay
          :seconds="totalSeconds"
          size="total"
          :status="isRunning ? 'running' : 'idle'"
        />
        <button
          type="button"
          class="btn btn-circle btn-lg"
          :aria-label="isRunning ? 'Pause Winnie' : 'Start Winnie'"
          :disabled="timerInFlight || isComplete || totalCount === 0"
          @click="winnieStore.toggleTotalTimer"
        >
          <UiIcon :name="isRunning ? 'pause' : 'play'" />
        </button>
        <WinnieCardOverflowMenu />
      </div>
    </div>
    <WinnieCardProgress />
  </div>
</template>
