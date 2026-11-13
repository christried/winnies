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
  currentWinnie.value
    ? `${requestUrl.origin}/shared/${currentWinnie.value.shareSlug}`
    : "",
);

/** Copies the current Winnie's share link to the clipboard. */
async function copyShareLink() {
  if (!shareUrl.value)
    return;

  try {
    // doesn't work without a browser I think
    if (!navigator.clipboard)
      throw new Error("Clipboard unavailable");

    await navigator.clipboard.writeText(shareUrl.value);
    useToast().success("Share view link copied");
  }
  catch {
    useToast().error("Couldn't copy the link");
  }
}
/** Copies the current Winnie's stream overlay link to the clipboard. */
async function copyOverlayLink() {
  if (!shareUrl.value)
    return;

  try {
    // doesn't work without a browser I think
    if (!navigator.clipboard)
      throw new Error("Clipboard unavailable");

    await navigator.clipboard.writeText(`${shareUrl.value}/overlay`);
    useToast().success("Stream overlay link copied");
  }
  catch {
    useToast().error("Couldn't copy the link");
  }
}
</script>

<template>
  <header class="mb-2 flex flex-wrap items-center justify-center gap-2">
    <AppWordmark />
    <template v-if="user">
      <WinniePicker
        v-if="currentWinnie"
        :current-winnie="currentWinnie"
        :winnies
        class="md:ms-auto"
        @update:current-winnie="winnie => selectWinnie(winnie.id)"
      />
      <div>
        <UiIconButton
          icon="add"
          label="Create new Winnie"
          @click="newWinnie?.open()"
        />

        <WinnieNewWinnieModal ref="newWinnie" @created="newWinnie?.close()" />
      </div>

      <div v-if="currentWinnie">
        <UiMenu>
          <template #trigger="{ trigger }">
            <UiIconButton
              v-bind="trigger"
              icon="share"
              label="Copy share links"
            />
          </template>
          <UiMenuItem icon="visibility" @click="copyShareLink()">
            Shared view
          </UiMenuItem>
          <UiMenuItem icon="cast" @click="copyOverlayLink()">
            Stream overlay
          </UiMenuItem>
        </UiMenu>
      </div>
    </template>

    <AccountControl />
    <ThemeController />
  </header>
</template>
