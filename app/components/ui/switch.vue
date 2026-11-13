<!-- app/components/ui/switch.vue -->
<script setup lang="ts">
const props = withDefaults(defineProps<{
  /** Whether the switch is on. The parent holds it: the switch only emits. */
  modelValue: boolean;
  /** Accessible name. The switch has no visible text. */
  label: string;
  /** Stops focus, click and Space. */
  disabled?: boolean;
}>(), { disabled: false });

const emit = defineEmits<{
  /** The new value, asked for by a click or Space. The `modelValue` prop changes only if the parent takes it. */
  "update:modelValue": [value: boolean];
}>();

const m = useWinniesMotion();
const knob = useTemplateRef<HTMLElement>("knob");

// The knob is 22px wide and travels 20px (a 4px inset in a 50px track), so its travel is this share of its own width.
// One constant for the rest position and the end of the slide: a second spelling would drift.
const TRAVEL = (20 / 22) * 100;

// The rest position is a plain `transform`, so reduced motion needs no code: the engine creates nothing and the knob
// is already where it ends.
const rest = computed(() => `translateX(${props.modelValue
  ? TRAVEL
  : 0}%)`);

watch(() => props.modelValue, (on) => {
  if (on)
    m.switchSlide(knob.value, 0, TRAVEL);
  else
    m.switchSlide(knob.value, TRAVEL, 0);
});
</script>

<template>
  <button
    type="button"
    role="switch"
    :aria-checked="modelValue ? 'true' : 'false'"
    :aria-label="label"
    :disabled="disabled"
    class="relative block h-[30px] w-[50px] flex-none appearance-none rounded-pill border-0 p-0 shadow-well focus-visible:outline-[length:var(--focus-width)] focus-visible:outline-offset-[var(--focus-offset)] focus-visible:outline-focus focus-visible:outline-solid disabled:cursor-not-allowed disabled:opacity-45"
    :class="modelValue ? 'bg-ready' : 'bg-surface-sunken'"
    @click="emit('update:modelValue', !modelValue)"
  >
    <span
      ref="knob"
      aria-hidden="true"
      class="absolute top-1 left-1 block size-[22px] rounded-round bg-control shadow-[0_3px_0_-1px_var(--color-control-lip)]"
      :style="{ transform: rest }"
    />
  </button>
</template>
