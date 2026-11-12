import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// ADR-0004: the e2e job and the visual (screenshot) job run in one pinned Playwright image, and the image's browsers
// only match the Playwright the repo installs. Bump `@playwright/test` and every image together.
const MOVE_TOGETHER = "Bump `@playwright/test` and every Playwright image in .github/workflows/ci.yml (the e2e and visual jobs) together (ADR-0004).";

const dependency = JSON.parse(readFileSync("package.json", "utf8")).devDependencies["@playwright/test"];
const workflow = readFileSync(".github/workflows/ci.yml", "utf8");
const images = [
  ...workflow.matchAll(/^\s*image: mcr\.microsoft\.com\/playwright:v(\S+)-noble\s*$/gm),
].map(match => match[1]);

describe("the Playwright pin", () => {
  it("the Playwright dependency is pinned exactly", () => {
    expect(dependency, `@playwright/test must be a devDependency. ${MOVE_TOGETHER}`).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("the e2e and visual jobs each name a pinned image", () => {
    expect(images.length, `ci.yml must name an image in the e2e job and in the visual job: mcr.microsoft.com/playwright:v<X.Y.Z>-noble. ${MOVE_TOGETHER}`).toBeGreaterThanOrEqual(2);
    expect(images).toEqual(images.filter(version => /^\d+\.\d+\.\d+$/.test(version)));
  });

  it("every image the workflow names is the version package.json pins", () => {
    // The dependency must exist: a missing version is not "the same version".
    expect(dependency).toBeDefined();
    expect(images, `@playwright/test is ${dependency} but ci.yml names v${images.join(", v")}. ${MOVE_TOGETHER}`).toEqual(images.map(() => dependency));
  });
});
