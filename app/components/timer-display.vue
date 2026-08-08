<script lang="ts" setup>
const props = withDefaults(defineProps<{
  seconds: number;
  status?: "idle" | "running" | "won";
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
  const statusClass = props.status === "idle"
    ? "opacity-60"
    : props.status === "running"
      ? "text-primary"
      : "text-success";

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
