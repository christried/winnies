import { describe, expect, it } from "vitest";
import { asksForUpdate, assertInContainer, pinnedImage, visualRun } from "./visual-env.mjs";

// Baselines come out of the pinned Playwright image and nowhere else (ADR-0004), so a run on the host is refused
// before the config lets Vitest write or compare anything. The refusals are what a developer on Windows sees.

const INSIDE = { WINNIES_VISUAL: "container" };

describe("scripts/visual-env.mjs assertInContainer", () => {
  it("lets the suite run inside the container, with or without an update", () => {
    expect(() => assertInContainer({
      env: INSIDE,
      argv: ["vitest", "run"],
    })).not.toThrow();
    expect(() => assertInContainer({
      env: INSIDE,
      argv: ["vitest", "run", "--update"],
    })).not.toThrow();
  });

  it("refuses a plain run on the host and names the Podman script", () => {
    expect(() => assertInContainer({
      env: {},
      argv: ["vitest", "run"],
    })).toThrow(/pnpm test:visual:podman`\./);
  });

  it.each([
    [
      "--update",
      ["vitest", "run", "--update"],
    ],
    [
      "-u",
      ["vitest", "run", "-u"],
    ],
    [
      "--update=all",
      ["vitest", "run", "--update=all"],
    ],
  ])("refuses %s on the host before a baseline can be written", (_flag, argv) => {
    expect(() => assertInContainer({ env: {}, argv })).toThrow(/Baselines are written inside the pinned Playwright image only/);
    expect(() => assertInContainer({ env: {}, argv })).toThrow(/pnpm test:visual:podman` --update/);
  });

  it.each([
    ["unset", undefined],
    ["empty", ""],
    ["another value", "host"],
    ["a truthy look-alike", "1"],
  ])("refuses when WINNIES_VISUAL is %s", (_case, value) => {
    expect(() => assertInContainer({
      env: { WINNIES_VISUAL: value },
      argv: ["vitest", "run", "--update"],
    })).toThrow();
  });
});

describe("scripts/visual-env.mjs asksForUpdate", () => {
  it("is false for a run that only compares", () => {
    expect(asksForUpdate([
      "vitest",
      "run",
      "--project",
      "workspace-dark",
    ])).toBe(false);
  });

  it("does not take a longer flag for an update", () => {
    expect(asksForUpdate(["vitest", "run", "--update-snapshots-not-a-flag"])).toBe(false);
  });
});

describe("scripts/visual-env.mjs visualRun", () => {
  it("a comparing run runs `test:visual` as CI, and forwards everything", () => {
    expect(visualRun([])).toEqual({
      update: false,
      script: "test:visual",
      forwarded: [],
    });
    expect(visualRun(["--project", "workspace-dark"])).toEqual({
      update: false,
      script: "test:visual",
      forwarded: ["--project", "workspace-dark"],
    });
  });

  it.each(["--update", "-u"])("%s runs `test:visual:update`, which carries the one update flag, so none is forwarded", (flag) => {
    expect(visualRun([flag, "--project", "workspace-dark"])).toEqual({
      update: true,
      script: "test:visual:update",
      forwarded: ["--project", "workspace-dark"],
    });
  });

  it("--update=new hands Vitest that one flag, through `test:visual`, which has none of its own", () => {
    expect(visualRun(["--update=new", "--project", "workspace-dark"])).toEqual({
      update: true,
      script: "test:visual",
      forwarded: ["--update=new", "--project", "workspace-dark"],
    });
  });

  it("several update flags still hand Vitest exactly one", () => {
    expect(visualRun(["-u", "--update=new", "--update"]).forwarded).toEqual(["--update=new"]);
    expect(visualRun(["--update=all", "--update=new"]).forwarded).toEqual(["--update=new"]);
  });
});

describe("scripts/visual-env.mjs pinnedImage", () => {
  it("is the e2e job's image for the Playwright the repo installs", () => {
    expect(pinnedImage("1.65.0")).toBe("mcr.microsoft.com/playwright:v1.65.0-noble");
  });
});
