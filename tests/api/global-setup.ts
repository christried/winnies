import type { TestProject } from "vitest/node";
import { startTestServer } from "../support/test-server";

// Once per run, not once per file: the server is built and started by tests/support/test-server.ts,
// which the e2e suite shares.
export default async function setup(project: TestProject) {
  const server = await startTestServer({ command: "pnpm test:api" });
  project.provide("serverUrl", server.url);

  return async function teardown() {
    if (project.vitest.state.getCountOfFailedTests() > 0) {
      console.log(`--- last server output ---\n${server.logs().slice(-30).join("\n")}`);
    }
    await server.stop();
  };
}
