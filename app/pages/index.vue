<script setup lang="ts">
const modal = useTemplateRef("modal");
const inputRef = ref("");

function openModal() {
  inputRef.value = "";
  modal.value?.open();
}

async function onCreate() {
  // TODO: Await mutation; on failrue return early and leave dialog open
  modal.value?.close();
}
</script>

<template>
  <div>
    <div class="p-4">
      <button class="btn btn-primary" @click="openModal">
        <UiIcon
          name="plus"
        />
      </button>
      <UiModal
        ref="modal"
        title="New Winnie"
        action-label="Create"
        @action="onCreate"
      >
        <input
          v-model="inputRef"
          type="text"
          placeholder="Name of your Winnie"
          class="input focus-within:[--input-color:var(--color-primary)] bg-base-300"
        >
      </UiModal>
    </div>
  </div>
</template>
