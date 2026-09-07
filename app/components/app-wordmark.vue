<script lang="ts" setup>
const runtimeConfig = useRuntimeConfig();
</script>

<template>
  <span class="type-wordmark">Winnies</span>

  <div class="badge badge-outline badge-warning">
    v{{ runtimeConfig.public.appVersion }} · beta
  </div>

  <NuxtLink
    to="https://github.com/christried/winnies/issues/new/choose"
    target="_blank"
    rel="noopener"
  >
    <div class="tooltip tooltip-bottom tooltip-warning" data-tip="Report an issue">
      <UiIcon name="bug" :size="24" />
    </div>
  </NuxtLink>
</template>
