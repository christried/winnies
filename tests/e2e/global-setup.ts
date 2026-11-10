import { mkdir, writeFile } from "node:fs/promises";
import { startTestServer } from "../support/test-server";

// Once per run, before any worker starts. Not a Playwright setup project: that would run inside a
// worker, and Playwright restarts workers after a failed test, which would orphan the server and drop
// the run lock.
export default async function globalSetup() {
  const server = await startTestServer({ command: "pnpm test:e2e" });

  return async function globalTeardown() {
    // Playwright empties test-results/ at the start of a run; CI uploads it when the run failed.
    await mkdir("test-results", { recursive: true });
    await writeFile("test-results/server.log", server.logs().slice(-200).join("\n"));
    await server.stop();
  };
}
