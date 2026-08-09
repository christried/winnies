<script setup lang="ts">
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
