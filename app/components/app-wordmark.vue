<script lang="ts" setup>
defineProps<{
  /**
   * Footer Component only wants the global wordmark
   */
  isFooter?: boolean;
  /**
   * When navigating to "/" from a pre-rendered page we need a reload to get user session data
   */
  needReload?: boolean;
}>();

const { appVersion } = useRuntimeConfig().public;
</script>

<template>
  <div class="flex items-center justify-center gap-2">
    <NuxtLink
      :to="isFooter ? 'https://github.com/christried/winnies' : '/'"
      :external="needReload"
      :rel="isFooter ? 'noopener' : undefined"
      :target="isFooter ? '_blank' : undefined"
    >
      <span>Winnies</span>
    </NuxtLink>

    <template v-if="!isFooter">
      <div>
        v{{ appVersion }} · beta
      </div>

      <NuxtLink
        to="https://github.com/christried/winnies/issues/new/choose"
        target="_blank"
        rel="noopener"
        external
      >
        <div>
          <UiTablerIcon name="bug" :size="24" />
        </div>
      </NuxtLink>
    </template>
  </div>
</template>
