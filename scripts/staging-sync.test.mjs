import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { STAGING_BRANCH } from "../stage";
import { STAGING_ORIGIN } from "./shots-guards.mjs";

// Which branch is staging and where it is served is written down in several places, and ADR-0005 leaves
// "what staging tracks once `redesign` is gone" to the Release: the day that changes, they change together.
// One copy left behind is not harmless: stage.ts decides which build carries the dev sign-in, the wizard writes
// Vercel variables for a branch, and the helper decides which host gets the bypass secret. This test fails
// `pnpm test` (the `check` job) when they differ, and names both places (the harness-sync.test.mjs way).
//
// The branch is STAGING_BRANCH in stage.ts. The origin has no TypeScript home, because no build decision
// reads it: the helper's STAGING_ORIGIN is the one the others are compared with. Nothing here edits a file.

const FIX = "Change them together: STAGING_BRANCH in stage.ts, \"git\".\"deploymentEnabled\" in vercel.json, STAGING_BRANCH and STAGING_FQDN in scripts/staging-wizard.sh, STAGING_ORIGIN in scripts/shots-guards.mjs and the documents named here (scripts/staging-sync.test.mjs).";
const read = file => readFileSync(file, "utf8");
const origin = new URL(STAGING_ORIGIN);

/** The value a shell script gives a variable at the start of a line: `NAME="value"` */
function shellVariable(file, name) {
  const match = new RegExp(`^${name}="([^"]*)"`, "m").exec(read(file));
  if (!match) {
    throw new Error(`${file} no longer sets ${name}="..." at the start of a line: update scripts/staging-sync.test.mjs.`);
  }
  return match[1];
}

describe("the staging identity", () => {
  it("is an https origin without a path", () => {
    expect(origin.protocol, STAGING_ORIGIN).toBe("https:");
    expect(origin.origin, STAGING_ORIGIN).toBe(STAGING_ORIGIN);
  });

  it("is the branch vercel.json deploys besides main", () => {
    const enabled = JSON.parse(read("vercel.json")).git.deploymentEnabled;
    const deployed = Object.entries(enabled).filter(([, on]) => on === true).map(([branch]) => branch).sort();
    expect(deployed, `vercel.json deploys ${deployed.join(", ")}; stage.ts says staging is ${STAGING_BRANCH}. ${FIX}`).toEqual(["main", STAGING_BRANCH].sort());
    // A pattern before the named branches would be a rule for every other branch to switch off.
    expect(enabled["**"], "vercel.json must keep \"**\": false, or every branch deploys").toBe(false);
  });

  it("is the branch and the host the staging wizard sets up", () => {
    expect(shellVariable("scripts/staging-wizard.sh", "STAGING_BRANCH"), `STAGING_BRANCH of the wizard against stage.ts. ${FIX}`).toBe(STAGING_BRANCH);
    expect(shellVariable("scripts/staging-wizard.sh", "STAGING_FQDN"), `STAGING_FQDN of the wizard against STAGING_ORIGIN of the helper. ${FIX}`).toBe(origin.host);
  });

  it.each([
    ["README.md", true],
    ["docs/agents/delivery.md", true],
    ["scripts/shots.mjs", false],
  ])("is the origin %s names", (file, namesBranch) => {
    const text = read(file);
    expect(text, `${file} does not name ${STAGING_ORIGIN}. ${FIX}`).toContain(STAGING_ORIGIN);
    if (namesBranch) {
      // The line that gives the origin also says which branch is served there.
      const lines = text.split(/\r?\n/).filter(line => line.includes(STAGING_ORIGIN));
      expect(lines.some(line => line.includes(`\`${STAGING_BRANCH}\``)), `${file} gives ${STAGING_ORIGIN} on a line that does not name \`${STAGING_BRANCH}\`. ${FIX}`).toBe(true);
    }
  });
});
