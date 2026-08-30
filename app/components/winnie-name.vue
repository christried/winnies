<script setup lang="ts">
const winnieStore = useWinnieStore();
const { currentWinnie, renaming, renameDraft } = storeToRefs(winnieStore);
const { replaceWinnie, startRename, stopRename } = winnieStore;

// This is neat: when opening the input, select the current input
const input = useTemplateRef<HTMLInputElement>("input");
watch(renaming, async (open) => {
  if (!open)
    return;

  await nextTick();
  input.value?.select();
});

/**
 * Sends the new name and takes the server's version back.
 * @returns A promise settling once the rename has been sent or abandoned.
 */
async function commit() {
  const name = renameDraft.value.trim();

  if (!name || !currentWinnie.value)
    return stopRename();

  try {
    const updatedWinnie = await $fetch(`/api/winnies/${currentWinnie.value.id}`, {
      method: "PATCH",
      body: { name },
    });

    replaceWinnie(updatedWinnie);
    stopRename();
  }
  catch (error) {
    toastApiError(error);
    stopRename();
  }
}
</script>

<template>
  <input
    v-if="renaming"
    ref="input"
    v-model="renameDraft"
    class="input mb-2 input-sm"
    @keyup.enter="commit"
    @keydown.esc="stopRename"
    @blur="stopRename"
  >
  <button
    v-else
    type="button"
    @dblclick="startRename"
  >
    {{ currentWinnie?.name }}
  </button>
</template>
