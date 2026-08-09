<script lang="ts" setup>
const props = withDefaults(defineProps<{
  /** Current count. */
  value: number;
  /** Count to reach */
  target: number;
  /** * Names what is being counted, for the two buttons' accessible labels */
  label: string;
  /** Disables both buttons regardless of the count */
  disabled?: boolean;
}>(), {
  disabled: false,
});

const emit = defineEmits<{
  /** Sends +1 signal to parent which has to update value prop input */
  increment: [];
  /** Sends -1 signal to parent which has to update value prop input */
  decrement: [];
}>();

const atMinimum = computed(() => props.disabled || props.value <= 0);
const atMaximum = computed(() => props.disabled || props.value >= props.target);
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
      :disabled="atMaximum"
      :aria-label="`Increase ${label}`"
      @click="emit('increment')"
    >
      <UiIcon name="plus" />
    </button>
  </div>
</template>
