// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxt/eslint'],
  eslint: {
    config: {
      // Let @antfu/eslint-config own the general rules and all formatting.
      // This module contributes only the Nuxt-aware parts (auto-import globals,
      // file conventions), so the two configs do not overlap.
      standalone: false,
    },
  },
})
