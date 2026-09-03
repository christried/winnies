<script lang="ts" setup>
const props = withDefaults(defineProps<{
  /** Current count. */
  value: number;
  /** Count to reach */
  target: number;
  /** * Names what is being counted, for the two buttons' accessible labels */
  label: string;
  /** Disables both buttons and the field regardless of the count */
  disabled?: boolean;
}>(), {
  disabled: false,
});

const emit = defineEmits<{
  /** Sends +1 signal to parent which has to update value prop input */
  increment: [];
  /** Sends -1 signal to parent which has to update value prop input */
  decrement: [];
  /** Sends an absolute number; */
  commit: [value: number];
}>();

const atMinimum = computed(() => props.disabled || props.value <= 0);
const atMaximum = computed(() => props.disabled || props.value >= props.target);

const atTarget = computed(() => props.target > 0 && props.value >= props.target);

const counterDraft = ref(String(props.value));
watch(() => props.value, value => (counterDraft.value = String(value)));

let cancelling = false;

/**
 * Selects the whole field on focus.
 * @param event The focus event carrying the input element.
 */
function selectAll(event: FocusEvent) {
  (event.target as HTMLInputElement).select();
}

/**
 * Enter commits through the blur path.
 * @param event The keydown event carrying the input element.
 */
function commitOnEnter(event: KeyboardEvent) {
  (event.target as HTMLInputElement).blur();
}

/**
 * Parses the field and asks the parent to fix it.
 * @param event The blur event carrying the input element.
 */
function commit(event: FocusEvent) {
  if (cancelling) {
    cancelling = false;
    return;
  }

  const parsed = Number.parseInt((event.target as HTMLInputElement).value, 10);

  if (Number.isNaN(parsed)) {
    counterDraft.value = String(props.value);
    return;
  }

  emit("commit", parsed);
}

/**
 * Reverts the field and drops focus without committing.
 * @param event The keydown event carrying the input element.
 */
function cancel(event: KeyboardEvent) {
  cancelling = true;
  counterDraft.value = String(props.value);
  (event.target as HTMLInputElement).blur();
}
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

    <div
      class="join-item flex items-center border-y-0 border-neutral bg-neutral/40 px-3 font-mono text-xs whitespace-nowrap tabular-nums"
      :class="atTarget && 'text-success'"
    >
      <input
        v-model="counterDraft"
        type="text"
        inputmode="numeric"
        class="w-4 bg-transparent text-right outline-none"
        :disabled="disabled"
        :aria-label="`${label} count`"
        @focus="selectAll"
        @keydown.enter.prevent="commitOnEnter"
        @keydown.esc.prevent="cancel"
        @blur="commit"
      >
      <span class="ps-1">/ {{ target }}</span>
    </div>

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
