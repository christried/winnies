import { defineConfig } from "vitest/config";
import { loadTestEnv } from "./tests/support/env";

// Before the workers start, so they inherit TEST_DATABASE_URL.
loadTestEnv();

// Plain defineConfig, not defineVitestConfig: that one is for the Nuxt unit environment, and
// `@nuxt/test-utils/e2e` warns when it resolved the config.
export default defineConfig({
  test: {
    include: ["tests/api/**/*.test.ts"],
    environment: "node",
    globalSetup: ["tests/api/global-setup.ts"],
    testTimeout: 15_000,
    // The global setup builds the app, and a Windows build is slow.
    hookTimeout: 300_000,
  },
});
