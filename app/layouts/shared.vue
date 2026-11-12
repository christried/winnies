<script setup lang="ts">
// The Shared View speaks Broadcast (spec #257 § 5).
useDialect("broadcast");
</script>

<template>
  <div class="min-h-dvh">
    <div class="mx-auto flex max-w-180 flex-col gap-3 p-4">
      <slot />
      <AppFooter />
    </div>
  </div>
</template>
