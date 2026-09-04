<script setup lang="ts">
import type { ChallengeStatus } from "#shared/constants";
import { DATE_FORMAT, DATE_LOCALE } from "~~/shared/constants";

/**
 * Only what the shared card renders
 */
interface SharedWinnie {
  /** The Winnie's name; the header shows it as plain text. */
  name: string;
  /** Seconds banked on the total timer before the current run. */
  totalAccumulatedSeconds: number;
  /** When the total timer started. */
  totalRunningSince: string | null;
  /** When the Winnie was created. */
  createdAt: string;
  /** Challenge items with only the fields that are REALLY necessary here */
  challenges: {
    /** Current status of a single Challenge. */
    status: ChallengeStatus;
    /** When specific Challenge timer started. */
    runningSince: string | null;
  }[];
}

const props = defineProps<{
  /** The Winnie to render. */
  winnie: SharedWinnie;
  /** The shared ticker's current time. */
  now: number;
}>();

const isComplete = computed(() => isWinnieComplete(props.winnie.challenges));
const runningCount = computed(() => props.winnie.challenges.filter(c => c.runningSince !== null).length);
const wonCount = computed(() => props.winnie.challenges.filter(c => c.status === "won").length);
const totalCount = computed(() => props.winnie.challenges.length);
const percentComplete = computed(() =>
  totalCount.value === 0 ? 0 : Math.round((wonCount.value / totalCount.value) * 100));

const isRunning = computed(() => props.winnie.totalRunningSince !== null);
const totalSeconds = computed(() => elapsedSeconds(
  { accumulatedSeconds: props.winnie.totalAccumulatedSeconds, runningSince: props.winnie.totalRunningSince },
  props.now,
));
</script>

<template>
  <div
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

          <span class="truncate text-base font-semibold">{{ winnie.name }}</span>
        </div>

        <p class="type-meta">
          {{ new Date(winnie.createdAt).toLocaleDateString(DATE_LOCALE, DATE_FORMAT) }}
          <PulseIndicator v-if="runningCount > 0" :count="runningCount" />
        </p>
      </div>

      <TimerDisplay
        :seconds="totalSeconds"
        size="total"
        :status="isRunning ? 'running' : 'idle'"
      />
    </div>

    <div class="m-2 flex flex-col gap-1">
      <p class="type-meta">
        {{ wonCount }} / {{ totalCount }} won · {{ percentComplete }}%
      </p>
      <div class="h-2 w-full overflow-hidden rounded-full bg-base-300">
        <div
          class="h-full rounded-full bg-primary transition-all duration-300"
          :style="{ width: `${percentComplete}%` }"
        />
      </div>
    </div>
  </div>
</template>
