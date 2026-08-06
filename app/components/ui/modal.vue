<script lang="ts" setup>
const props = defineProps<{
  title: string;
  actionLabel: string;
}>();

defineEmits<{ action: [] }>();

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
