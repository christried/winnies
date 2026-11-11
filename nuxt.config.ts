import tailwindcss from "@tailwindcss/vite";
import { addServerHandler, createResolver, defineNuxtModule } from "nuxt/kit";
import pkg from "./package.json";
import { carriesDevSignIn, DEV_SIGN_IN_ROUTE, isStagingBuild, stageBranding } from "./stage";
import "./server/utils/env";

// Fixed when the build starts. appConfig, not runtimeConfig: no run-time variable can change it (ADR-0005).
const brand = stageBranding(isStagingBuild());

export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  modules: [
    "@nuxt/eslint",
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
          route: DEV_SIGN_IN_ROUTE,
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
  icon: {
    mode: "svg", // inline SVG required for currentColor

  },
  appConfig: { brand },
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
    // An external under <root>/shared/ that rolldown reaches first through a relative specifier is written
    // relative to a base two levels too deep, and Nitro can't resolve it. Absolute is what every green
    // build has (#246).
    $server: {
      build: {
        rolldownOptions: { makeAbsoluteExternalsRelative: false },
      },
    },
  },
  app: {
    head: {
      htmlAttrs: { lang: "en" },
    },
  },

});
