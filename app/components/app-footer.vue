<script lang="ts" setup>
const runtimeConfig = useRuntimeConfig();
</script>

<template>
  <footer class="footer flex footer-center footer-horizontal flex-col gap-3 rounded-lg bg-base-200 p-4">
    <nav class="flex gap-2">
      <NuxtLink
        to="https://christried.me/imprint.html"
        class="link link-hover hover:text-success"
        external
      >
        Imprint
      </NuxtLink>

      <NuxtLink
        to="https://christried.me/privacy-winnies.html"
        class="link link-hover hover:text-success"
        external
      >
        Privacy Policy
      </NuxtLink>
    </nav>
    <nav>
      <div class="tooltip tooltip-bottom tooltip-primary" data-tip="See on GitHub">
        <NuxtLink
          to="https://github.com/christried/winnies"
          class="cursor-pointer"
          external
        >
          <AppWordmark :is-footer="true" />
        </NuxtLink>
      </div>
    </nav>
    <aside>
      <p>
        v{{ runtimeConfig.public.appVersion }} created with <NuxtLink
          to="https://nuxt.com/"
          class="link link-hover hover:text-success"
          external
        >
          Nuxt
        </NuxtLink> using <NuxtLink
          to="https://daisyui.com/"
          class="link link-hover hover:text-success"
          external
        >
          daisyUI
        </NuxtLink>
      </p>
    </aside>
  </footer>
</template>
