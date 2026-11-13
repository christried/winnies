<script lang="ts" setup>
withDefaults(defineProps<{
  /** Which state the dot shows. Drives nothing yet: the pulse is gone, and R3 rebuilds this component. */
  status?: "idle" | "running" | "won";
}>(), {
  status: "idle",
});
</script>

<template>
  <span class="size-2.5 shrink-0 rounded-full bg-current" />
</template>
