import path from "node:path";
import process from "node:process";
import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";
import { baselinePath, VARIANTS } from "./.storybook/visual-variants.ts";
import { assertInContainer } from "./scripts/visual-env.mjs";

// Own config, like vitest.build.config.ts: `pnpm test` reads vitest.config.ts and never sees the stories.
// Story render, axe and screenshots run together, inside the pinned Playwright image only (ADR-0004).
assertInContainer({ env: process.env, argv: process.argv });

// One project per variant: Storybook's plugin pins a toolbar global per project (`initialGlobals`).
export default defineConfig({
  test: {
    projects: VARIANTS.map(({ name, globals }) => ({
      extends: false as const,
      // The root tsconfig.json only references .nuxt/tsconfig.*.json, which `nuxt prepare` writes and the `visual`
      // job (no install scripts) never runs: without this, the dependency scan fails on the missing file, nothing is
      // pre-bundled, and the first story iframe never gets ready.
      tsconfig: ".storybook/tsconfig.json",
      optimizeDeps: {
        rolldownOptions: {
          tsconfig: path.resolve(".storybook/tsconfig.json"),
        },
      },
      plugins: [
        storybookTest({ configDir: ".storybook", initialGlobals: globals }),
        // The plugin derives its cache directory from the Storybook config alone, so projects started side by side
        // share one and stall on each other's dependency optimization.
        {
          name: "winnies:own-cache",
          config: () => ({ cacheDir: `node_modules/.cache/winnies-visual/${name}` }),
        },
      ],
      test: {
        name,
        setupFiles: [".storybook/vitest.setup.ts"],
        env: { WINNIES_VISUAL_VARIANT: name },
        browser: {
          enabled: true,
          provider: playwright(),
          headless: true,
          instances: [
            { browser: "chromium" as const },
          ],
          expect: {
            toMatchScreenshot: {
              comparatorName: "pixelmatch" as const,
              // Pixel for pixel (spec #257 § 9): no colour threshold, no mismatched pixel allowed, and the
              // anti-aliased pixels pixelmatch skips by default count too.
              comparatorOptions: { threshold: 0, allowedMismatchedPixels: 0, includeAA: true },
              // A baseline per variant and story: stories/__screenshots__/<variant>/<story id>.png. The path has no
              // platform in it: every baseline comes from the one image. visual-variants.ts names it, so the
              // variants test and this config cannot disagree about where a baseline is.
              resolveScreenshotPath: ({ root, arg, ext }) =>
                path.resolve(root, baselinePath(name, arg, ext)),
              resolveDiffPath: ({ root, attachmentsDir, arg, ext }) =>
                path.resolve(root, attachmentsDir, "visual", name, `${arg}${ext}`),
            },
          },
        },
      },
    })),
  },
});
