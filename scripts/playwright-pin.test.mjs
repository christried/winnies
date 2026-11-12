import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { pinnedImage } from "./visual-env.mjs";

// ADR-0004: the e2e job and the visual (screenshot) job run in one pinned Playwright image, and the image's browsers
// only match the Playwright the repo installs. Bump `@playwright/test` and every image together. What an image
// reference looks like is decided once, by `pinnedImage` in visual-env.mjs, which the Podman script uses too.
const MOVE_TOGETHER = "Bump `@playwright/test` and every Playwright image in .github/workflows/ci.yml (the e2e and visual jobs) together (ADR-0004).";
const PINNED_JOBS = ["e2e", "visual"];

const dependency = JSON.parse(readFileSync("package.json", "utf8")).devDependencies["@playwright/test"];
const workflow = readFileSync(".github/workflows/ci.yml", "utf8");

/**
 * The image a job of the workflow runs in: the `image:` under that job's own `container:`. No YAML library is a
 * dependency (scripts/harness-sync.test.mjs reads ci.yml the same way); jobs sit at two spaces of indent.
 * @param {string} text ci.yml
 * @param {string} job the job's key
 * @returns {string | undefined} the image reference, or undefined when the job has no container image
 */
function containerImage(text, job) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const start = lines.findIndex(line => line === `  ${job}:`);
  if (start === -1) {
    return undefined;
  }
  const length = lines.slice(start + 1).findIndex(line => /^ {0,2}\S/.test(line));
  const body = lines.slice(start + 1, length === -1
    ? undefined
    : start + 1 + length);
  const container = body.findIndex(line => /^ {4}container:\s*$/.test(line));
  return container === -1
    ? undefined
    : body.slice(container + 1).map(line => /^ {6}image:\s*(\S+)\s*$/.exec(line)?.[1]).find(Boolean);
}

describe("the Playwright pin", () => {
  it("the Playwright dependency is pinned exactly", () => {
    expect(dependency, `@playwright/test must be a devDependency. ${MOVE_TOGETHER}`).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it.each(PINNED_JOBS)("the %s job runs in the image of the version package.json pins", (job) => {
    // The dependency must exist: a missing version is not "the same version".
    expect(dependency).toBeDefined();
    expect(containerImage(workflow, job), `ci.yml's ${job} job must run in container image ${pinnedImage(dependency)}, the Playwright package.json pins (${dependency}). ${MOVE_TOGETHER}`).toBe(pinnedImage(dependency));
  });

  it("reads the image of the job it is asked for (a job it does not find must not pass as 'no image')", () => {
    const text = [
      "jobs:",
      "  other:",
      "    container:",
      "      image: other:1",
      "  e2e:",
      "    runs-on: x",
      "    services:",
      "      db:",
      "        image: postgres:17",
      "    container:",
      "      image: playwright:1",
      "      options: --ipc=host",
      "  visual:",
      "    runs-on: x",
    ].join("\r\n");
    expect(containerImage(text, "e2e")).toBe("playwright:1");
    expect(containerImage(text, "other")).toBe("other:1");
    expect(containerImage(text, "visual")).toBeUndefined();
    expect(containerImage(text, "missing")).toBeUndefined();
  });
});
