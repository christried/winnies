import { existsSync, readFileSync } from "node:fs";
import process from "node:process";
import { parseEnv } from "node:util";
import { z } from "zod";
import { proxyAddress } from "./neon-local.mjs";

// The one place the tests read the environment (like server/utils/env.ts for the app).

/**
 * The built server under test listens here. Fixed, so BETTER_AUTH_URL (and with it the session
 * cookie's name and domain) is the same on every machine and in CI.
 */
export const TEST_SERVER_PORT = 3101;

// Not secrets: they only ever meet the throwaway test database and a server that nobody else can
// reach. The test Better Auth instance and the server under test share the secret by construction.
// Keep in sync with the job-level `env:` of `api-tests` and `e2e` in .github/workflows/ci.yml.
const HARNESS_ENV = {
  BETTER_AUTH_SECRET: "winnies-test-secret-not-a-secret-0123456789",
  BETTER_AUTH_URL: `http://localhost:${TEST_SERVER_PORT}`,
  DISCORD_CLIENT_ID: "test-discord-client-id",
  DISCORD_CLIENT_SECRET: "test-discord-client-secret",
  NUXT_PUBLIC_APP_URL: `http://localhost:${TEST_SERVER_PORT}`,
};

// TEST_DATABASE_URL lives here and not in server/utils/env.ts: that schema runs at every build, and
// the app never reads this variable. It must never be set on the hosting provider.
const testEnvSchema = z.object({
  TEST_DATABASE_URL: z.url("TEST_DATABASE_URL must be a valid connection URL. See .env.example."),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.url(),
  DISCORD_CLIENT_ID: z.string().min(1),
  DISCORD_CLIENT_SECRET: z.string().min(1),
  NUXT_PUBLIC_APP_URL: z.url(),
});

/**
 * The environment the API tests run with
 */
export type TestEnv = z.infer<typeof testEnvSchema>;

/**
 * Loads `.env.test` into the process when it exists. Variables already set (CI's job env) win.
 */
export function loadTestEnv(): void {
  if (existsSync(".env.test")) {
    process.loadEnvFile(".env.test");
  }
}

function databaseName(connectionUrl: string): string {
  return decodeURIComponent(new URL(connectionUrl).pathname.replace(/^\//, ""));
}

// A developer's real database lives in DATABASE_URL, in the shell or in .env. The harness never
// loads .env, it only looks inside it.
function developmentDatabaseUrls(): string[] {
  const urls = [process.env.DATABASE_URL];
  if (existsSync(".env")) {
    urls.push(parseEnv(readFileSync(".env", "utf8")).DATABASE_URL);
  }
  return urls.filter((url): url is string => Boolean(url));
}

/**
 * Validates the test environment and refuses to continue when the test database could be a real one.
 * Runs before anything is emptied, which is the one irreversible step of a run.
 *
 * @returns the validated environment
 */
export function readTestEnv(): TestEnv {
  if (!process.env.TEST_DATABASE_URL) {
    throw new Error("TEST_DATABASE_URL is not set. Copy .env.example to .env.test and fill in the test values (see the README, Tests).");
  }

  const result = testEnvSchema.safeParse({ TEST_DATABASE_URL: process.env.TEST_DATABASE_URL, ...HARNESS_ENV });
  if (!result.success) {
    throw new Error(`Invalid test environment:\n${z.prettifyError(result.error)}`);
  }
  const env = result.data;

  // The driver refuses any other host when it connects; this stops the run before anything is emptied.
  proxyAddress(new URL(env.TEST_DATABASE_URL).hostname);
  if (!/test/i.test(databaseName(env.TEST_DATABASE_URL))) {
    throw new Error(`Refusing to run: the database name in TEST_DATABASE_URL ("${databaseName(env.TEST_DATABASE_URL)}") does not contain "test", and a run empties that database.`);
  }
  if (developmentDatabaseUrls().includes(env.TEST_DATABASE_URL)) {
    throw new Error("Refusing to run: TEST_DATABASE_URL is the same as DATABASE_URL (in the environment or in .env), and a run empties that database.");
  }

  return env;
}

/**
 * The variables of the server under test and of the build, given to both explicitly so a developer's
 * `.env` (which holds a real database) is never what the server runs with.
 *
 * @param env the validated test environment
 * @returns the six variables `server/utils/env.ts` validates
 */
export function serverEnv(env: TestEnv): Record<string, string> {
  const { TEST_DATABASE_URL, ...rest } = env;
  return { DATABASE_URL: TEST_DATABASE_URL, ...rest };
}
