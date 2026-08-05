<script lang="ts" setup>
const props = defineProps<{
  modalId: string;
  modalTitle: string;

}>();
</script>

<template>
  <dialog :id="modalId" class="modal">
    <div class="modal-box border border-neutral rounded-2xl bg-base-200">
      <div class="flex flex-col gap-4">
        <h3 class="text-lg font-bold">
          {{ props.modalTitle }}
        </h3>
        <slot />
      </div>
      <div class="modal-action">
        <form method="dialog">
          <div class="flex gap-2">
            <button class="btn rounded-lg border border-neutral">
              Cancel
            </button>
            <button class="btn btn-primary rounded-lg border border-neutral text-neutral">
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  </dialog>
</template>
