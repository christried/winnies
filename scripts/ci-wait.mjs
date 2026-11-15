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
// Exit 2: not settled, so run it again: a run is still going after 2.5 minutes, or GitHub has not yet worked out whether
// the PR can merge (it does so on the first read after a push), or GitHub could not be read (below). For the head of an
// open PR the pull_request run of each workflow counts, not only its push run: the push runs can finish before GitHub has
// queued those.
// One call stays under the 3 minutes after which Claude Code moves a command to the background: that ends the agent's
// turn and wakes the orchestrator with an interim notice (three times in session 7 of 0.8, retro 0.8).
// `--until-done` is for a call that already runs in the background (the orchestrator's): it waits up to 20 minutes, so
// a 6-minute run ends in one notification instead of a failed one every 2.5 minutes (retro 0.10).
// A run that completed as a failure with zero jobs is a GitHub start failure (annotation „workflow file issue“, twice
// on 2026-11-09 with ci.yml unchanged), not a red run: the script re-runs it once with `gh run rerun` and keeps
// waiting; a second one exits 1 with the run's URL. A later call recognises the single re-run by the run's attempt
// number (retro 0.10, #388).
// A read that GitHub answers with a 5xx, an error page or a cut-off answer is read again after 2, 5 and 10 seconds, silently,
// so a blip does not end a twenty-minute wait (R2's retro, 14). A read the verdict needs (the runs, a run's jobs count, the
// PR) that four reads did not help ends in one line and exit 2: an unreadable GitHub is no verdict, and the callers read
// exit 1 as red. A read made after the verdict is printed never changes its exit code: the earlier attempts of a run
// that passed on a later attempt (exit 0 either way) and the failing log of a red run (exit 1 either way). A write (the
// re-run) is never read again, since a retried re-run could re-run twice.
// The first line says how long this call waits at most, so a caller whose own timeout is shorter (the `visual` job runs
// longer than ten minutes) sees that it would end the wait early. On a green, a run that passed on a second or later
// attempt is named after the `green:` line, with a pointer at the flake standard; a run this script re-ran after a start
// failure is named apart, since nothing flaked. Exit 0 either way: a flake is told, not failed.
// `gh` runs with its stderr piped: left to Node, a failed call copies the child's stderr, an error page included, to this
// terminal, whatever is then caught. Otherwise it prints one line while waiting, not a progress log.
// The wiring that decides the exit code is `waitForCi`, which takes its reads (`gh`, `pause`, `sleep`) as parameters, so a
// test passes a `gh` that answers from data and a pause that returns at once; the script below it is a thin caller.
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { FAILURE_MARKER } from "./attribution.mjs";
import { conclude, expectedWorkflows, giveUpLine, laterAttemptLines, latestRuns, missingWorkflows, parseJobCount, PASSING, redRuns, rerunDecision, retryDecision, waitLine, WORKFLOW_FILES } from "./ci-verdict.mjs";
import { flagError, ghErrorLine } from "./cli-helpers.mjs";
import { headPrOf } from "./pr-state.mjs";

const USAGE = "usage: node scripts/ci-wait.mjs [sha] [--until-done]";
const POLL_MS = 15_000;
const APPEAR_MS = 120_000;
const RERUN_SETTLE_MS = 30_000;

/** A read the verdict needs, made four times without an answer: its `message` is the one line the call ends in. */
class Unreadable extends Error {
  /**
   * @param {string} what  what was being read, e.g. `jobs count failed for <url>`
   * @param {unknown} cause  the last error of the read
   * @param {number} readsDone  reads made
   */
  constructor(what, cause, readsDone) {
    super(giveUpLine(what, cause, readsDone));
    this.what = what;
    this.reason = ghErrorLine(cause);
  }
}

const label = run => `${run.workflowName} (${run.event})`;

/**
 * Waits for the runs of `sha` and returns the exit code. Everything it reads goes through `gh`, `pause` and `sleep`, and
 * everything it says through `log`, so a test gives it data and reads back the lines and the code.
 *
 * @param {object} input
 * @param {string} input.sha  the full SHA: `gh run list --commit` matches nothing else
 * @param {string[]} input.expected  the workflows that must have a run
 * @param {number} input.callMs  how long this call waits at most
 * @param {(...args: string[]) => string} input.gh  runs `gh` and returns its stdout, throws when it fails
 * @param {(ms: number) => void} input.pause  synchronous, so that the decisions that read GitHub (decisionOf, done, printRed) stay synchronous
 * @param {(ms: number) => Promise<void>} input.sleep  the poll interval
 * @param {(line: string) => void} input.log  one printed line
 * @returns {Promise<0 | 1 | 2>}  the exit code
 */
