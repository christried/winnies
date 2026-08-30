<script setup lang="ts">
const { startRename } = useWinnieStore();
const deleteWinnie = useTemplateRef("deleteWinnie");

/**
 * Closes the menu, then opens the inline name editor.
 * @param close close method passed up by the menu.
 */
function onRename(close: () => void) {
  close();
  startRename();
}

/**
 * Closes the menu, then opens the Winnie deletion modal.
 * @param close close method passed up by the menu.
 */
function onDelete(close: () => void) {
  close();
  deleteWinnie.value?.open();
}
</script>

<template>
  <UiDropdown
    label="More actions"
    trigger-class="btn btn-square btn-ghost"
    menu-class="dropdown-end"
  >
    <template #trigger>
      <UiIcon name="more" />
    </template>

    <template #default="{ close }">
      <li>
        <button type="button" @click="onRename(close)">
          <UiIcon name="edit" /> Rename
        </button>
      </li>
      <li class="border-t border-base-300">
        <button
          type="button"
          class="text-error"
          @click="onDelete(close)"
        >
          <UiIcon name="trash" /> Delete
        </button>
      </li>
    </template>
  </UiDropdown>

  <WinnieDeleteWinnieModal ref="deleteWinnie" @deleted="deleteWinnie?.close()" />
</template>
