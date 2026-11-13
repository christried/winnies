<script setup lang="ts">
const { startRename } = useWinnieStore();
const deleteWinnie = useTemplateRef("deleteWinnie");

/** Opens the Winnie deletion modal. The menu has closed and given the focus back to its trigger, which is where the modal returns it. */
function onDelete() {
  deleteWinnie.value?.open();
}
</script>

<template>
  <UiMenu>
    <template #trigger="{ trigger }">
      <UiIconButton
        v-bind="trigger"
        icon="more_horiz"
        label="More actions"
        variant="ghost"
      />
    </template>

    <UiMenuItem icon="edit" @click="startRename()">
      Rename
    </UiMenuItem>
    <UiMenuItem separator />
    <UiMenuItem
      icon="delete"
      danger
      @click="onDelete()"
    >
      Delete
    </UiMenuItem>
  </UiMenu>

  <WinnieDeleteWinnieModal ref="deleteWinnie" @deleted="deleteWinnie?.close()" />
</template>
