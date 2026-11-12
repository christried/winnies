// What keeps a screenshot baseline from coming out of the wrong place (ADR-0004, spec #257 § 9): the suite and its
// `--update` run only inside the pinned Playwright image. Windows rasterizes fonts differently, so a baseline written
// there would never match CI. The container script and the `visual` CI job set WINNIES_VISUAL=container; the config
// calls this before Vitest writes anything. Apart from the config so scripts/visual-env.test.mjs can run it. No IO here.

export const CONTAINER_ENV = "WINNIES_VISUAL";
export const CONTAINER_VALUE = "container";

/**
 * Whether the arguments ask Vitest to rewrite reference images.
 *
 * @param {readonly string[]} argv the process arguments
 * @returns {boolean} true for `-u`, `--update` and `--update=<mode>`
 */
export function asksForUpdate(argv) {
  return argv.some(arg => arg === "-u" || arg === "--update" || arg.startsWith("--update="));
}

/**
 * Stops a screenshot run, and above all a baseline update, outside the pinned image.
 *
 * @param {{ env: Record<string, string | undefined>, argv: readonly string[] }} run the process environment and arguments
 * @returns {void}
 * @throws {Error} when the run is not inside the container; a sentence for the caller
 */
export function assertInContainer({ env, argv }) {
  if (env[CONTAINER_ENV] === CONTAINER_VALUE) {
    return;
  }
  const what = asksForUpdate(argv)
    ? "Baselines are written inside the pinned Playwright image only (ADR-0004); a baseline from this machine would never match CI."
    : "The screenshot suite runs inside the pinned Playwright image only (ADR-0004); a run from this machine would never match the baselines.";
  throw new Error(`${what} Use \`pnpm test:visual:podman\`${asksForUpdate(argv)
    ? " --update"
    : ""}.`);
}

/**
 * The pinned image of the screenshot suite and of the `e2e` job, from the version of `@playwright/test`.
 *
 * @param {string} playwrightVersion the exact version in package.json
 * @returns {string} the image reference
 */
export function pinnedImage(playwrightVersion) {
  return `mcr.microsoft.com/playwright:v${playwrightVersion}-noble`;
}
