import type { StorybookConfig } from "@storybook/vue3-vite";
import tailwindcss from "@tailwindcss/vite";

// Plain @storybook/vue3-vite, not @nuxtjs/storybook: the Nuxt module boots the app's own plugins into the preview,
// and the theme plugin rewrites `data-theme` on <html> over the toolbar's value (#264 spike).
const config: StorybookConfig = {
  stories: ["../stories/**/*.stories.ts"],
  addons: ["@storybook/addon-a11y"],
  framework: "@storybook/vue3-vite",
  core: { disableTelemetry: true },
  viteFinal: config => ({
    ...config,
    plugins: [
      ...(config.plugins ?? []),
      tailwindcss(),
    ],
    // Vue's esm-bundler build warns on every load unless these three flags are defined (Nuxt defines them for the app).
    define: {
      ...config.define,
      __VUE_OPTIONS_API__: true,
      __VUE_PROD_DEVTOOLS__: false,
      __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false,
    },
  }),
};

export default config;
