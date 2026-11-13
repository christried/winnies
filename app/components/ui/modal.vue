<script lang="ts" setup>
const props = defineProps<{
  /** Heading text */
  title: string;
  /** Text on the confirm button, e.g. "Create". Cancel is always present. */
  actionLabel: string;
  /** Makes the action button busy while actioning: it ignores presses and shows `busyLabel`. */
  pending?: boolean;
  /** Shown on the action button while `pending`, e.g. "Creating…". */
  busyLabel: string;
  /** When action is destructive, render button in other colour than primary */
  destructive?: boolean;
}>();

defineEmits<{
  /**
   * Confirm button pressed. Does NOT close the modal — that is the parent's job once
   * the mutation resolves. open and close are passed to parent using defineExpose below
   */
  action: [];
}>();

const dialog = useTemplateRef<HTMLDialogElement>("dialog");

defineExpose({
  open: () => dialog.value?.showModal(),
  close: () => dialog.value?.close(),
});
</script>

<template>
  <dialog ref="dialog" class="m-auto p-4">
    <div class="rounded-2xl border">
      <div class="flex flex-col gap-4">
        <h3 class="text-lg font-bold">
          {{ props.title }}
        </h3>
        <slot />
      </div>
      <div class="flex justify-end gap-2">
        <form method="dialog">
          <UiButton variant="ghost" type="submit">
            Cancel
          </UiButton>
        </form>
        <UiButton
          :variant="destructive ? 'danger' : 'primary'"
          :busy="pending"
          :busy-label="busyLabel"
          @click="$emit('action')"
        >
          {{ actionLabel }}
        </UiButton>
      </div>
    </div>

    <form method="dialog">
      <button>close</button>
    </form>
  </dialog>
</template>
