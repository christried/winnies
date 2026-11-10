import type { PoolClient } from "@neondatabase/serverless";
import type { TestProject } from "vitest/node";
import { rm } from "node:fs/promises";
import { createServer } from "node:net";
import process from "node:process";
import { buildFixture, createTestContext, getServerLogs, loadFixture, startServer, stopServer } from "@nuxt/test-utils/e2e";
import { migrate } from "drizzle-orm/neon-serverless/migrator";
import { createTestDb } from "../support/db";
import { readTestEnv, serverEnv, TEST_SERVER_PORT } from "../support/env";

// Once per run, not once per file: `setup()` of @nuxt/test-utils/e2e would build and start the server
// in every test file. This calls the functions behind it from here instead, so test-utils is still
// what builds and starts the server.

// Arbitrary, only has to be the same in every run. A session-level advisory lock is released by
// Postgres when the connection closes, so a run that dies cannot leave it held.
const RUN_LOCK_KEY = 1_960_196;
const LOCK_WAIT_MS = 10 * 60_000;
const LOCK_KEEPALIVE_MS = 30_000;

const PRELOAD = new URL("../support/neon-local-preload.mjs", import.meta.url).href;

declare module "vitest" {
  export interface ProvidedContext {
    serverUrl: string;
  }
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// The WebSocket behind the Neon driver reports a refused connection as an event with an empty message.
function describeError(error: unknown): string {
  const e = error as { message?: string; error?: { message?: string; code?: string }; code?: string; type?: string };
  return e.message || e.error?.message || e.error?.code || e.code || (e.type ? `${e.type} event` : "connection failed");
}

function describeTarget(connectionUrl: string): string {
  const url = new URL(connectionUrl);
  return `${url.hostname}:${url.port || "5432"}${url.pathname}`;
}

async function assertPortFree(port: number) {
  await new Promise<void>((resolve, reject) => {
    const probe = createServer();
    probe.once("error", () => reject(new Error(`Port ${port} is in use, so the server under test cannot start. Stop what is listening there and run "pnpm test:api" again.`)));
    probe.listen(port, "127.0.0.1", () => probe.close(() => resolve()));
  });
}

export default async function setup(project: TestProject) {
  const env = readTestEnv();
  const { pool, db } = createTestDb(2_000);
  let lockClient: PoolClient | undefined;
  let keepAlive: NodeJS.Timeout | undefined;

  async function release() {
    clearInterval(keepAlive);
    try {
      await lockClient?.query("select pg_advisory_unlock($1)", [RUN_LOCK_KEY]);
    }
    catch {
      // The connection is gone, and with it the lock.
    }
    lockClient?.release(true);
    lockClient = undefined;
    await pool.end().catch(() => {});
  }

  try {
    // Reach the database. `up -d` returns before Postgres is ready, hence the retry.
    let lastError: unknown;
    for (let attempt = 0; attempt < 20 && !lockClient; attempt++) {
      try {
        const client = await pool.connect();
        await client.query("select 1");
        lockClient = client;
      }
      catch (error) {
        lastError = error;
        await sleep(500);
      }
    }
    if (!lockClient) {
      throw new Error(`The test database is not running or not reachable at ${describeTarget(env.TEST_DATABASE_URL)} (${describeError(lastError)}). Start it with "pnpm test:db:up" and run "pnpm test:api" again.`);
    }

    // Take the run-long lock before anything is emptied: two runs against one database (three agents
    // on one machine) must never empty it under each other. It also serialises the fixed port.
    const waitStarted = Date.now();
    let announced = false;
    for (;;) {
      const { rows } = await lockClient.query("select pg_try_advisory_lock($1) as locked", [RUN_LOCK_KEY]);
      if (rows[0].locked) {
        break;
      }
      if (!announced) {
        console.log("Waiting for another API test run to finish (it holds the test database)...");
        announced = true;
      }
      if (Date.now() - waitStarted > LOCK_WAIT_MS) {
        throw new Error("Gave up waiting for another API test run to finish after 10 minutes. If none is running, stop the database with \"pnpm test:db:down\" and start it again.");
      }
      await sleep(1_000);
    }
    // Idle connections can be dropped by the proxy, and with them the lock.
    keepAlive = setInterval(() => void lockClient?.query("select 1").catch(() => {}), LOCK_KEEPALIVE_MS).unref();

    // Empty it. The `drizzle` schema holds the migration journal: leaving it would make the migrate skip everything.
    try {
      await db.execute("drop schema if exists drizzle cascade");
      await db.execute("drop schema if exists public cascade");
      await db.execute("create schema public");
    }
    catch (error) {
      throw new Error(`Could not empty the test database: ${describeError(error)}. The role in TEST_DATABASE_URL must own the "public" schema (the compose superuser does).`);
    }
    await migrate(db, { migrationsFolder: "server/db/migrations" });

    await assertPortFree(TEST_SERVER_PORT);

    // The build and the server get the six variables explicitly: the Nuxt config loader also reads a
    // developer's .env, which holds a real database. Variables already in the process win over .env.
    // Only for the build: the test workers inherit this process's environment, and the guard in
    // readTestEnv() must not see DATABASE_URL there.
    const streams = { stdout: process.stdout.write, stderr: process.stderr.write };
    const consoleMethods = { ...console };
    const buildEnv = serverEnv(env);
    const before = Object.fromEntries(Object.keys(buildEnv).map(key => [key, process.env[key]]));
    Object.assign(process.env, buildEnv);
    const nodeOptions = [process.env.NODE_OPTIONS, `--import=${PRELOAD}`].filter(Boolean).join(" ");
    const context = createTestContext({
      rootDir: process.cwd(),
      browser: false,
      // Errors only: the build otherwise lists every file it writes.
      logLevel: 0,
      port: TEST_SERVER_PORT,
      env: { ...buildEnv, NODE_OPTIONS: nodeOptions },
    });
    // test-utils' default compatibility date would override the app's own.
    delete context.options.nuxtConfig.compatibilityDate;

    // A dying run must not leave the server alive.
    const killServer = () => context.serverProcess?.kill();
    process.once("exit", killServer);

    try {
      await loadFixture();
      await buildFixture();
      await startServer(context.options.env);
    }
    catch (error) {
      const tail = getServerLogs().slice(-30).join("\n");
      await stopServer();
      throw new Error(`${describeError(error)}${tail ? `\n--- last server output ---\n${tail}` : ""}`);
    }
    finally {
      // Nuxt takes over the console and the standard streams while it loads, and Vitest's own report
      // would vanish into its logger.
      process.stdout.write = streams.stdout;
      process.stderr.write = streams.stderr;
      Object.assign(console, consoleMethods);

      for (const [key, value] of Object.entries(before)) {
        if (value === undefined) {
          delete process.env[key];
        }
        else {
          process.env[key] = value;
        }
      }
    }

    project.provide("serverUrl", `http://127.0.0.1:${TEST_SERVER_PORT}`);

    return async function teardown() {
      if (project.vitest.state.getCountOfFailedTests() > 0) {
        console.log(`--- last server output ---\n${getServerLogs().slice(-30).join("\n")}`);
      }
      process.off("exit", killServer);
      await stopServer();
      // test-utils only removes the build directory when it created it itself, and Nuxt already has.
      await rm(context.nuxt!.options.buildDir, { recursive: true, force: true });
      await release();
    };
  }
  catch (error) {
    await release();
    throw error;
  }
}
