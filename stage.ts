/* eslint-disable node/no-process-env -- the build's environment is this file's input, like server/utils/env.ts */
import process from "node:process";

// Decides at build time which builds carry the dev sign-in (ADR-0005, #235). Plain TypeScript without
// Nuxt imports: nuxt.config.ts reads it, stage.test.ts covers it. There is no run-time variable.

/** The branch whose Vercel preview build is the staging build; the one place that names it */
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
