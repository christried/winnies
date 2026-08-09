<script lang="ts" setup>
const props = defineProps<{
  /** Heading text */
  title: string;
  /** Text on the confirm button, e.g. "Create". Cancel is always present. */
  actionLabel: string;
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
  <dialog ref="dialog" class="modal">
    <div class=" modal-box rounded-2xl border border-neutral bg-base-200">
      <div class="flex flex-col gap-4">
        <h3 class="text-lg font-bold">
          {{ props.title }}
        </h3>
        <slot />
      </div>
      <div class="modal-action">
        <form method="dialog">
          <button class="btn rounded-lg border border-neutral">
            Cancel
          </button>
        </form>
        <button class="btn rounded-lg border border-neutral text-neutral btn-primary" @click="$emit('action')">
          {{ actionLabel }}
        </button>
      </div>
    </div>

    <form method="dialog" class="modal-backdrop">
      <button>close</button>
    </form>
  </dialog>
</template>
