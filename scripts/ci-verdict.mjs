import { ghErrorLine, isErrorPage } from "./cli-helpers.mjs";
import { mergeState } from "./pr-state.mjs";

/**
 * The conclusions that count as passed, for a workflow run here and for a check run in deploy-verdict.mjs: a skipped run
 * (a job whose condition was false) did not fail, and a neutral one is the check's own "no verdict".
 */
export const PASSING = new Set(["success", "neutral", "skipped"]);

/**
 * The workflows ci-wait waits for, by the `name:` GitHub lists a run under and the file that defines it: `gh run list`
 * finds a workflow's runs by file and says which workflow a run belongs to by name.
 */
export const WORKFLOW_FILES = { CI: "ci.yml", Attribution: "attribution.yml" };

/**
 * What a completed CI run means (from compies, its #388, like the other #388 below): a failed run GitHub never gave a job is a start failure, not a red run. A
 * cancelled run with zero jobs is red: someone cancelled it, and a re-run would undo that.
 */
export function verdict(run, jobCount) {
  if (PASSING.has(run.conclusion))
    return "green";
  return run.conclusion === "failure" && jobCount === 0
    ? "start-failure"
    : "red";
}

/**
 * What ci-wait does with a completed run (#388): 'green' and 'red' as the verdict says; a start failure is re-run once
 * ('rerun'), then reported as 'twice'. A run was re-run already when this call did it (`alreadyRerun`) or an earlier
 * call did, which GitHub shows as an attempt number above 1.
 */
export function rerunDecision(run, jobCount, alreadyRerun) {
  const result = verdict(run, jobCount);
  if (result !== "start-failure")
    return result;
  return alreadyRerun || (run.attempt ?? 1) > 1
    ? "twice"
    : "rerun";
}

/**
 * @typedef {object} WorkflowRun  a run as `gh run list --json databaseId,status,conclusion,event,url,attempt,workflowName` returns it
 * @property {number} databaseId  the run id, which grows with each run
 * @property {string} workflowName  the `name:` of the workflow file, e.g. `CI`
 * @property {string} event         push, pull_request, …
 * @property {string} url           the run's page on GitHub
 * @property {number} [attempt]     the run's latest attempt, 1 when absent
 * @property {string} status        queued, in_progress or completed
 * @property {string | null} conclusion  success, failure, cancelled, …; null until it completed
 */

/**
 * Keeps the newest run (highest id) per workflow and event. The Attribution workflow runs again when a PR's title or
 * body is edited, on the same head commit: an old red run, since fixed, must not keep the commit red for ever.
 *
 * @param {WorkflowRun[]} runs
 * @returns {WorkflowRun[]}  one run per workflow and event
 */
export function latestRuns(runs) {
  const newest = new Map();
  for (const run of runs) {
    const key = `${run.workflowName}\n${run.event}`;
    if (run.databaseId > (newest.get(key)?.databaseId ?? -Infinity))
      newest.set(key, run);
  }
  return [
    ...newest.values(),
  ];
}

/**
 * The completed runs that did not pass, the ones ci-wait prints the failure of.
 *
 * @param {WorkflowRun[]} runs
 * @returns {WorkflowRun[]}  the red ones
 */
export function redRuns(runs) {
  return runs.filter(run => run.status === "completed" && !PASSING.has(run.conclusion));
}

/**
 * The expected workflows that have no run yet. CI can finish before Attribution starts, so "every run listed so far is
 * done" is not "every run is done". For the head of an open PR the run that counts is the `pull_request` one: the push
 * runs can all be done before GitHub has queued those, and the PR's merge gate is the pull_request run.
 *
 * @param {WorkflowRun[]} runs
 * @param {string[]} expected  workflow names
 * @param {{ pullRequest?: boolean }} [options]  `pullRequest`: the commit is the head of an open PR
 * @returns {string[]}  workflow names
 */
export function missingWorkflows(runs, expected, { pullRequest = false } = {}) {
  return expected.filter(name => !runs.some(run => run.workflowName === name && (!pullRequest || run.event === "pull_request")));
}

/**
 * Whether a workflow file's `push` trigger is a list of plain branch names, the form `attribution.yml` had before it
 * ran on every branch (`branches: [main, redesign]`, inline or as a block list). Anything else, whatever its spelling,
 * is not recognised as limited: a push run is then expected, which at worst fails loudly after two minutes.
 *
 * @param {string} yml  the file, with LF or CRLF line ends
 * @returns {boolean}  true only for a recognised list of plain names
 */
