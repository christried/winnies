import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// ADR-0004: the e2e job runs in one pinned Playwright image, and the image's browsers only match the
// Playwright the repo installs. Bump `@playwright/test` and the e2e image together.
const MOVE_TOGETHER = "Bump `@playwright/test` and the e2e image in .github/workflows/ci.yml together (ADR-0004).";

const dependency = JSON.parse(readFileSync("package.json", "utf8")).devDependencies["@playwright/test"];
const workflow = readFileSync(".github/workflows/ci.yml", "utf8");
const images = [...workflow.matchAll(/^\s*image: mcr\.microsoft\.com\/playwright:v(\S+)-noble\s*$/gm)].map(match => match[1]);

describe("the Playwright pin", () => {
  it("the Playwright dependency is pinned exactly", () => {
    expect(dependency, `@playwright/test must be a devDependency. ${MOVE_TOGETHER}`).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("the e2e job names the pinned image", () => {
    expect(images, `ci.yml must name exactly one image: mcr.microsoft.com/playwright:v<X.Y.Z>-noble. ${MOVE_TOGETHER}`).toHaveLength(1);
    expect(images[0]).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("package.json and the image carry the same version", () => {
    // Both must exist: two missing versions are not "the same version".
    expect(dependency).toBeDefined();
    expect(images[0], `The e2e image is v${images[0]} but @playwright/test is ${dependency}. ${MOVE_TOGETHER}`).toBe(dependency);
  });
});
