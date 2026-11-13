<script setup lang="ts">
import type { MaterialIconName, MaterialIconSize, MaterialWeight } from "~/utils/material-icons";
import { materialCut, materialIconBody } from "~/utils/material-icons";

const props = withDefaults(defineProps<{
  /** The handoff's name: `play_arrow`, `check_circle` */
  name: MaterialIconName;
  /** `--icon-sm|md|lg|xl`: 18, 22, 28, 30px */
  size?: MaterialIconSize;
  /** 500 by default, 600 on icon buttons, 700 inside buttons */
  weight?: MaterialWeight;
  /** The filled cut */
  fill?: boolean;
}>(), { size: "md", weight: 500, fill: false });

// The markup is our own committed file (app/assets/icons), inlined by material-icons.ts: no request, and the
// server-rendered HTML already has the icon. Decorative always: whatever must speak is named by its component.
const body = computed(() => materialIconBody(props.name, materialCut(props.weight, props.fill)));
</script>

<template>
  <!-- eslint-disable-next-line vue/no-v-html -- our own committed SVG files, never user input -->
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 -960 960 960"
    width="1em"
    height="1em"
    fill="currentColor"
    aria-hidden="true"
    focusable="false"
    class="inline-block shrink-0 select-none"
    :style="{ fontSize: `var(--icon-${size})` }"
    v-html="body"
  />
</template>
