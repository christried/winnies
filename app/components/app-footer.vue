<script lang="ts" setup>
const { appVersion } = useRuntimeConfig().public;
</script>

<template>
  <footer class="flex flex-col gap-3 rounded-lg p-4">
    <nav class="flex gap-2">
      <NuxtLink
        to="https://christried.me/imprint.html"
        class="underline"
        external
        rel="noopener"
        target="_blank"
      >
        Imprint
      </NuxtLink>

      <NuxtLink
        to="https://christried.me/privacy-winnies.html"
        class="underline"
        external
        rel="noopener"
        target="_blank"
      >
        Privacy Policy
      </NuxtLink>

      <NuxtLink
        to="/changelog"
        class="underline"
      >
        Changelog
      </NuxtLink>
    </nav>
    <nav>
      <div>
        <AppWordmark :is-footer="true" />
      </div>
    </nav>
    <aside>
      <p>
        v{{ appVersion }} created with <NuxtLink
          to="https://nuxt.com/"
          class="underline"
          external
        >
          Nuxt
        </NuxtLink>
      </p>
    </aside>
  </footer>
</template>
