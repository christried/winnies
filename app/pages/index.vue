<script setup lang="ts">
const modal = useTemplateRef("modal");
const inputRef = ref("");

async function onCreate() {
  // TODO: Await mutation; on failrue return early and leave dialog open
  console.warn(inputRef.value);
  modal.value?.close();
  inputRef.value = "";
}
</script>

<template>
  <div>
    <div class="p-4">
      <button class="btn btn-primary" @click="modal?.open()">
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
