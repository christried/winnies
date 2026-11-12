// Waits for the CI and Attribution runs of one commit and says whether they passed (from compies, its retro 0.7; the
// retros and issue numbers below are that project's). CI and Attribution run on every pushed branch, so an
// implementer's head gets the full suite, the build and the commit check without loading this machine
// (docs/agents/implementer-frame.md).
//
//   node scripts/ci-wait.mjs [sha] [--until-done]    (default: HEAD, which must be pushed)
//
// Exit 0: every run of the commit passed, and when the commit is the head of an open PR, that PR does not conflict.
// Exit 1: a run failed or was cancelled (the failing step's output follows, cut to its failures), or a workflow has no
// run after two minutes, or the commit is the head of an open PR that conflicts with its base. GitHub starts no
// pull_request run on a conflicting PR, so the push runs alone would look green (#267): the conflict is reported at
// once, whatever the runs say, followed by the failing output of any run that is already red.
// Exit 2: a run is still going after 2.5 minutes, or GitHub has not yet worked out whether the PR can merge (it does so
// on the first read after a push), so run it again. For the head of an open PR the pull_request run of each workflow
// counts, not only its push run: the push runs can finish before GitHub has queued those.
// One call stays under the 3 minutes after which Claude Code moves a command to the background: that ends the agent's
// turn and wakes the orchestrator with an interim notice (three times in session 7 of 0.8, retro 0.8).
// `--until-done` is for a call that already runs in the background (the orchestrator's): it waits up to 20 minutes, so
// a 6-minute run ends in one notification instead of a failed one every 2.5 minutes (retro 0.10).
// A run that completed as a failure with zero jobs is a GitHub start failure (annotation „workflow file issue“, twice
// on 2026-11-09 with ci.yml unchanged), not a red run: the script re-runs it once with `gh run rerun` and keeps
// waiting; a second one exits 1 with the run's URL. A later call recognises the single re-run by the run's attempt
// number (retro 0.10, #388).
// It prints one line while waiting, not a progress log.
import { execFileSync } from "node:child_process";
import process from "node:process";
import { parseArgs } from "node:util";
import { FAILURE_MARKER } from "./attribution.mjs";
import { conclude, expectedWorkflows, latestRuns, missingWorkflows, PASSING, redRuns, rerunDecision, WORKFLOW_FILES } from "./ci-verdict.mjs";
import { headPrOf } from "./pr-state.mjs";

const USAGE = "usage: node scripts/ci-wait.mjs [sha] [--until-done]";

// Before any git or gh call: a mistyped --until-done read as the short wait would end a background wait early (#255).
let parsed;
try {
  parsed = parseArgs({
    args: process.argv.slice(2),
    allowPositionals: true,
    strict: true,
    options: {
      "until-done": { type: "boolean", default: false },
    },
  });
}
catch (error) {
  // Node adds a hint about `--` to the first sentence.
  console.log(`${error.message.split(/\.\s|\n/)[0].replace(/\.$/, "")}.\n${USAGE}`);
  process.exit(1);
}
if (parsed.positionals.length > 1) {
  console.log(`One commit at most, got ${parsed.positionals.length}.\n${USAGE}`);
  process.exit(1);
}
const untilDone = parsed.values["until-done"];
// `gh run list --commit` matches the full SHA only.
const sha = execFileSync("git", ["rev-parse", parsed.positionals[0] ?? "HEAD"], { encoding: "utf8" }).trim();
// Only if the SHA is in this repository can its attribution.yml be read; a guess would call a missing object "no trigger".
try {
  execFileSync("git", ["cat-file", "-e", `${sha}^{commit}`], { stdio: "ignore" });
}
catch {
  console.log(`${sha.slice(0, 7)} is not in this repository: run git fetch origin first.`);
  process.exit(1);
}
const POLL_MS = 15_000;
const APPEAR_MS = 120_000;
const RERUN_SETTLE_MS = 30_000;
const CALL_MS = untilDone
  ? 20 * 60_000
  : 150_000;

