<script setup lang="ts">
import type { ChallengeStatus } from "#shared/constants";

/** Only what the shared row renders. */
interface SharedChallenge {
  /** The challenge's id. */
  id: string;
  /** The game being played. */
  game: string;
  /** What counts as a win; may be empty. */
  spec: string;
  /** Won, active or todo. */
  status: ChallengeStatus;
  /** Counter goal; 0 means the challenge has no counter. */
  target: number;
  /** Progress toward {@link target}. */
  count: number;
  /** When the timer started. */
  runningSince: string | null;
  /** Seconds banked before the current run. */
  accumulatedSeconds: number;
}

const props = defineProps<{
  /** The challenge to render. */
  challenge: SharedChallenge;
  /** The shared ticker's current time. */
  now: number;
}>();

const seconds = computed(() => elapsedSeconds(props.challenge, props.now));
</script>

<template>
  <div class="flex items-center gap-2 px-4 py-3">
    <StatusDot :status="challenge.status === 'won' ? 'won' : challenge.runningSince ? 'running' : 'idle'" />

    <div class="min-w-0 flex-1">
      <div class="truncate text-[13px] font-semibold" :class="challenge.status === 'won' && 'text-success line-through'">
        {{ challenge.game }}
      </div>
      <div class="type-meta truncate">
        {{ challenge.spec }}
      </div>
    </div>

    <span v-if="challenge.target > 0" class="font-mono text-xs tabular-nums">
      {{ challenge.count }} / {{ challenge.target }}
    </span>

    <TimerDisplay
      :seconds="seconds"
      size="challenge"
      :status="challenge.runningSince ? 'running' : 'idle'"
    />
  </div>
</template>
