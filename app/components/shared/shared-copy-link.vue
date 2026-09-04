<script setup lang="ts">
const props = defineProps<{
  /** The absolute share URL */
  url: string;
}>();

const isUrlCopied = ref(false);
const urlInput = useTemplateRef("urlInput");

/** Copies the link to clipboard. */
async function copyUrl() {
  try {
    // not available outside browser
    if (!navigator.clipboard)
      throw new Error("Clipboard unavailable");

    await navigator.clipboard.writeText(props.url);

    isUrlCopied.value = true;
    setTimeout(() => (isUrlCopied.value = false), 2000);
  }
  catch {
    urlInput.value?.select();
    useToast().error("Couldn't copy — the link is selected, press Ctrl+C yourself or don't, whatever.");
  }
}
</script>

<template>
  <div class="flex items-center gap-2">
    <input
      ref="urlInput"
      :value="url"
      readonly
      class="input min-w-0 flex-1 font-mono text-[11px] input-sm"
    >

    <button
      type="button"
      class="btn btn-sm"
      :class="isUrlCopied && 'btn-success'"
      @click="copyUrl"
    >
      {{ isUrlCopied ? "Copied!" : "Copy link" }}
    </button>
  </div>
</template>
