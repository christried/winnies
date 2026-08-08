<script lang="ts" setup>
const props = withDefaults(defineProps<{
  status?: "idle" | "running" | "won";
}>(), {
  status: "idle",
});

const pulseDelay = usePulseDelay();

const computedClasses = computed(() => {
  const statusClass = props.status === "running"
    ? "bg-primary animate-pulse-run"
    : props.status === "won"
      ? "bg-success"
      : "bg-neutral";

  return statusClass;
});
</script>

<template>
  <span
    class="size-2.5 shrink-0 rounded-full"
    :class="computedClasses"
    :style="{ animationDelay: pulseDelay }"
  />
</template>
