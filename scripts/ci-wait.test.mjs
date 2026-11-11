import { spawnSync } from "node:child_process";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const script = fileURLToPath(new URL("./ci-wait.mjs", import.meta.url));

// A background wait relies on --until-done: a mistyped flag read as the 2.5-minute wait ends it early, and the
// orchestrator reads exit 2 as "still running" (#255). An unknown flag stops the script before any gh call.
describe("ci-wait.mjs", () => {
  it("refuses an unknown flag, names it, and waits for nothing", () => {
    const run = spawnSync(process.execPath, [script, "--until-don"], { encoding: "utf8" });

    expect(run.status).toBe(1);
    expect(run.stdout).toContain("--until-don");
    expect(run.stdout).not.toContain("waiting for CI");
  });
});
