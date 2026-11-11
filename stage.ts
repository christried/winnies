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

/** The route of the dev sign-in: nuxt.config.ts registers it, and tests/build/dev-sign-in.test.ts looks for it in the production build */
export const DEV_SIGN_IN_ROUTE = "/api/dev/sign-in";

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
 * The staging icons in public/staging/ are the three shipped icons (public/favicon.svg,
 * favicon-running.svg, favicon-won.svg) with every flat colour hue-rotated by +180 degrees, saturation
 * and lightness kept, written as literal hex. Shapes, viewBox and coordinates stay as they are; only
 * the colour values change:
 *
 *   #001e29 (tile)        -> #290b00
 *   #bdff00 (w, ring, hand) -> #4200ff
 *   #ffbf00 (cup)         -> #0040ff
 *
 * After a new production icon: copy it to public/staging/ under the same name, replace each of its
 * hex values by the same rule (convert to HSL, add 180 to the hue modulo 360, convert back; a colour
 * not in the table gets a new row here), and render all three at 32 px to check the tab. public/favicon.ico
 * is not tinted; it only shows where the browser asks for it without a link (Nuxt's default error page).
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
