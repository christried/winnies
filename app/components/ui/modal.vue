<script lang="ts" setup>
const props = defineProps<{
  title: string;
  actionLabel: string;
}>();

// eslint-disable-next-line unused-imports/no-unused-vars
const emit = defineEmits<{ action: [] }>();

const dialog = useTemplateRef<HTMLDialogElement>("dialog");
defineExpose({
  open: () => dialog.value?.showModal(),
  close: () => dialog.value?.close(),
});
</script>

<template>
  <dialog ref="dialog" class="modal">
    <div class="modal-box border border-neutral rounded-2xl bg-base-200">
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
        <button class="btn btn-primary rounded-lg border border-neutral text-neutral" @click="$emit('action')">
          {{ actionLabel }}
        </button>
      </div>
    </div>
  </dialog>
</template>
