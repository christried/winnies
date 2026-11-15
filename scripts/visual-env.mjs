// What keeps a screenshot baseline from coming out of the wrong place (ADR-0004, spec #257 § 9): the suite and its
// `--update` run only inside the pinned Playwright image. Windows rasterizes fonts differently, so a baseline written
// there would never match CI. The container script and the `visual` CI job set WINNIES_VISUAL=container; the config
// calls this before Vitest writes anything. Apart from the config so scripts/visual-env.test.mjs can run it. No IO here.

import { screenshotName } from "../.storybook/visual-variants.ts";

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
 * What `pnpm test:visual:image` runs inside the container for the arguments it was given, so that Vitest is handed
 * exactly one update flag: `test:visual:update` carries its own `--update`, so with it the bare flags are dropped; a
 * `--update=<mode>` goes through `test:visual`, which has none, and the last mode given is the one forwarded.
 *
 * @param {readonly string[]} args the arguments after the script's name
 * @returns {{ update: boolean, script: string, forwarded: string[] }} whether it rewrites baselines (and so runs without `CI=true`), the package script, and the arguments for Vitest
 */
export function visualRun(args) {
  const update = asksForUpdate(args);
  const lastMode = args.findLastIndex(arg => arg.startsWith("--update="));
  const forwarded = args.filter((arg, index) => arg !== "-u" && arg !== "--update" && (!arg.startsWith("--update=") || index === lastMode));
  return {
    update,
    script: update && lastMode === -1
      ? "test:visual:update"
      : "test:visual",
    forwarded,
  };
}

// Where the baselines live; the folder `git status` is asked about after an update with a file filter (#367).
export const SCREENSHOTS_DIR = "stories/__screenshots__";

/**
 * The file filters among the arguments forwarded to Vitest. Vitest decides what is a filter, so the value of `--project`
 * or `-t` is not one and no list of flags is kept here. Loaded on the call, so a run with no update does not pay for it.
 *
 * @param {readonly string[]} forwarded the arguments for Vitest
 * @returns {Promise<string[]>} the filters, as given
 */
export async function vitestFilters(forwarded) {
  const { parseCLI } = await import("vitest/node");
  return [
    ...parseCLI(["vitest", "run", ...forwarded]).filter,
  ];
}

/**
 * The paths in `git status --porcelain=v1 -z --untracked-files=all -- stories/__screenshots__`: entries are NUL-separated
 * `XY path`; a rename or a copy is followed by one more entry holding the old path, and both count.
 *
 * @param {string} porcelain the output
 * @returns {string[]} the repo-relative posix paths, in the order git printed them
 */
export function changedPaths(porcelain) {
  const entries = porcelain.split("\0").filter(entry => entry !== "");
  const paths = [];
  for (let index = 0; index < entries.length; index++) {
    const status = entries[index].slice(0, 2);
    paths.push(entries[index].slice(3));
    if (/[RC]/.test(status)) {
      paths.push(entries[++index]);
    }
  }
  return paths;
}

// A baseline is `stories/__screenshots__/<variant>/<name>.png`; the variant is not part of the filter (`--project` is
// not), so only the name is read.
const BASELINE = new RegExp(`^${SCREENSHOTS_DIR}/[^/]+/([^/]+)\\.png$`);

/**
 * The baselines that changed although the file filter of the update did not name their story: the update redrew more
 * than it was asked for, or a baseline was changed before it. A baseline is named by story id, so which file it belongs
 * to cannot be told from its path; `storyFiles` says (`tokens/colors.stories.ts` holds `tokens-colours--default`).
 *
 * @param {object} run what the script knows
 * @param {readonly string[]} run.filters the file filters of the update (`vitestFilters`); none is an update of everything
 * @param {readonly string[]} run.changed the changed paths (`changedPaths`)
 * @param {Record<string, string[]>} run.storyFiles story file (repo-relative, posix) to the ids of its stories
 * @returns {string[]} the sorted changed baselines that lie outside the filter; what is not a baseline is ignored
 */