const gh = (...args) => execFileSync("gh", args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
// A failed gh call ends the script in one line naming the run (#388), not with a stack trace that hides the URL.
function fail(what, error) {
  console.log(`${what}: ${String(error.stderr || error.message).trim().split("\n")[0]}`);
  process.exit(1);
}
function jobCountOf(run) {
  try {
    return Number(gh("api", `repos/{owner}/{repo}/actions/runs/${run.databaseId}/jobs`, "--jq", ".total_count"));
  }
  catch (error) {
    return fail(`jobs count failed for ${run.url}`, error);
  }
}
// The Attribution run exists only where the commit's own workflow file triggers on every push; a branch cut earlier, and
// main until 1.0.0, has none to wait for.
function attributionYmlAt(commit) {
  try {
    return execFileSync("git", ["show", `${commit}:.github/workflows/attribution.yml`], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
  }
  catch {
    return null;
  }
}
const expected = expectedWorkflows(attributionYmlAt(sha));
// The workflow files by name, not "every workflow": a third workflow of the repository is none of this commit's gate.
const runsOf = () => latestRuns(Object.values(WORKFLOW_FILES).flatMap(file => JSON.parse(gh("run", "list", "--workflow", file, "--commit", sha, "--json", "databaseId,status,conclusion,event,url,attempt,workflowName"))));
// The PR whose head this commit is, with its merge state: the list route does not carry `mergeable_state`, the single route does.
function headPr() {
  try {
    const found = headPrOf(JSON.parse(gh("api", `repos/{owner}/{repo}/commits/${sha}/pulls`)), sha);
    return found === null
      ? null
      : JSON.parse(gh("api", `repos/{owner}/{repo}/pulls/${found.number}`));
  }
  catch (error) {
    return fail(`reading the pull request of ${sha.slice(0, 7)} failed`, error);
  }
}
const label = run => `${run.workflowName} (${run.event})`;

/** The failing step's log from its first failure marker on, without the job/step/timestamp prefix and colour codes. */
function failures(id) {
  const lines = gh("run", "view", String(id), "--log-failed")
    .split("\n")
    // The log writes colour codes either as escapes or as a literal caret „^[“.
    .map(line => line.replace(/^[^\t]*\t[^\t]*\t\S+ ?/, "").replace(new RegExp(`(?:${String.fromCharCode(27)}|\\^\\[)\\[[0-9;]*m`, "g"), ""));
  const start = lines.findIndex(line => /Failed Tests|Unhandled Error|error TS\d+|ERR_PNPM|✖ \d+ problems?|Unused (?:files|exports|dependencies)/.test(line) || line.includes(FAILURE_MARKER));
  return (start === -1
    ? lines.slice(-60)
    : lines.slice(start, start + 80)).join("\n");
}

const started = Date.now();
let runs = [];
let pr = null;
// Run id → the time of its re-run after a start failure. A re-run keeps the run id; for a moment the list may still
// show the old completed state, which does not count as done.
const rerunAt = new Map();
// The jobs are counted for a failed run only.
function decisionOf(run) {
  return rerunDecision(run, PASSING.has(run.conclusion)
    ? 1
    : jobCountOf(run), rerunAt.has(run.databaseId));
}
const done = run => run.status === "completed" && !(Date.now() - (rerunAt.get(run.databaseId) ?? -Infinity) < RERUN_SETTLE_MS);
// For the head of an open PR the pull_request run of each workflow is the one to wait for (ci-verdict.mjs).
const missingNow = () => missingWorkflows(runs, expected, { pullRequest: pr !== null });
function stateNow() {
  return conclude({
    runs: runs.map(run => done(run)
      ? run
      : { ...run, status: "in_progress" }),
    pr,
    expected,
  });
}
console.log(`waiting for ${expected.join(" and ")} on ${sha.slice(0, 7)} …`);
while (Date.now() - started < CALL_MS) {
  runs = runsOf();
  pr = headPr();
  const verdictNow = stateNow();
  if (verdictNow === "conflict")
    break;
  const missing = missingNow();
  if (missing.length > 0 && Date.now() - started > APPEAR_MS) {
    const event = pr === null
      ? ""
      : ` for PR #${pr.number}`;
    console.log(missing[0] === "CI"
      ? `No CI run appeared for this commit${event}. Is it pushed?`
      : `No ${missing[0]} run appeared for this commit${event}. Is it pushed, and does its ${WORKFLOW_FILES[missing[0]]} trigger on every push and on pull requests?`);
    process.exit(1);
  }
  if (runs.length > 0 && runs.every(done)) {
    const fresh = runs.filter(run => decisionOf(run) === "rerun");
    if (fresh.length === 0 && verdictNow !== "waiting")
      break;
    for (const run of fresh) {
      console.log(`start failure (zero jobs): ${label(run)} ${run.url} – re-running once`);
      try {
        gh("run", "rerun", String(run.databaseId));
      }
      catch (error) {
        fail(`re-run failed for ${run.url}`, error);
      }
      rerunAt.set(run.databaseId, Date.now());
    }
  }
  await sleep(POLL_MS);
}

// Again, as a re-run issued in the last poll counts as running now.
const state = stateNow();
/** Prints each run that is red, with its failing output: a conflicting PR has them too, and they would cost another call. */
function printRed() {
  for (const run of redRuns(runs.filter(done))) {
    // Re-run once already (by this call or an earlier one): there is no job log to show.
    if (decisionOf(run) !== "red") {
      console.log(`start failure (zero jobs)${decisionOf(run) === "twice"
        ? " twice"
        : ""}: ${label(run)} ${run.url}`);
      continue;
    }
    console.log(`${run.conclusion}: ${run.workflowName} ${run.event} ${run.url}`);
    if (run.conclusion === "failure")
      console.log(failures(run.databaseId));
  }
}
if (state === "conflict") {
  console.log(`PR #${pr.number} conflicts with ${pr.base.ref}: merge ${pr.base.ref} into its branch and push. GitHub starts no pull_request run on a conflicting PR, so the push runs alone would look green.`);
  printRed();
  process.exit(1);
}
if (state === "waiting") {
  console.log(runs.length > 0 && missingNow().length === 0 && runs.every(done)
    ? `GitHub has not yet worked out whether PR #${pr.number} can merge: run this again.`
    : `${expected.join(" and ")} still running on ${sha.slice(0, 7)}: run this again.`);
  process.exit(2);
}
if (state === "green") {
  console.log(`green: ${runs.map(label).join(", ")}; ${pr === null
    ? "no open PR for this commit, so merge state was not checked"
    : `PR #${pr.number} merges cleanly into ${pr.base.ref}`}`);
  process.exit(0);
}
printRed();
process.exit(1);
