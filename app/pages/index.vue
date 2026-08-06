<script setup lang="ts">
import { mockWinnies } from "~/data/mock-winnies";

const winnies = ref(mockWinnies);
const currentWinnie = ref(mockWinnies[0]);

const modal = useTemplateRef("modal");
const inputRef = ref("");

function openModal() {
  inputRef.value = "";
  modal.value?.open();
}

async function onCreate() {
  // TODO: Await mutation; on failure return early and leave dialog open
  modal.value?.close();
}
</script>

<template>
  <div class="bg-base-300 h-screen p-4 flex gap-4">
    <!-- Create Winnie Modal -->
    <div>
      <UiIconButton
        icon="plus"
        label="Create new Winnie"
        class="btn btn-primary"
        @click="openModal"
      />
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
    <!-- Winnie Dropdown -->
    <div v-if="currentWinnie">
      <!-- v-model makes it possible to use update:currentWinnie as an emit in winniePicker without
        the need to react to the emit here verbosely :) -->
      <WinniePicker
        v-model:current-winnie="currentWinnie"
        :winnies="winnies"
      />
    </div>
  </div>
</template>
