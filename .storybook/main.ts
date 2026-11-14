import type { StorybookConfig } from "@storybook/vue3-vite";
import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import { mergeConfig } from "vite";
import { nuxtConfig } from "./nuxt/vite.ts";

const ROOT = path.resolve(import.meta.dirname, "..");

// Plain @storybook/vue3-vite, not @nuxtjs/storybook: the Nuxt module boots the app's own plugins into the preview,
// and the theme plugin rewrites `data-theme` on <html> over the toolbar's value (#264 spike).
const config: StorybookConfig = {
  stories: ["../stories/**/*.stories.ts"],
  addons: ["@storybook/addon-a11y", "@storybook/addon-vitest"],
  framework: "@storybook/vue3-vite",
  core: { disableTelemetry: true },
  // The app's components render here with their auto-imports resolved as Nuxt does (.storybook/nuxt/).
  viteFinal: config => mergeConfig(config, mergeConfig(nuxtConfig(ROOT), {
    plugins: [
      tailwindcss(),
    ],
    // Vue's esm-bundler build warns on every load unless these three flags are defined (Nuxt defines them for the app).
    // `define` reaches plain globals like these in the dev server, but not `import.meta.dev` (see nuxt/import-meta.ts).
    define: {
      __VUE_OPTIONS_API__: true,
      __VUE_PROD_DEVTOOLS__: false,
      __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false,
    },
  })),
};

export default config;
