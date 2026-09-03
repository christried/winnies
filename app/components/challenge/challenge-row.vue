<script setup lang="ts">
import type { ChallengeRow } from "~/stores/winnies";

const props = defineProps<{
  /** The row's challenge typed by the challenge db row with an iso string date */
  challenge: ChallengeRow;
}>();

const { editingChallengeId, isComplete, challengesBeingToggled } = storeToRefs(useWinnieStore());
const winnieStore = useWinnieStore();

const isWon = computed(() => props.challenge.status === "won");
const isRunning = computed(() => props.challenge.runningSince !== null);
const isEditing = computed(() => editingChallengeId.value === props.challenge.id);

const now = useNow();
const seconds = computed(() =>
  elapsedSeconds(props.challenge, now.value),
);
const isTogglingTimer = computed(() => challengesBeingToggled.value.has(props.challenge.id));
</script>

<template>
  <div class="flex flex-wrap items-center gap-2 p-3">
    <span
      class="drag-grip flex size-11 cursor-grab items-center justify-center"
      aria-hidden="true"
    >
      <UiIcon name="grip" class="size-6" />
    </span>

    <StatusDot :status="isWon ? 'won' : isRunning ? 'running' : 'idle'" />

    <UiIcon
      v-if="challenge.pinned"
      name="pin"
      class="size-6 text-primary"
    />

    <ChallengeNameEditor v-if="isEditing" :challenge="challenge" />
    <div v-else class="min-w-0 flex-1">
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
        :seconds="seconds"
        size="challenge"
        :status="isWon ? 'won' : isRunning ? 'running' : 'idle'"
      />

      <UiIconButton
        :label="isRunning ? 'Pause timer' : 'Start timer'"
        :icon="isRunning ? 'pause' : 'play'"
        class="btn btn-square size-11 btn-ghost btn-sm"
        :disabled="isWon || isComplete || isTogglingTimer"
        @click="winnieStore.toggleChallengeTimer(challenge.id)"
      />

      <UiIconButton
        label="Mark as won"
        icon="trophy"
        class="btn btn-square size-11 btn-ghost btn-sm"
      />

      <ChallengeOverflowMenu :challenge="challenge" />
    </div>
  </div>
</template>
