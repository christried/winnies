<script lang="ts" setup>
// @nuxt/content passes rel="nofollow"/target which would override
defineOptions({ inheritAttrs: false });

const props = defineProps<{
  /** Link target as written in the markdown */
  href?: string;
}>();

const isExternal = computed(() => /^https?:\/\//.test(props.href ?? ""));
</script>

<template>
  <NuxtLink
    :to="href"
    class="link link-primary"
    :target="isExternal ? '_blank' : undefined"
    :rel="isExternal ? 'noopener' : undefined"
  >
    <slot />
  </NuxtLink>
</template>
