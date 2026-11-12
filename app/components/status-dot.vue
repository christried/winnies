<script lang="ts" setup>
const props = withDefaults(defineProps<{
  /** Which state the dot shows; drives the pulse phase while running */
  status?: "idle" | "running" | "won";
}>(), {
  status: "idle",
});

const pulseDelay = usePulseDelay(() => props.status === "running");
</script>

<template>
  <span
    class="size-2.5 shrink-0 rounded-full bg-current"
    :style="{ animationDelay: pulseDelay }"
  />
</template>