export async function waitForCi({ sha, expected, callMs, gh, pause, sleep, log }) {
  const short = sha.slice(0, 7);

  /**
   * One read of GitHub, read again after a blip (retryDecision) and silently: a progress line per retry would be the log the
   * header says this script does not print. `read` does the parsing too, so a cut-off answer is a SyntaxError this loop sees.
   * Not for a write: a retried `gh run rerun` could re-run twice.
   */
  function readRetrying(what, read) {
    for (let readsDone = 1; ; readsDone++) {
      try {
        return read();
      }
      catch (error) {
        const next = retryDecision(error, readsDone);
        if (!next.retry)
          throw new Unreadable(what, error, readsDone);
        pause(next.afterMs);
      }
    }
  }
  const jobCountOf = run => readRetrying(`jobs count failed for ${run.url}`, () => parseJobCount(gh("api", `repos/{owner}/{repo}/actions/runs/${run.databaseId}/jobs`, "--jq", ".total_count")));
  // The workflow files by name, not "every workflow": a third workflow of the repository is none of this commit's gate.
  const runsOf = () => latestRuns(Object.values(WORKFLOW_FILES).flatMap(file => readRetrying(`reading the runs of ${short} failed`, () => JSON.parse(gh("run", "list", "--workflow", file, "--commit", sha, "--json", "databaseId,status,conclusion,event,url,attempt,workflowName")))));
  // The PR whose head this commit is, with its merge state: the list route does not carry `mergeable_state`, the single route does.
  function headPr() {
    const what = `reading the pull request of ${short} failed`;
    const found = readRetrying(what, () => headPrOf(JSON.parse(gh("api", `repos/{owner}/{repo}/commits/${sha}/pulls`)), sha));
    return found === null
      ? null
      : readRetrying(what, () => JSON.parse(gh("api", `repos/{owner}/{repo}/pulls/${found.number}`)));
  }

  /** The failing step's log from its first failure marker on, without the job/step/timestamp prefix and colour codes. */
  function failures(id) {
    const lines = readRetrying(`reading the failing log of run ${id} failed`, () => gh("run", "view", String(id), "--log-failed"))
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

  /**
   * What each run that did not pass is: red, or a start failure. The jobs counts are read here, before a line is printed,
   * so a count that cannot be read ends the call (exit 2) before any run is called red.
   */
  const redDecisions = () => redRuns(runs.filter(done)).map(run => ({
    run,
    decision: decisionOf(run),
  }));
  /**
   * Prints each run that is red, with its failing output: a conflicting PR has them too, and they would cost another call.
   * The red stands whatever the log read does, so an unreadable log is one more line, not another end.
   */
  function printRed(decisions) {
    for (const { run, decision } of decisions) {
      // Re-run once already (by this call or an earlier one): there is no job log to show.
      if (decision !== "red") {
        log(`start failure (zero jobs)${decision === "twice"
          ? " twice"
          : ""}: ${label(run)} ${run.url}`);
        continue;
      }
      log(`${run.conclusion}: ${run.workflowName} ${run.event} ${run.url}`);
      if (run.conclusion !== "failure")
        continue;
      try {
        log(failures(run.databaseId));
      }
      catch (error) {
        if (!(error instanceof Unreadable))
          throw error;
        log(`could not read the failing log of ${run.url}: ${error.reason}: read it with gh run view ${run.databaseId} --log-failed`);
      }
    }
  }

  async function settle() {
    while (Date.now() - started < callMs) {
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
        log(missing[0] === "CI"
          ? `No CI run appeared for this commit${event}. Is it pushed?`
          : `No ${missing[0]} run appeared for this commit${event}. Is it pushed, and does its ${WORKFLOW_FILES[missing[0]]} trigger on every push and on pull requests?`);
        return 1;
      }
      if (runs.length > 0 && runs.every(done)) {
        const fresh = runs.filter(run => decisionOf(run) === "rerun");
        if (fresh.length === 0 && verdictNow !== "waiting")
          break;
        for (const run of fresh) {
          log(`start failure (zero jobs): ${label(run)} ${run.url} – re-running once`);
          try {
            gh("run", "rerun", String(run.databaseId));
          }
          catch (error) {
            log(`re-run failed for ${run.url}: ${ghErrorLine(error)}`);
            return 1;
          }
          rerunAt.set(run.databaseId, Date.now());
        }
      }
      await sleep(POLL_MS);
    }

    // Again, as a re-run issued in the last poll counts as running now.
    const state = stateNow();
    if (state === "conflict") {
      log(`PR #${pr.number} conflicts with ${pr.base.ref}: merge ${pr.base.ref} into its branch and push. GitHub starts no pull_request run on a conflicting PR, so the push runs alone would look green.`);
      // The conflict is the verdict and is printed: a jobs count that cannot be read now only leaves the runs' own result out.
      try {
        printRed(redDecisions());
      }
      catch (error) {
        if (!(error instanceof Unreadable))
          throw error;
        log(`${error.what}: ${error.reason}: whether the runs of this commit are red is not known`);
      }
      return 1;
    }
    if (state === "waiting") {
      log(runs.length > 0 && missingNow().length === 0 && runs.every(done)
        ? `GitHub has not yet worked out whether PR #${pr.number} can merge: run this again.`
        : `${expected.join(" and ")} still running on ${short}: run this again.`);
      return 2;
    }
    if (state === "green") {
      log(`green: ${runs.map(label).join(", ")}; ${pr === null
        ? "no open PR for this commit, so merge state was not checked"
        : `PR #${pr.number} merges cleanly into ${pr.base.ref}`}`);
      // Read only now: a red or waiting end has no use for it, and a run that is not green has no second attempt to tell of.
      // The green is printed, so the read only enriches it (a flake is told, not failed): a run whose attempts cannot be
      // read gets one line of its own and the exit stays 0.
      const passedLater = [];
      const unread = [];
      for (const run of runs.filter(candidate => PASSING.has(candidate.conclusion) && (candidate.attempt ?? 1) > 1)) {
        try {
          passedLater.push({
            label: label(run),
            url: run.url,
            attempt: run.attempt,
            earlier: Array.from({ length: run.attempt - 1 }, (_, index) => readRetrying(`reading attempt ${index + 1} of ${run.url} failed`, () => JSON.parse(gh("api", `repos/{owner}/{repo}/actions/runs/${run.databaseId}/attempts/${index + 1}/jobs?per_page=100`, "--jq", "{total_count, jobs: [.jobs[] | {name, conclusion}]}")))),
          });
        }
        catch (error) {
          if (!(error instanceof Unreadable))
            throw error;
          unread.push(run);
        }
      }
      for (const line of laterAttemptLines(passedLater))
        log(line);
      for (const run of unread)
        log(`could not read the earlier attempts of ${run.url}: it passed on attempt ${run.attempt} and may be a flake, look at its attempts (docs/agents/delivery.md § A flake at a required check)`);
      return 0;
    }
    printRed(redDecisions());
    return 1;
  }

  try {
    return await settle();
  }
  catch (error) {
    if (!(error instanceof Unreadable))
      throw error;
    // Exit 2, not 1: GitHub could not be read, which is no verdict, and callers read exit 1 as red.
    log(error.message);
    return 2;
  }
}

async function main() {
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
    console.log(flagError(error, USAGE));
    process.exit(1);
  }
  if (parsed.positionals.length > 1) {
    console.log(`One commit at most, got ${parsed.positionals.length}.\n${USAGE}`);
    process.exit(1);
  }
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
  // The Attribution run exists only where the commit's own workflow file triggers on every push; a branch cut earlier, and
  // main until 1.0.0, has none to wait for.
  let attributionYml;
  try {
    attributionYml = execFileSync("git", ["show", `${sha}:.github/workflows/attribution.yml`], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
  }
  catch {
    attributionYml = null;
  }
  const expected = expectedWorkflows(attributionYml);
  const callMs = parsed.values["until-done"]
    ? 20 * 60_000
    : 150_000;
  console.log(waitLine(expected, sha.slice(0, 7), callMs));
  process.exit(await waitForCi({
    sha,
    expected,
    callMs,
    // stderr piped, as in deploy-wait.mjs: without it a failed call prints the child's stderr, a page included, here.
    gh: (...args) => execFileSync("gh", args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 64 * 1024 * 1024,
    }),
    pause: ms => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms),
    sleep: ms => new Promise(resolve => setTimeout(resolve, ms)),
    log: line => console.log(line),
  }));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  await main();
