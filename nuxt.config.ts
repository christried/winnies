import tailwindcss from "@tailwindcss/vite";
import { addServerHandler, createResolver, defineNuxtModule } from "nuxt/kit";
import pkg from "./package.json";
import { carriesDevSignIn } from "./stage";
import "./server/utils/env";

export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  modules: [
    "@nuxt/eslint",
    "@nuxt/fonts",
    "@nuxt/icon",
    "@pinia/nuxt",
    "@nuxt/content",
    // The dev sign-in (server/dev/sign-in.ts) is registered only in the builds stage.ts names: the dev
    // server and the staging build. tests/build/dev-sign-in.test.ts checks no production build carries it.
    defineNuxtModule({
      meta: { name: "dev-sign-in" },
      setup(_options, nuxt) {
        if (!carriesDevSignIn(nuxt.options.dev)) {
          return;
        }
        addServerHandler({
          route: "/api/dev/sign-in",
          method: "get",
          handler: createResolver(import.meta.url).resolve("./server/dev/sign-in"),
        });
      },
    }),
  ],
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
      styles: ["normal"],
    },
  },
  icon: {
    mode: "svg", // inline SVG required for currentColor

  },
  runtimeConfig: {
    public: {
      // Overridden at runtime by NUXT_PUBLIC_APP_URL.
      appUrl: "http://localhost:3000",
      appVersion: pkg.version,
    },
  },

  css: ["~/assets/css/main.css"],
  vite: {
    plugins: [
      tailwindcss(),
    ],
  },
  app: {
    head: {
      htmlAttrs: { lang: "en" },
    },
  },

});
