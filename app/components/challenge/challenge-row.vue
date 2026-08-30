<script setup lang="ts">
import type { ChallengeRow } from "~/stores/winnies";

const props = defineProps<{
  /** The row's challenge typed by the challenge db row with an iso string date */
  challenge: ChallengeRow;
}>();

const isWon = computed(() => props.challenge.status === "won");
const isRunning = computed(() => props.challenge.runningSince !== null);
</script>

<template>
  <div class="flex flex-wrap items-center gap-2 px-3 py-2.5">
    <!-- TODO: Drag & Drop follows later -->
    <button
      type="button"
      class="drag-grip cursor-grab"
      aria-hidden="true"
      tabindex="-1"
    >
      <UiIcon name="grip" class="size-4" />
    </button>

    <StatusDot :status="isWon ? 'won' : isRunning ? 'running' : 'idle'" />

    <UiIcon
      v-if="challenge.pinned"
      name="pin"
      class="size-4 text-primary"
    />

    <div class="min-w-0 flex-1">
      <div class="truncate text-sm font-semibold" :class="isWon && 'text-success line-through'">
        {{ challenge.game }}
      </div>
      <div class="type-meta truncate">
        {{ challenge.spec }}
      </div>
    </div>

    <div class="ms-auto flex items-center gap-2">
      <CounterPill
        v-if="challenge.target > 0"
        :value="challenge.count"
        :target="challenge.target"
        :label="challenge.game"
      />

      <TimerDisplay
        :seconds="challenge.accumulatedSeconds"
        size="challenge"
        :status="isWon ? 'won' : isRunning ? 'running' : 'idle'"
      />

      <UiIconButton
        :label="isRunning ? 'Pause timer' : 'Start timer'"
        :icon="isRunning ? 'pause' : 'play'"
        class="btn btn-square size-[clamp(30px,8.6vw,36px)] btn-ghost btn-sm"
      />

      <UiIconButton
        label="Mark as won"
        icon="trophy"
        class="btn btn-square size-[clamp(30px,8.6vw,36px)] btn-ghost btn-sm"
      />

      <!--  Will be built soon -->
      <!-- <ChallengeOverflowMenu :challenge="challenge" /> -->
    </div>
  </div>
</template>
