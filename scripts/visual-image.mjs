// Runs the screenshot suite (`pnpm test:visual`) or, with --update, regenerates the baselines (`pnpm test:visual:update`)
// inside the pinned Playwright image (ADR-0004, spec #257 § 9), under Podman on the human's machine and under Docker in
// a cloud container (`--runtime=podman|docker` names one; scripts/visual-env.mjs decides the rest). Windows never produces
// a baseline: the repo is mounted, the Linux node_modules live in a named volume (never the Windows ones), and the
// baselines the run writes appear in the working tree. Everything after the flags goes to Vitest, e.g. `--project workspace-dark`.
// An update with a file filter then names every baseline that changed outside the filter and exits 1 (#367).
//
// What runs inside is scripts/visual-container.sh, not a command line built here: the machine guard reads the command text
// of a Bash call, and an install of Node or pnpm belongs to the container, not the machine.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { isCloudContainer } from "./environment.mjs";
import {
  baselinesOutsideFilter,
  caBundlePath,
  changedPaths,
  containerArgs,
  missingRuntimeMessage,
  outsideFilterMessage,
  pickRuntime,
  pinnedImage,
  SCREENSHOTS_DIR,
  visualRun,
  vitestFilters,
} from "./visual-env.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));

// One number for the pin: the image tag comes from the Playwright the repo installs, as in the `e2e` job.
const image = pinnedImage(pkg.devDependencies["@playwright/test"]);
const nodeVersion = readFileSync(path.join(root, ".nvmrc"), "utf8").trim();
const pnpmVersion = pkg.packageManager.replace(/^pnpm@/, "");

let picked;
try {
  picked = pickRuntime({
    env: process.env,
    args: process.argv.slice(2),
  });
}
catch (error) {
  console.error(error.message);
  process.exit(1);
}
const { runtime, rest } = picked;

// The same rule the guard in the container applies, so `-u` and `--update=<mode>` are an update here as there, and
// Vitest is handed exactly one update flag (visualRun).
const { update, script, forwarded } = visualRun(rest);

// A volume per checkout, so two worktrees installing at once do not fight over one node_modules; the pnpm store is shared.
const checkout = createHash("sha256").update(root).digest("hex").slice(0, 8);

// The proxy's certificate is a file on the cloud container's disk; only a bundle that is there can be mounted.
const cloud = isCloudContainer(process.env);
const bundle = caBundlePath(process.env);
const caBundle = cloud && existsSync(bundle)
  ? bundle
  : undefined;

const args = containerArgs({
  runtime,
  cloud,
  root,
  checkout,
  image,
  nodeVersion,
  pnpmVersion,
  update,
  script,
  forwarded,
  caBundle,
});

console.error(`Running the pinned image ${image} under ${runtime}.`);
const result = spawnSync(runtime, args, { stdio: "inherit", cwd: root });
if (result.error) {
  console.error(missingRuntimeMessage(runtime, result.error.message));
  process.exit(1);
}
const status = result.status ?? 1;

// An update with a file filter redraws only the stories of that filter (#367); whatever else changed in the baselines,
// the update redrew more than asked for or a baseline was changed before it, and it is named before it is committed.
// A check that cannot run is not a pass. The story reader is loaded only here, so a run without a filter loads nothing new.
const filters = update
  ? await vitestFilters(forwarded)
  : [];
if (filters.length > 0) {
  const git = spawnSync("git", [
    "status",
    "--porcelain=v1",
    "-z",
    "--untracked-files=all",
    "--",
    SCREENSHOTS_DIR,
  ], { cwd: root, encoding: "utf8" });
  if (git.error || git.status !== 0) {
    console.error(`Could not check which baselines changed (git status: ${git.error?.message ?? git.stderr.trim()}). Run \`git status ${SCREENSHOTS_DIR}\` before you commit.`);
    process.exit(1);
  }
  const { storyIdsByFile } = await import("./visual-stories.mjs");
  const { default: storybookConfig } = await import("../.storybook/main.ts");
  const outside = baselinesOutsideFilter({
    filters,
    changed: changedPaths(git.stdout),
    storyFiles: storyIdsByFile(storybookConfig.stories, root),
  });
  if (outside.length > 0) {
    console.error(outsideFilterMessage(outside));
    process.exit(status === 0
      ? 1
      : status);
  }
}
process.exit(status);
