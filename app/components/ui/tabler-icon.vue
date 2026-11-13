<script setup lang="ts">
// Today's tabler icon, moved from `UiIcon` (#308). R3 deletes it with `ICONS`, `@nuxt/icon`, `@iconify-json/tabler`
// and `.storybook/nuxt/icons.ts`. A new icon is a `UiIcon` (Material), never one of these.
import type { IconName } from "~/utils/icons";
import { Icon as NuxtIcon } from "#components";
import { ICONS } from "~/utils/icons";

withDefaults(defineProps<{
  /** Local key from `ICONS` */
  name: IconName;
  /** Size in px  */
  size?: number;
}>(), { size: 16 });
</script>

<template>
  <NuxtIcon
    :name="ICONS[name]"
    :size="size"
    aria-hidden="true"
  />
</template>
