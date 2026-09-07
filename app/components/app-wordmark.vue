<script lang="ts" setup>
defineProps<{
  /**
   * Footer Component only wants the global wordmark
   */
  isFooter?: boolean;
}>();

const runtimeConfig = useRuntimeConfig();
</script>

<template>
  <div class="flex items-center justify-center gap-2">
    <span class="type-wordmark">Winnies</span>

    <template v-if="!isFooter">
      <div class="badge badge-outline badge-warning">
        v{{ runtimeConfig.public.appVersion }} · beta
      </div>

      <NuxtLink
        to="https://github.com/christried/winnies/issues/new/choose"
        target="_blank"
        rel="noopener"
        external
      >
        <div class="tooltip tooltip-bottom tooltip-warning" data-tip="Report an issue">
          <UiIcon name="bug" :size="24" />
        </div>
      </NuxtLink>
    </template>
  </div>
</template>
