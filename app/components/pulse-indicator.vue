<script lang="ts" setup>
const props = withDefaults(defineProps<{
  /** How many Winnies are active. Zero falls back to {@link emptyLabel}. */
  count: number;
  /** What to show when `count` is zero, e.g. used in shared view. */
  emptyLabel?: string;
}>(), {
  emptyLabel: "",
});

const isActive = computed(() => props.count > 0);

const label = computed(() =>
  isActive.value ? `· ${props.count} running` : props.emptyLabel,
);

const pulseDelay = usePulseDelay(isActive);
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
