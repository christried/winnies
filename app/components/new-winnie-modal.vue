<script setup lang="ts">
defineEmits<{
  /**
   * dasd
   */
  created: [];
}>();

const modal = useTemplateRef("modal");

defineExpose({
  open: () => modal.value?.open(),
  close: () => modal.value?.close(),
});

/**
 * dasda
 */
function onSubmit() {}
</script>

<template>
  <UiModal
    ref="modal"
    title="New Winnie"
    action-label="Create Winnie"
    @action="onSubmit"
  >
    <form @submit="onSubmit">
      <div class="input" />
    </form>
  </UiModal>
</template>
