import { spawnSync } from "node:child_process";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const script = fileURLToPath(new URL("./worktree-clean.mjs", import.meta.url));

// The script removes worktrees. A flag it does not know must stop it before any git call: a mistyped
// --dry-run read as a real run is the one thing this check is for.
describe("worktree-clean.mjs", () => {
  it("refuses an unknown flag, names it, and prints nothing else", () => {
    const run = spawnSync(process.execPath, [script, "--dryrun"], { encoding: "utf8" });

    expect(run.status).not.toBe(0);
    expect(run.stderr).toContain("--dryrun");
    expect(run.stdout).toBe("");
  });
});