export function baselinesOutsideFilter({ filters, changed, storyFiles }) {
  if (filters.length === 0) {
    return [];
  }
  // As Vitest reads a filter: a substring of the path; a line number and a leading `./` are not part of it.
  const wanted = filters.map(filter => filter.replaceAll("\\", "/").replace(/^\.\//, "").replace(/:\d+$/, ""));
  const inside = new Set(Object.entries(storyFiles)
    .filter(([file]) => wanted.some(filter => file.includes(filter)))
    .flatMap(([, ids]) => ids.map(screenshotName)));
  return changed
    .filter((file) => {
      const name = BASELINE.exec(file)?.[1];
      return name !== undefined && !inside.has(name);
    })
    .toSorted();
}

/**
 * What the script prints on stderr when `baselinesOutsideFilter` is not empty.
 *
 * @param {readonly string[]} outside the baselines
 * @returns {string} the lines, joined by newlines
 */
export function outsideFilterMessage(outside) {
  return [
    "Baselines changed outside your file filter (the update redrew more than you asked for, or a baseline was changed before it):",
    ...outside,
    "Restore them with `git restore -- <paths>` before you commit.",
  ].join("\n");
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
  throw new Error(`${what} Use \`pnpm test:visual:image\`${asksForUpdate(argv)
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

// The pin is the image (ADR-0004), not the runtime that starts it: Podman on the human's machine, Docker in a cloud
// container. Which one, and the argv each gets, are decided here as data so a test can compare them without a container.
export const RUNTIMES = ["podman", "docker"];
export const CLOUD_ENV = "CLAUDE_CODE_REMOTE";
// Where a cloud container's proxy certificate was found when #307 ran the suite green; the fallback of `caBundlePath`.
export const CLOUD_CA_BUNDLE = "/root/.ccr/ca-bundle.crt";

/**
 * Whether the process runs in a cloud container (`docs/agents/cloud.md`), which sets `CLAUDE_CODE_REMOTE`.
 *
 * @param {Record<string, string | undefined>} env the process environment
 * @returns {boolean} true when the variable is a non-empty string
 */
export function isCloudContainer(env) {
  return typeof env[CLOUD_ENV] === "string" && env[CLOUD_ENV] !== "";
}

/**
 * Which runtime starts the pinned image, and the arguments left for the container script once the runtime flag is taken
 * out (Vitest must never see it). `--runtime=<name>` wins, the last one as the last `--update=<mode>` does; without it a
 * cloud container gets Docker and anything else Podman. No other variable picks a runtime.
 *
 * @param {{ env: Record<string, string | undefined>, args: readonly string[] }} run the process environment and the arguments after the script's name
 * @returns {{ runtime: "podman" | "docker", rest: string[] }} the runtime, and the arguments without the runtime flag, in order
 * @throws {Error} when `--runtime` has no valid value; a sentence naming the valid ones
 */
export function pickRuntime({ env, args }) {
  let named;
  const rest = [];
  for (const arg of args) {
    if (arg === "--runtime") {
      throw new Error("`--runtime` takes `podman` or `docker`, not a value.");
    }
    if (!arg.startsWith("--runtime=")) {
      rest.push(arg);
      continue;
    }
    named = arg.slice("--runtime=".length);
    if (!RUNTIMES.includes(named)) {
      throw new Error(`\`--runtime\` takes \`podman\` or \`docker\`, not \`${named}\`.`);
    }
  }
  const fallback = isCloudContainer(env)
    ? "docker"
    : "podman";
  return { runtime: named ?? fallback, rest };
}

/**
 * The host path of the proxy's CA bundle in a cloud container: the one the container names, else the one #307 ran green
 * with. The caller checks that it exists.
 *
 * @param {Record<string, string | undefined>} env the process environment
 * @returns {string} an absolute path
 */
