import { defineConfig } from "vitest/config";

// Reads the built server in .output, so it has no Nuxt environment and no database. `pnpm test` skips
// it (vitest.config.ts excludes tests/**); the `check` job runs it after its build.
export default defineConfig({
  test: {
    name: "build",
    include: ["tests/build/**/*.test.ts"],
    environment: "node",
  },
});
