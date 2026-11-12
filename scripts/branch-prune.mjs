// Deletes the remote branches on origin whose work is merged into `redesign` or `main`, and says why it keeps each of the
// others. Agents had `git push origin --delete` for this step, and the auto-mode classifier refused it three times
// (2026-11-10, 2026-11-12 twice); the human chose a script and one narrow allow rule for it in .claude/settings.json (#288).
//
//   node scripts/branch-prune.mjs [--dry-run]
//
// A branch goes when its tip is in the history of origin/redesign or origin/main and is not on their first-parent line
// (a `--no-ff` merge puts the branch's tip off that line). It stays, with the reason, when it is `main` or `redesign`,
// when an open PR has it as head or as base, when it is not merged (a squash-merged branch is never an ancestor), or when
// its tip is on the first-parent line: no commit of its own, so another session may have just cut it. `--dry-run` prints
// what it would do and changes nothing. One line per branch. The decision is scripts/branch-verdict.mjs; this file
// gathers the data and acts on it.
//
// Each delete is a lease against the sha judged here, so a push that lands in between makes git refuse instead of
// deleting it. Accepted residual risks: a branch cut from an already-merged branch tip, with no commit yet, looks merged
// and goes (its lease still guards a later push); a PR opened in the seconds between the PR read and a delete is not seen.
// Only `refs/heads/*` on origin is touched: no local branch, no worktree.
import { execFileSync, spawnSync } from "node:child_process";
import process from "node:process";
import { parseArgs } from "node:util";
import { decide } from "./branch-verdict.mjs";

const USAGE = "usage: node scripts/branch-prune.mjs [--dry-run]";

// Before any git call: a flag or an argument this script does not know must stop it, not be read as a real run.
let parsed;
try {
  parsed = parseArgs({
    args: process.argv.slice(2),
    allowPositionals: false,
    strict: true,
    options: {
      "dry-run": { type: "boolean", default: false },
    },
  });
}
catch (error) {
  // Node adds a hint about `--` to the first sentence.
  console.error(`${error.message.split(/\.\s|\n/)[0].replace(/\.$/, "")}.\n${USAGE}`);
  process.exit(2);
}
const dryRun = parsed.values["dry-run"];

function git(...args) {
  return execFileSync("git", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 64 * 1024 * 1024,
  }).trim();
}

/** The line of a failed call's stderr that says what went wrong: git prints a `To <url>` line before a refusal. */
function firstLine(error) {
  const lines = String(error.stderr ?? error.message).trim().split("\n").map(line => line.trim());
  return lines.find(line => /^(?:!|error:|fatal:)/.test(line)) ?? lines[0];
}

/** Whether `tip` is in the history of `ref`: exit 0 yes, exit 1 no, anything else is a failure and not a "no". */
function isAncestor(tip, ref) {
  const run = spawnSync("git", [
    "merge-base",
    "--is-ancestor",
    tip,
    ref,
  ], { encoding: "utf8" });
  if (run.status === 0)
    return true;
  if (run.status === 1)
    return false;
  throw new Error(`git merge-base --is-ancestor ${tip} ${ref} failed: ${String(run.stderr || run.error).trim()}`);
}

/** Every open PR, as `{ number, head, base }`. REST only: GraphQL is refused in cloud sessions (docs/agents/cloud.md). */
function openPulls() {
  const listing = execFileSync("gh", [
    "api",
    "repos/{owner}/{repo}/pulls?state=open&per_page=100",
    "--paginate",
    "--jq",
    ".[] | [.number, .head.ref, .base.ref] | @tsv",
  ], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 64 * 1024 * 1024,
  });
  return listing.split("\n").filter(Boolean).map((line) => {
    const [number, head, base] = line.split("\t");
    return {
      number: Number(number),
      head,
      base,
    };
  });
}

git("fetch", "--quiet", "--prune", "origin");

// A failed read stops here, before any delete: without it a branch with an open PR could not be told from one without.
let pulls;
try {
  pulls = openPulls();
}
catch (error) {
  console.log(`cannot read the open PRs: ${String(error.stderr || error.message).trim().split("\n")[0]}`);
  process.exit(1);
}

const prefix = "refs/remotes/origin/";
const branches = git("for-each-ref", prefix, "--format=%(refname) %(objectname)").split("\n").filter(Boolean).map((line) => {
  const [ref, tip] = line.split(" ");
  return {
    name: ref.slice(prefix.length),
    tip,
  };
}).filter(branch => branch.name !== "HEAD").sort((a, b) => (a.name < b.name
  ? -1
  : a.name > b.name
    ? 1
    : 0));

if (branches.length === 0)
  console.log("no remote branches");

// One call: the commits `redesign` and `main` reached along their first parent (a missing origin/main stops the script).
const firstParentLine = new Set(git("rev-list", "--first-parent", "origin/redesign", "origin/main").split("\n"));

let failed = false;
for (const { name, tip } of branches) {
  const verdict = decide({
    name,
    tip,
    mergedInto: ["redesign", "main"].filter(into => isAncestor(tip, `origin/${into}`)),
    onFirstParentLine: firstParentLine.has(tip),
    openPrs: pulls.filter(pull => pull.head === name).map(pull => pull.number),
    baseOfOpenPrs: pulls.filter(pull => pull.base === name).map(pull => pull.number),
  });
  if (verdict.action === "keep") {
    console.log(`kept ${name}: ${verdict.reason}`);
    continue;
  }
  if (dryRun) {
    console.log(`would delete ${name} (${verdict.reason})`);
    continue;
  }
  try {
    // An argument array, no shell: a name with a slash or a dot is one argument. The pre-push hook runs, as for any push.
    git("push", "origin", `--force-with-lease=refs/heads/${name}:${tip}`, "--delete", name);
    console.log(`deleted ${name} (${verdict.reason})`);
  }
  catch (error) {
    failed = true;
    console.log(`failed ${name}: ${firstLine(error)}`);
  }
}
process.exit(failed ? 1 : 0);
