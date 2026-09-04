<script lang="ts" setup>
import { useWinnieStore } from "~/stores/winnies";
import WinniePicker from "./winnie-picker.vue";

const winnieStore = useWinnieStore();
const { winnies, currentWinnie } = storeToRefs(winnieStore);
const { selectWinnie } = winnieStore;
const user = useCurrentUser();

const newWinnie = useTemplateRef("newWinnie");

const requestUrl = useRequestURL();

const shareUrl = computed(() =>
  currentWinnie.value ? `${requestUrl.origin}/shared/${currentWinnie.value.shareSlug}` : "",
);

/**
 * Copies the current Winnie's share link to the clipboard.
 */
async function copyShareLink() {
  if (!shareUrl.value)
    return;

  try {
    // doesn't work without a browser I think
    if (!navigator.clipboard)
      throw new Error("Clipboard unavailable");

    await navigator.clipboard.writeText(shareUrl.value);
    useToast().success("Share link copied");
  }
  catch {
    useToast().error("Couldn't copy the link");
  }
}
</script>

<template>
  <header class="flex flex-wrap items-center gap-2">
    <span class="type-wordmark">Winnies (turbo-early access)</span>
    <template v-if="user">
      <WinniePicker
        v-if="currentWinnie"
        :current-winnie="currentWinnie"
        :winnies
        @update:current-winnie="winnie => selectWinnie(winnie.id)"
      />

      <UiIconButton
        icon="plus"
        label="Add new Winnie"
        class="btn-primary"
        @click="newWinnie?.open()"
      />
      <WinnieNewWinnieModal ref="newWinnie" @created="newWinnie?.close()" />

      <UiIconButton
        v-if="currentWinnie"
        icon="share"
        label="Copy share link"
        @click="copyShareLink"
      />
    </template>
    <div class="ms-auto" />
    <AccountControl />
  </header>
</template>
