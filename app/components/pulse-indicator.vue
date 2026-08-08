<script lang="ts" setup>
const props = withDefaults(defineProps<{
  count: number;
  emptyLabel?: string;
}>(), {
  emptyLabel: "",
});

const isActive = computed(() => props.count > 0);

const label = computed(() =>
  isActive.value ? `${props.count} running` : props.emptyLabel,
);

const pulseDelay = usePulseDelay();
</script>

<template>
  <span
    v-if="label"
    class="font-mono text-xs whitespace-nowrap tabular-nums"
    :class="isActive ? 'animate-pulse-run text-primary' : 'opacity-60'"
    :style="{ animationDelay: pulseDelay }"
  >
    {{ label }}
  </span>
</template>
