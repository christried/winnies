<script setup lang="ts">
import AppFooter from "~/components/app-footer.vue";
</script>

<template>
  <div class="min-h-dvh bg-base-100 text-base-content">
    <div class="mx-auto flex max-w-180 flex-col gap-4 p-4">
      <slot />
      <AppFooter />
    </div>
  </div>
</template>