export function caBundlePath(env) {
  const own = env.NODE_EXTRA_CA_CERTS;
  return typeof own === "string" && own !== ""
    ? own
    : CLOUD_CA_BUNDLE;
}

/**
 * The arguments after the runtime's own name that start the pinned image. Host network, the proxy and its CA bundle follow
 * the cloud container (its proxy listens on loopback, which Docker's bridge cannot reach); the tmpfs form follows the
 * runtime (`notmpcopyup` is a Podman option Docker rejects, and Docker's tmpfs copies nothing up).
 *
 * @param {object} run what the script knows
 * @param {"podman" | "docker"} run.runtime the runtime that starts the image
 * @param {boolean} run.cloud whether this is a cloud container
 * @param {string} run.root the checkout, mounted at /work
 * @param {string} run.checkout a short hash of the checkout's path, for its node_modules volume
 * @param {string} run.image the pinned image
 * @param {string} run.nodeVersion `.nvmrc`
 * @param {string} run.pnpmVersion the repo's pnpm
 * @param {boolean} run.update whether the run rewrites baselines, so goes without `CI=true`
 * @param {string} run.script the package script to run inside
 * @param {readonly string[]} run.forwarded the arguments for Vitest
 * @param {string} [run.caBundle] the host path of the CA bundle, when it exists; used only in a cloud container
 * @returns {string[]} the arguments, `run` first
 */
export function containerArgs({ runtime, cloud, root, checkout, image, nodeVersion, pnpmVersion, update, script, forwarded, caBundle }) {
  return [
    "run",
    "--rm",
    ...cloud
      ? ["--network", "host"]
      : [],
    "--ipc=host",
    "--init",
    "-v",
    `${root}:/work`,
    "-v",
    `winnies-visual-node-modules-${checkout}:/work/node_modules`,
    "-v",
    "winnies-visual-pnpm-store:/pnpm-store",
    // The Windows checkout carries a generated .nuxt (`nuxt prepare` runs on install there). CI has none, because the
    // job installs with --ignore-scripts, so the container must not see it either: an empty directory in its place.
    ...runtime === "podman"
      ? ["--mount", "type=tmpfs,destination=/work/.nuxt,notmpcopyup"]
      : ["--tmpfs", "/work/.nuxt"],
    "-w",
    "/work",
    "-e",
    `${CONTAINER_ENV}=${CONTAINER_VALUE}`,
    "-e",
    `NODE_VERSION=${nodeVersion}`,
    "-e",
    `PNPM_VERSION=${pnpmVersion}`,
    // CI=true is what makes a missing baseline a failure; without it Vitest writes the reference it did not find.
    ...update
      ? []
      : ["-e", "CI=true"],
    // The first two carry no value: the runtime reads them from the calling process.
    ...cloud
      ? [
          "-e",
          "HTTPS_PROXY",
          "-e",
          "HTTP_PROXY",
          "-e",
          "NO_PROXY=localhost,127.0.0.1",
        ]
      : [],
    ...cloud && caBundle
      ? [
          "-e",
          "NODE_EXTRA_CA_CERTS=/ca/ca-bundle.crt",
          "-v",
          `${caBundle}:/ca/ca-bundle.crt:ro`,
        ]
      : [],
    image,
    "sh",
    "scripts/visual-container.sh",
    script,
    ...forwarded,
  ];
}

/**
 * What the script prints when the runtime cannot be started at all (not when its daemon is down: it says that itself).
 *
 * @param {"podman" | "docker"} runtime the runtime that was looked for
 * @param {string} reason the spawn error's message
 * @returns {string} one line for the console
 */
export function missingRuntimeMessage(runtime, reason) {
  return runtime === "podman"
    ? `Could not run \`podman\` (${reason}). Install Podman and start its machine: README § Tests.`
    : `Could not run \`docker\` (${reason}). In a cloud container start the Docker daemon first (\`docs/agents/cloud.md\` § Getting ready, step 3); elsewhere install Docker. README § Tests.`;
}
