import { describe, expect, it } from "vitest";
import { buildsStorybook, carriesDevSignIn, isStagingBuild } from "./stage";

// Which builds carry the dev sign-in is decided here, from the environment of the build and nothing
// else (ADR-0005). Environments are data: a new case is a new row.

const PREVIEW_OF_REDESIGN = { VERCEL: "1", VERCEL_ENV: "preview", VERCEL_GIT_COMMIT_REF: "redesign" };

describe("carriesDevSignIn", () => {
  it.each<[string, boolean, Record<string, string>, boolean]>([
    ["the dev server", true, {}, true],
    [
      "a Vercel preview of redesign",
      false,
      PREVIEW_OF_REDESIGN,
      true,
    ],
    [
      "a Vercel preview of another branch",
      false,
      { ...PREVIEW_OF_REDESIGN, VERCEL_GIT_COMMIT_REF: "feat/235-dev-sign-in" },
      false,
    ],
    [
      "a Vercel production build of redesign",
      false,
      { ...PREVIEW_OF_REDESIGN, VERCEL_ENV: "production" },
      false,
    ],
    [
      "a Vercel production build of main",
      false,
      { ...PREVIEW_OF_REDESIGN, VERCEL_ENV: "production", VERCEL_GIT_COMMIT_REF: "main" },
      false,
    ],
    [
      "a local build without the switch",
      false,
      {},
      false,
    ],
    [
      "a local build with the switch",
      false,
      { WINNIES_STAGE: "staging" },
      true,
    ],
    [
      "a Vercel production build with the switch",
      false,
      {
        VERCEL: "1",
        VERCEL_ENV: "production",
        VERCEL_GIT_COMMIT_REF: "main",
        WINNIES_STAGE: "staging",
      },
      false,
    ],
    [
      "a Vercel preview of another branch with the switch",
      false,
      {
        VERCEL: "1",
        VERCEL_ENV: "preview",
        VERCEL_GIT_COMMIT_REF: "main",
        WINNIES_STAGE: "staging",
      },
      false,
    ],
    [
      "a local build with another switch value",
      false,
      { WINNIES_STAGE: "1" },
      false,
    ],
    [
      "a Vercel build of redesign without VERCEL_ENV",
      false,
      { VERCEL: "1", VERCEL_GIT_COMMIT_REF: "redesign" },
      false,
    ],
  ])("%s", (_name, dev, env, carries) => {
    expect(carriesDevSignIn(dev, env)).toBe(carries);
  });

  it("is carried by the dev server whatever the environment says", () => {
    expect(carriesDevSignIn(true, { VERCEL: "1", VERCEL_ENV: "production", VERCEL_GIT_COMMIT_REF: "main" })).toBe(true);
  });
});

// Whether a build also builds Storybook and serves it at /storybook (#298). A production build never does,
// and a build that cannot say what it is does not either.
describe("buildsStorybook", () => {
  it.each<[string, Record<string, string>, boolean]>([
    [
      "a Vercel production build of main",
      { VERCEL: "1", VERCEL_ENV: "production", VERCEL_GIT_COMMIT_REF: "main" },
      false,
    ],
    [
      "a Vercel production build of redesign",
      { VERCEL: "1", VERCEL_ENV: "production", VERCEL_GIT_COMMIT_REF: "redesign" },
      false,
    ],
    [
      "a Vercel production build with the local switch",
      {
        VERCEL: "1",
        VERCEL_ENV: "production",
        VERCEL_GIT_COMMIT_REF: "main",
        WINNIES_STAGE: "staging",
      },
      false,
    ],
    ["a Vercel preview of redesign", PREVIEW_OF_REDESIGN, true],
    [
      "a Vercel preview of another branch",
      { ...PREVIEW_OF_REDESIGN, VERCEL_GIT_COMMIT_REF: "feat/298-x" },
      true,
    ],
    [
      "a Vercel development build",
      { VERCEL: "1", VERCEL_ENV: "development" },
      true,
    ],
    [
      "a Vercel build without VERCEL_ENV",
      { VERCEL: "1" },
      false,
    ],
    [
      "a Vercel build with an unknown VERCEL_ENV",
      { VERCEL: "1", VERCEL_ENV: "staging" },
      false,
    ],
    ["a local build without the switch", {}, false],
    [
      "a local build with the switch",
      { WINNIES_STAGE: "staging" },
      true,
    ],
    [
      "a local build with another switch value",
      { WINNIES_STAGE: "1" },
      false,
    ],
  ])("%s", (_name, env, builds) => {
    expect(buildsStorybook(env)).toBe(builds);
  });
});

describe("isStagingBuild", () => {
  it("says a Vercel preview of redesign is the staging build", () => {
    expect(isStagingBuild(PREVIEW_OF_REDESIGN)).toBe(true);
  });

  it("says a build with no environment is not", () => {
    expect(isStagingBuild({})).toBe(false);
  });
});
