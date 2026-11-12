// Runs the screenshot suite (`pnpm test:visual`) or, with --update, regenerates the baselines (`pnpm test:visual:update`)
// inside the pinned Playwright image under Podman (ADR-0004, spec #257 § 9). Windows never produces a baseline: the
// repo is mounted, the Linux node_modules live in a named volume (never the Windows ones), and the baselines the run
// writes appear in the working tree. Everything after the flags goes to Vitest, e.g. `--project workspace-dark`.
//
// What runs inside is scripts/visual-container.sh, not a command line built here: the machine guard reads the command text
// of a Bash call, and an install of Node or pnpm belongs to the container, not the machine.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { CONTAINER_ENV, CONTAINER_VALUE, pinnedImage } from "./visual-env.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));

// One number for the pin: the image tag comes from the Playwright the repo installs, as in the `e2e` job.
const image = pinnedImage(pkg.devDependencies["@playwright/test"]);
const nodeVersion = readFileSync(path.join(root, ".nvmrc"), "utf8").trim();
const pnpmVersion = pkg.packageManager.replace(/^pnpm@/, "");

const update = process.argv.includes("--update");
const forwarded = process.argv.slice(2).filter(arg => arg !== "--update");

// A volume per checkout, so two worktrees installing at once do not fight over one node_modules; the pnpm store is shared.
const checkout = createHash("sha256").update(root).digest("hex").slice(0, 8);

const podmanArgs = [
  "run",
  "--rm",
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
  "--mount",
  "type=tmpfs,destination=/work/.nuxt,notmpcopyup",
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
  image,
  "sh",
  "scripts/visual-container.sh",
  update ? "test:visual:update" : "test:visual",
  ...forwarded,
];

const result = spawnSync("podman", podmanArgs, { stdio: "inherit", cwd: root });
if (result.error) {
  console.error(`Could not run podman (${result.error.message}). Install Podman and start its machine: README § Tests.`);
  process.exit(1);
}
process.exit(result.status ?? 1);
