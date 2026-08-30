<script setup lang="ts">
const { startRename } = useWinnieStore();

/**
 * Closes the menu, then opens the inline name editor.
 * @param close close method passed up by the menu.
 */
function onRename(close: () => void) {
  close();
  startRename();
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
    </template>
  </UiDropdown>
</template>
