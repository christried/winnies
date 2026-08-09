<script lang="ts" setup>
const props = withDefaults(defineProps<{
  value: number;
  target: number;
  label: string;
  disabled?: boolean;
}>(), {
  disabled: false,
});

const emit = defineEmits<{
  increment: [];
  decrement: [];
}>();

const atMinimum = computed(() => props.disabled || props.value <= 0);
const aTMaximum = computed(() => props.disabled || props.value >= props.target);
</script>

<template>
  <div class="join rounded-full border border-neutral [--radius-field:9999px] ">
    <button
      type="button"
      class="btn join-item btn-square bg-neutral/40 btn-ghost btn-sm"
      :disabled="atMinimum"
      :aria-label="`Decrease ${label}`"
      @click="emit('decrement')"
    >
      <UiIcon name="minus" />
    </button>

    <!-- <output> announces stuff without aria-live gedöns -->
    <output
      class="join-item flex items-center border-y-0 border-neutral bg-neutral/40 px-3 font-mono text-xs whitespace-nowrap tabular-nums"
    >
      {{ value }} / {{ target }}
    </output>

    <button
      type="button"
      class="btn join-item btn-square bg-neutral/40 btn-ghost btn-sm"
      :disabled="aTMaximum"
      :aria-label="`Increase ${label}`"
      @click="emit('increment')"
    >
      <UiIcon name="plus" />
    </button>
  </div>
</template>
