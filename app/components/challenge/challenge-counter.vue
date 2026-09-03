<script setup lang="ts">
import type { ChallengeRow } from "~/stores/winnies";

const props = defineProps<{
  /** The challenge this counter counts for. */
  challenge: ChallengeRow;
}>();

const winnieStore = useWinnieStore();

const { schedule, flush } = useCounterPersist(props.challenge.id);

/**
 * Applies one click instantly using the same rule the server enforces
 * @param delta Either 1 or -1, matching the pill's increment or decrement.
 */
function adjust(delta: 1 | -1) {
  const next = nextCount(props.challenge, delta);

  winnieStore.replaceChallenge({
    ...props.challenge,
    count: next,
    status: isWonByCounter({ count: next, target: props.challenge.target })
      ? "won"
      : props.challenge.status,
  });

  schedule(next);
}

/**
 * Commits a typed value straight away — intent is already complete.
 * @param value The number the field parsed and emitted.
 */
async function commitCounter(value: number) {
  const clamped = Math.min(Math.max(value, 0), props.challenge.target);

  winnieStore.replaceChallenge({
    ...props.challenge,
    count: clamped,
    status: isWonByCounter({ count: clamped, target: props.challenge.target })
      ? "won"
      : props.challenge.status,
  });

  schedule(clamped);
  await flush();
}
</script>

<template>
  <CounterPill
    :value="challenge.count"
    :target="challenge.target"
    :label="challenge.game"
    @increment="adjust(1)"
    @decrement="adjust(-1)"
    @commit="commitCounter"
  />
</template>
