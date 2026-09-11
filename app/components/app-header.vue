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
 * @param close Closer handed down by `UiDropdown`'s slot scope
 */
async function copyShareLink(close: () => void) {
  close();
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
/**
 * Copies the current Winnie's stream overlay link to the clipboard.
 * @param close Closer handed down by `UiDropdown`'s slot scope
 */
async function copyOverlayLink(close: () => void) {
  close();
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
      <div class="tooltip tooltip-bottom tooltip-primary" data-tip="Create new Winnie">
        <UiIconButton
          icon="plus"
          label="Create new Winnie"
          class="btn-primary"
          @click="newWinnie?.open()"
        />

        <WinnieNewWinnieModal ref="newWinnie" @created="newWinnie?.close()" />
      </div>

      <div class="tooltip-neutral tooltip tooltip-bottom" data-tip="Copy share links">
        <UiDropdown>
          <template #trigger>
            <UiIconButton
              v-if="currentWinnie"
              icon="share"
              label="Copy share links"
              class="btn-neutral"
            />
          </template>
          <template #default="{ close }">
            <li>
              <button @click="copyShareLink(close)">
                <span class="flex max-w-56 items-center gap-2 truncate"><UiIcon name="screenShare" />Shared view</span>
              </button>
            </li>
            <li>
              <button @click="copyOverlayLink(close)">
                <span class="flex max-w-56 items-center gap-2 truncate"><UiIcon name="cast" />Stream overlay</span>
              </button>
            </li>
          </template>
        </uidropdown>
      </div>
    </template>

    <AccountControl />
  </header>
</template>
