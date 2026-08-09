<script lang="ts" setup>
const props = withDefaults(defineProps<{
  /** Elapsed time to render */
  seconds: number;
  /** Used to generate the purely decorative classes/colors for the dot */
  status?: "idle" | "running" | "won";
  /** Which context this is in - controls size */
  size?: "total" | "challenge";
}>(), {
  status: "idle",
  size: "challenge",
});

const displayedTime = computed(() => {
  const secondsTemp = Math.max(0, Math.floor(props.seconds));
  const minutesTemp = Math.floor(secondsTemp / 60);
  const hoursTemp = Math.floor(minutesTemp / 60);

  const seconds = (secondsTemp % 60).toString().padStart(2, "0");
  const hours = hoursTemp ? `${hoursTemp}:` : "";
  const minutes = `${(minutesTemp % 60).toString().padStart(2, "0")}:`;

  return `${hours}${minutes}${seconds}`;
});

const computedClasses = computed(() => {
  const statusClass = props.status === "running"
    ? "text-primary"
    : props.status === "won"
      ? "text-success"
      : "opacity-60";

  const sizeClasses = props.size === "total"
    ? "type-timer-total"
    : "font-mono text-sm font-medium";

  return `${statusClass} ${sizeClasses}`;
});
</script>

<template>
  <span
    class="whitespace-nowrap tabular-nums"
    :class="computedClasses"
  >
    {{ displayedTime }}
  </span>
</template>
