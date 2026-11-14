// Runs the screenshot suite (`pnpm test:visual`) or, with --update, regenerates the baselines (`pnpm test:visual:update`)
// inside the pinned Playwright image (ADR-0004, spec #257 § 9), under Podman on the human's machine and under Docker in
// a cloud container (`--runtime=podman|docker` names one; scripts/visual-env.mjs decides the rest). Windows never produces
// a baseline: the repo is mounted, the Linux node_modules live in a named volume (never the Windows ones), and the
// baselines the run writes appear in the working tree. Everything after the flags goes to Vitest, e.g. `--project workspace-dark`.
//
// What runs inside is scripts/visual-container.sh, not a command line built here: the machine guard reads the command text
// of a Bash call, and an install of Node or pnpm belongs to the container, not the machine.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { caBundlePath, containerArgs, isCloudContainer, missingRuntimeMessage, pickRuntime, pinnedImage, visualRun } from "./visual-env.mjs";

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
process.exit(result.status ?? 1);
