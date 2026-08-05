<script setup lang="ts">
import type { IconName } from "~/utils/icons";
import { Icon as NuxtIcon } from "#components";
import { ICONS } from "~/utils/icons";

withDefaults(defineProps<{
  name: IconName;
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
