import type { ConfigOptions } from "@nuxt/test-utils/playwright";
import process from "node:process";
import { defineConfig, devices } from "@playwright/test";
import { loadTestEnv, TEST_SERVER_PORT } from "./tests/support/env";

// Before the workers start (and again in each worker, harmlessly): they inherit TEST_DATABASE_URL.
loadTestEnv();

// The server is built and started once per run by tests/e2e/global-setup.ts, the same one the API
// tests use (tests/support/test-server.ts); `host` below is what keeps @nuxt/test-utils from building
// and starting another one in every worker.
export default defineConfig<ConfigOptions>({
  testDir: "tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // A flaky test is fixed or deleted, never retried (CODING_STANDARDS, Behaviour).
  retries: 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI
    ? [
        ["list"],
        [
          "html",
          { open: "never" },
        ],
      ]
    : "list",
  use: {
    // `localhost`, not 127.0.0.1: the session cookies of signInAsOwner() are for `localhost` (BETTER_AUTH_URL).
    nuxt: { host: `http://localhost:${TEST_SERVER_PORT}` },
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
