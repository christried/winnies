import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import os from "node:os";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const script = fileURLToPath(new URL("./branch-prune.mjs", import.meta.url));
const settings = fileURLToPath(new URL("../.claude/settings.json", import.meta.url));

// The script deletes remote branches. A flag or an argument it does not know must stop it before any git call: a
// mistyped --dry-run read as a real run is what this check is for. It runs outside any repository, so a script that
// got past the guard would fail on git and could not reach this repository's origin.
describe("branch-prune.mjs", () => {
  it.each([
    ["--dryrun", "--dryrun"],
    ["foo", "foo"],
  ])("refuses %s, names it, and prints nothing else", (arg, named) => {
    const run = spawnSync(process.execPath, [script, arg], {
      encoding: "utf8",
      cwd: os.tmpdir(),
    });

    expect(run.status).toBe(2);
    expect(run.stderr).toContain(named);
    expect(run.stderr).toContain("usage: node scripts/branch-prune.mjs [--dry-run]");
    expect(run.stdout).toBe("");
  });
});

// Auto mode runs the script without asking the classifier because of these entries, and only because of them. A rule
// is an exact command when it has no `*`, so the list stays as narrow as it reads (the human, 2026-11-12, #288).
describe(".claude/settings.json permissions.allow", () => {
  const allow = JSON.parse(readFileSync(settings, "utf8")).permissions.allow;

  it("allows the prune script, with and without --dry-run, and nothing else", () => {
    expect(allow).toEqual([
      "Bash(node scripts/branch-prune.mjs)",
      "Bash(node scripts/branch-prune.mjs --dry-run)",
    ]);
  });

  it("holds no wildcard", () => {
    expect(allow.filter(entry => entry.includes("*"))).toEqual([]);
  });
});