function pushLimitedToNamedBranches(yml) {
  const lines = yml.replace(/\r\n?/g, "\n").split("\n").map(line => line.split(" #")[0]).filter(line => line.trim() !== "" && !line.trim().startsWith("#"));
  const indentOf = line => line.length - line.trimStart().length;
  const at = lines.findIndex(line => line.trim() === "push:");
  if (at === -1)
    return false;
  const block = [];
  for (const line of lines.slice(at + 1)) {
    if (indentOf(line) <= indentOf(lines[at]))
      break;
    block.push(line.trim());
  }
  if (!block[0]?.startsWith("branches:"))
    return false;
  const value = block[0].slice("branches:".length).trim();
  let items;
  if (value === "") {
    // A block list: every other line of the push block is one entry.
    if (block.slice(1).some(line => !line.startsWith("-")))
      return false;
    items = block.slice(1).map(line => line.slice(1));
  }
  else {
    if (block.length > 1 || !value.startsWith("[") || !value.endsWith("]"))
      return false;
    items = value.slice(1, -1).split(",");
  }
  return items.length > 0 && items.every(item => /^[\w./-]+$/.test(item.trim().replace(/^["']|["']$/g, "")));
}

/**
 * The workflows a push of a commit starts: CI always, and Attribution whenever its workflow file exists at that commit,
 * unless its `push` trigger is limited to named branches (the form before it ran on every branch). A branch cut before
 * that change has no push run of it to wait for. It fails closed: a reformatted trigger, a glob list, a flow mapping or a
 * CRLF copy still expects Attribution, so a red run of it can never end in green (#285 review).
 *
 * @param {string | null} attributionYml  `.github/workflows/attribution.yml` at the commit, null when it has none
 * @returns {string[]}  workflow names
 */
export function expectedWorkflows(attributionYml) {
  return attributionYml !== null && !pushLimitedToNamedBranches(attributionYml)
    ? Object.keys(WORKFLOW_FILES)
    : ["CI"];
}

/**
 * What ci-wait says about a commit.
 *
 * @param {object} input
 * @param {WorkflowRun[]} input.runs  the latest runs of the commit, as `latestRuns` returns them
 * @param {{ mergeable_state?: string } | null} input.pr  the open PR whose head the commit is, null when there is none
 * @param {string[]} input.expected  the workflows that must have a run
 * @returns {"conflict" | "waiting" | "red" | "green"}
 *   `conflict` beats everything, even pending or missing runs: GitHub starts no pull_request run on a conflicting PR, so
 *   the push runs alone would look green (#267). `waiting` covers a missing or unfinished run (for an open PR, a missing
 *   pull_request run) and a PR whose merge state GitHub has not computed yet.
 */
export function conclude({ runs, pr, expected }) {
  const state = pr === null
    ? "ok"
    : mergeState(pr);
  if (state === "conflict")
    return "conflict";
  if (missingWorkflows(runs, expected, { pullRequest: pr !== null }).length > 0 || runs.some(run => run.status !== "completed") || state === "unknown")
    return "waiting";
  return redRuns(runs).length > 0
    ? "red"
    : "green";
}

/**
 * The pauses before each further read of a read that failed: four reads at most. A blip of GitHub's lasts seconds, and a
 * twenty-minute wait must not end on one (R2's retro, 14); an outage that lasts 17 seconds is not a blip, so the script
 * gives up then and says so.
 */
export const READ_RETRY_MS = [2_000, 5_000, 10_000];

/**
 * Whether a read that failed is read again, and after how long. Only what a later read can change is retried: a 5xx, an
 * error page and an answer that is cut off (a `SyntaxError` from `JSON.parse`). A 404, a 403 (rate limit, forbidden), a
 * `gh` that is not signed in and a `gh` that is not installed answer the same every time.
 *
 * @param {{ stderr?: unknown, message?: string }} error  what a failed read threw: `execFileSync("gh", …)` or `JSON.parse`
 * @param {number} readsDone  reads made so far, 1 or more
 * @returns {{ retry: true, afterMs: number } | { retry: false }}  `afterMs`: the pause before the next read
 */
export function retryDecision(error, readsDone) {
  const text = String(error.stderr || error.message);
  const transient = error instanceof SyntaxError || /\bHTTP 5\d\d\b/.test(text) || isErrorPage(text);
  return transient && readsDone <= READ_RETRY_MS.length
    ? { retry: true, afterMs: READ_RETRY_MS[readsDone - 1] }
    : { retry: false };
}

/**
 * The single line a read that could not be made ends the script in. It says that the runs were not read, not that they
 * failed: the caller reads exit 1 as "red: fix, push", so without the last words a blip of GitHub's would send an
 * implementer to fix a green run.
 *
 * @param {string} what  what was being read, e.g. `reading the runs of 3e23713 failed`
 * @param {{ stderr?: unknown, message?: string }} error  the last error of the read
 * @param {number} readsDone  reads made, 1 or more
 * @returns {string}  one line, no markup
 */
export function giveUpLine(what, error, readsDone) {
  const reads = readsDone > 1
    ? ` after ${readsDone} reads`
    : "";
  return `${what}: ${ghErrorLine(error)}${reads} (not a red run: run this again)`;
}

/**
 * The job count `gh api …/jobs --jq .total_count` printed. Not `Number(text)`: `Number("")` is 0, so an empty or cut-off
 * answer would read as "no jobs", a start failure, and ci-wait would re-run a red run. A text that is no count is a
 * `SyntaxError`, which retryDecision reads again.
 *
 * @param {string} text  what `gh` printed
 * @returns {number}  the count
 */
export function parseJobCount(text) {
  if (!/^\d+$/.test(text.trim()))
    throw new SyntaxError(`not a job count: ${JSON.stringify(text.trim().slice(0, 40))}`);
  return Number(text.trim());
}

/**
 * The first line of a call, which says how long it waits at most. A caller that runs the script under a timeout of its own
 * (the `visual` job runs longer than ten minutes) can tell from it that the wait would have outlived the timeout.
 *
 * @param {string[]} expected  the workflows waited for
 * @param {string} short  the commit's short SHA
 * @param {number} callMs  how long one call waits at most
 * @returns {string}  one line
 */
export function waitLine(expected, short, callMs) {
  return `waiting up to ${callMs / 60_000} minutes for ${expected.join(" and ")} on ${short} …`;
}

/**
 * @typedef {object} AttemptJobs one earlier attempt of a run, `GET actions/runs/<id>/attempts/<n>/jobs` cut to what is read
 * @property {number} total_count  the attempt's jobs: 0 when GitHub never gave it one
 * @property {{ name: string, conclusion: string | null }[]} jobs  each job by name, with how it ended
 *
 * @typedef {object} PassedLater  a run that passed on a second or later attempt
 * @property {string} label    `CI (pull_request)`, as ci-wait labels a run
 * @property {string} url      the run's URL
 * @property {number} attempt  the attempt that passed, 2 or more
 * @property {AttemptJobs[]} earlier  attempts 1 to attempt - 1, in order
 */

/**
 * The lines ci-wait prints after a green that needed a second attempt. A green hid a flake: the run that failed and then
 * passed looked like any other (R2's retro, 4). The standard is `docs/agents/delivery.md` § A flake at a required check:
 * a ticket at once, with the link of the failed run, which is why the line carries the failed attempt's page.
 *
 * A run whose every earlier attempt had zero jobs is a re-run after a start failure (the test of rerunDecision): nothing
 * ran, so nothing flaked and no ticket is due. It is told apart, after the pointer, so it is never read as a flake.
 *
 * @param {PassedLater[]} runs  the runs that passed on attempt 2 or later
 * @returns {string[]}  later-attempt passes, the pointer once when there is one, then the start failures' re-runs; [] when no run is listed
 */
export function laterAttemptLines(runs) {
  const startFailures = runs.filter(run => run.earlier.every(attempt => attempt.total_count === 0));
  const flakes = runs.filter(run => !startFailures.includes(run));
  const flakeLines = flakes.map((run) => {
    const lastWithJobs = run.earlier.findLastIndex(attempt => attempt.total_count > 0) + 1;
    const failed = [
      ...new Set(run.earlier.flatMap(attempt => attempt.jobs).filter(job => job.conclusion !== null && !PASSING.has(job.conclusion)).map(job => job.name)),
    ];
    const after = failed.length > 0
      ? ` after ${failed.join(", ")} failed`
      : "";
    return `passed on attempt ${run.attempt}${after}: ${run.label} ${run.url}/attempts/${lastWithJobs}`;
  });
  return [
    ...flakeLines,
    ...flakes.length > 0
      ? ["A required check that passes on a re-run is a flake and gets a ticket at once: docs/agents/delivery.md § Branches and merges, A flake at a required check."]
      : [],
    ...startFailures.map(run => `re-run after a start failure (zero jobs), nothing flaked: ${run.label} ${run.url}`),
  ];
}
