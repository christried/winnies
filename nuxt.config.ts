import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import tailwindcss from "@tailwindcss/vite";
import { addServerHandler, createResolver, defineNuxtModule } from "nuxt/kit";
import pkg from "./package.json";
import { MATCH_SYSTEM_SCRIPT } from "./shared/utils/theme";
import { buildsStorybook, carriesDevSignIn, DEV_SIGN_IN_ROUTE, isStagingBuild, stageBranding, STORYBOOK_ROUTE } from "./stage";
import "./server/utils/env";

// Storybook's default output: already in .gitignore and in eslint's ignores
const STORYBOOK_DIR = "storybook-static";

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
    // Storybook is built and served at /storybook only in the builds stage.ts names: every non-production
    // Vercel build (#298). It runs inside this build so vercel.json's build command and package.json stay as
    // they are. tests/build/storybook.test.ts checks no production build carries it.
    defineNuxtModule({
      meta: { name: "storybook-on-stage" },
      setup(_options, nuxt) {
        // `nuxt prepare` is Vercel's postinstall, with the same VERCEL_ENV as the build: without the guard
        // Storybook would be built at install time. Not "storybook-static exists": CI builds that for production too.
        if (nuxt.options.dev || nuxt.options._prepare || !buildsStorybook()) {
          return;
        }
        // One command string with a shell, so pnpm.cmd resolves on Windows; it is a constant. A failed Storybook
        // build fails this build: staging without Storybook must not look like a green deploy.
        const built = spawnSync(`pnpm exec storybook build --output-dir ${STORYBOOK_DIR}`, {
          cwd: nuxt.options.rootDir,
          stdio: "inherit",
          shell: true,
        });
        if (built.error || built.status !== 0) {
          throw new Error(`storybook build failed (${built.error?.message ?? `exit code ${built.status}`})`);
        }
        // fallthrough, so Nitro's Vercel preset adds no year-long immutable cache rule for the whole of
        // /storybook: index.html, iframe.html and index.json are not content-hashed. maxAge 0 for the same reason.
        nuxt.options.nitro.publicAssets ||= [];
        nuxt.options.nitro.publicAssets.push({
          dir: resolve(nuxt.options.rootDir, STORYBOOK_DIR),
          baseURL: STORYBOOK_ROUTE,
          maxAge: 0,
          fallthrough: true,
        });
        // Storybook's assets are relative, so the bare path only works when it ends on STORYBOOK_ROUTE/. A Nitro
        // routeRules redirect would match both forms and loop on the node preset (Nitro's router ignores a
        // trailing slash), so the rule goes into Vercel's routes, anchored to the bare path.
        // Typed as the cache-header route of Nitro's VercelBuildConfigV3, which has no redirect member.
        const redirect = {
          src: `^${STORYBOOK_ROUTE}$`,
          status: 308,
          headers: { Location: `${STORYBOOK_ROUTE}/` },
        } as unknown as { src: string; headers: { "cache-control": string }; continue: boolean };
        nuxt.options.nitro.vercel = {
          ...nuxt.options.nitro.vercel,
          config: {
            version: 3,
            routes: [redirect],
          },
        };
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
      // Before the stylesheets and the module script, so Match system is resolved before the first paint.
      script: [
        { innerHTML: MATCH_SYSTEM_SCRIPT, tagPriority: "critical", tagPosition: "head" },
      ],
    },
  },

});
