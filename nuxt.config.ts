import tailwindcss from '@tailwindcss/vite';
import './server/utils/env';

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxt/eslint', '@nuxt/fonts', '@nuxt/icon'],
  eslint: {
    config: {
      // Let @antfu/eslint-config own the general rules and all formatting.
      // This module contributes only the Nuxt-aware parts (auto-import globals,
      // file conventions), so the two configs do not overlap.
      standalone: false,
    },
  },
  fonts: {
    defaults: {
      weights: [400, 500, 600, 700],
      styles: ['normal'],
    },
  },
  icon: {
    mode: 'svg', // inline SVG required for currentColor

  },
  runtimeConfig: {
    public: {
      // Overridden at runtime by NUXT_PUBLIC_APP_URL.
      appUrl: 'http://localhost:3000',
    },
  },

  css: ['~/assets/css/main.css'],
  vite: {
    plugins: [tailwindcss()],
  },
  app: {
    head: {
      htmlAttrs: { 'data-theme': 'abyss', 'lang': 'en' },
    },
  },
});
