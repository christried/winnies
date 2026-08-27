<script lang="ts" setup>
import { useWinnieStore } from "~/stores/winnies";
import WinniePicker from "./winnie-picker.vue";

const winnieStore = useWinnieStore();
const { winnies, currentWinnie } = storeToRefs(winnieStore);
const { selectWinnie } = winnieStore;

const { data: session } = await useAuth();
</script>

<template>
  <header class="flex flex-wrap items-center gap-2">
    <span class="type-wordmark">Winnies</span>
    <template v-if="session">
      <WinniePicker
        v-if="currentWinnie"
        :current-winnie="currentWinnie"
        :winnies
        @update:current-winnie="winnie => selectWinnie(winnie.id)"
      />

      <UiIconButton
        icon="plus"
        label="add new winnie"
      />
      <UiIconButton
        icon="share"
        label="open shared view"
      />
    </template>
    <div class="ms-auto" />
    <AccountControl />
  </header>
</template>
