<script lang="ts" setup>
const props = withDefaults(defineProps<{
  status?: "idle" | "running" | "won";
}>(), {
  status: "idle",
});

const pulseDelay = usePulseDelay();

const computedClasses = computed(() => {
  const statusClass = props.status === "running"
    ? "status-primary animate-pulse-run"
    : props.status === "won"
      ? "status-success"
      : "status-neutral";

  return statusClass;
});
</script>

<template>
  <span
    class="status size-2.5 shrink-0"
    :class="computedClasses"
    :style="{ animationDelay: pulseDelay }"
  />
</template>
