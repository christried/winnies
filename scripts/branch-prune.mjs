// Deletes the remote branches on origin whose work is merged into `redesign` or `main`, and says why it keeps each of the
// others. Agents had `git push origin --delete` for this step, and the auto-mode classifier refused it three times
// (2026-11-10, 2026-11-12 twice); the human chose a script and one narrow allow rule for it in .claude/settings.json (#288).
//
//   node scripts/branch-prune.mjs [--dry-run]
//
// A branch goes when its tip is in the history of origin/redesign or origin/main and is not on their first-parent line
// (a `--no-ff` merge puts the branch's tip off that line). It stays, with the reason, when it is `main` or `redesign`,
// when an open PR has it as head or as base, when it is not merged (a squash-merged branch is never an ancestor), or when
// its tip is on the first-parent line: it has no commit of its own (another session may have just cut it) or was merged
// without a merge commit (a fast-forward), and the two look alike. `--dry-run` prints
// what it would do and changes nothing. One line per branch. After them it lists, with the age of its last commit, each
// kept branch that is not merged, has no open PR and is not contained in an open PR's head, under a heading that says to
// ask about it (#370): nothing there is deleted. The decision is scripts/branch-verdict.mjs; this file gathers the data
// and acts on it.
//
// Each delete is a lease against the sha judged here, so a push that lands in between makes git refuse instead of
// deleting it. Accepted residual risks: a branch cut from an already-merged branch tip, with no commit yet, looks merged
// and goes (its lease still guards a later push); a PR opened in the seconds between the PR read and a delete is not seen.
// Only `refs/heads/*` on origin is touched: no local branch, no worktree.
import { execFileSync, spawnSync } from "node:child_process";
import process from "node:process";
import { asksAbout, decide, formatAge, openPrsHolding } from "./branch-verdict.mjs";
import { firstLine, git, parseFlags } from "./cli-helpers.mjs";

// Before any git call: a flag or an argument this script does not know must stop it, not be read as a real run.
const parsed = parseFlags({
  options: {
    "dry-run": { type: "boolean", default: false },
  },
  allowPositionals: false,
  usage: "usage: node scripts/branch-prune.mjs [--dry-run]",
});
const dryRun = parsed.values["dry-run"];

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
  console.log(`cannot read the open PRs: ${firstLine(error)}`);
  process.exit(1);
}

const prefix = "refs/remotes/origin/";
const branches = git("for-each-ref", prefix, "--format=%(refname) %(objectname) %(committerdate:unix)").split("\n").filter(Boolean).map((line) => {
  const [ref, tip, committedAt] = line.split(" ");
  return {
    name: ref.slice(prefix.length),
    tip,
    committedAt: Number(committedAt),
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

/** The numbers of the open PRs whose head branch on origin has `tip` in its history. */
function openPrsContaining(tip) {
  const containing = git("for-each-ref", prefix, "--contains", tip, "--format=%(refname)").split("\n").filter(Boolean).map(ref => ref.slice(prefix.length));
  return openPrsHolding(containing, pulls);
}

const toAskAbout = [];
let failed = false;
for (const { name, tip, committedAt } of branches) {
  const data = {
    name,
    tip,
    mergedInto: ["redesign", "main"].filter(into => isAncestor(tip, `origin/${into}`)),
    onFirstParentLine: firstParentLine.has(tip),
    openPrs: pulls.filter(pull => pull.head === name).map(pull => pull.number),
    baseOfOpenPrs: pulls.filter(pull => pull.base === name).map(pull => pull.number),
    containedInOpenPrs: openPrsContaining(tip),
  };
  const verdict = decide(data);
  if (verdict.action === "keep") {
    console.log(`kept ${name}: ${verdict.reason}`);
    if (asksAbout(data))
      toAskAbout.push({ name, committedAt });
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
// Nothing here is deleted: an unmerged branch is the human's to delete. The list is for the session that ends now to ask about.
if (toAskAbout.length > 0) {
  const now = Math.floor(Date.now() / 1000);
  console.log("");
  console.log("Not merged, no open PR, and in no open PR's branch: ask about each of these before anyone deletes it (nothing here is deleted):");
  for (const { name, committedAt } of toAskAbout)
    console.log(`  ${name} (last commit ${formatAge(committedAt, now)} ago)`);
}
process.exit(failed ? 1 : 0);
