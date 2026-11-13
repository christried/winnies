/* eslint-disable node/no-process-env -- the build's environment is this file's input, like server/utils/env.ts */
import process from "node:process";

// Decides at build time which builds carry the dev sign-in (ADR-0005, #235). Plain TypeScript without
// Nuxt imports: nuxt.config.ts reads it, stage.test.ts covers it. There is no run-time variable.

/**
 * The branch whose Vercel preview build is the staging build. This is where the build decides it;
 * vercel.json, scripts/staging-wizard.sh and scripts/shots.mjs repeat the branch or origin, and a test
 * keeps those copies equal.
 */
export const STAGING_BRANCH = "redesign";

/**
 * Whether this build is the staging build: a Vercel preview of the staging branch. Vercel sets
 * VERCEL=1, and there only what Vercel says counts, so no dashboard variable can turn production
 * into staging. Off Vercel, WINNIES_STAGE=staging in .env simulates it locally.
 *
 * @param env the environment of the build
 * @returns true for the staging build
 */
export function isStagingBuild(env: Record<string, string | undefined> = process.env): boolean {
  if (env.VERCEL) {
    return env.VERCEL_ENV === "preview" && env.VERCEL_GIT_COMMIT_REF === STAGING_BRANCH;
  }
  return env.WINNIES_STAGE === "staging";
}

/** The route of the dev sign-in: nuxt.config.ts registers it, and tests/build/dev-sign-in.test.ts looks for it in the production build */
export const DEV_SIGN_IN_ROUTE = "/api/dev/sign-in";

/** Where staging serves Storybook; nuxt.config.ts mounts it there and tests/build/storybook.test.ts looks for it in the production build */
export const STORYBOOK_ROUTE = "/storybook";

/**
 * Whether this build also builds Storybook and serves it at STORYBOOK_ROUTE (#298): every non-production
 * Vercel build, so the human can judge motion on staging. A production build never does. On Vercel only
 * what Vercel says counts, and a missing or unknown VERCEL_ENV is false: a build that cannot say what it is
 * does not get Storybook. Off Vercel, WINNIES_STAGE=staging in .env simulates it locally, as for isStagingBuild.
 *
 * @param env the environment of the build
 * @returns true when the build carries Storybook
 */
export function buildsStorybook(env: Record<string, string | undefined> = process.env): boolean {
  if (env.VERCEL) {
    return env.VERCEL_ENV === "preview" || env.VERCEL_ENV === "development";
  }
  return env.WINNIES_STAGE === "staging";
}

/** What a build calls itself: the page title's product name and the folder its favicons are served from */
export interface StageBranding {
  name: string;
  iconDir: string;
}

/**
 * How a build names itself, so staging and production can be told apart at a glance (#237). The
 * caller passes isStagingBuild(): nuxt.config.ts hands the result to the page as appConfig.brand, never
 * as runtimeConfig, whose NUXT_PUBLIC_* variables could flip production's title at run time (ADR-0005).
 *
 * The staging icons in public/staging/ are generated from public/ by `pnpm favicons:stage`
 * (scripts/favicon-stage.mjs); the colour rule is in scripts/favicon-tint.mjs (#237).
 *
 * @param staging whether this is the staging build
 * @returns the product name and icon folder of the build
 */
export function stageBranding(staging: boolean): StageBranding {
  return staging
    ? { name: "Winnies Staging", iconDir: "/staging/" }
    : { name: "Winnies", iconDir: "/" };
}

/**
 * Whether this build registers the dev sign-in (server/dev/sign-in.ts): the dev server and the
 * staging build, so agents can check the Workspace as a signed-in Owner. A production build never does.
 *
 * @param dev whether Nuxt runs the dev server
 * @param env the environment of the build
 * @returns true when the build carries the dev sign-in
 */
export function carriesDevSignIn(dev: boolean, env: Record<string, string | undefined> = process.env): boolean {
  return dev || isStagingBuild(env);
}
