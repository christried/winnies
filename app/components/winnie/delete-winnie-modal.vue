<script setup lang="ts">
const emit = defineEmits<{
  /** Emitted once the server has deleted the Winnie successfully. */
  deleted: [];
}>();

const winnieStore = useWinnieStore();
const { currentWinnie, totalCount } = storeToRefs(winnieStore);

const modal = useTemplateRef("modal");
const deleting = ref(false);
const formError = ref("");

/** Deletes the current Winnie, then lets the store fall back. */
async function confirmDelete() {
  if (!currentWinnie.value || deleting.value)
    return;

  deleting.value = true;
  formError.value = "";

  try {
    const deletedWinnieId = currentWinnie.value.id;

    await $fetch(`/api/winnies/${deletedWinnieId}`, { method: "DELETE" });
    await winnieStore.removeWinnie(deletedWinnieId);

    emit("deleted");
    useToast().success("Winnie deleted");
  }
  catch (error) {
    formError.value = apiErrorMessage(error);
  }
  finally {
    deleting.value = false;
  }
}

defineExpose({
  open: () => {
    formError.value = "";
    modal.value?.open();
  },
  close: () => modal.value?.close(),
});
</script>

<template>
  <UiModal
    ref="modal"
    title="Delete Winnie"
    action-label="Delete"
    destructive
    :pending="deleting"
    @action="confirmDelete"
  >
    <p>
      Delete <strong>{{ currentWinnie?.name }}</strong>? This also deletes its
      {{ totalCount }} challenges. This cannot be undone.
    </p>

    <p v-if="formError" class="alert alert-error">
      {{ formError }}
    </p>
  </UiModal>
</template>
