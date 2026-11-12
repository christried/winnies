import { mergeState } from "./pr-state.mjs";

/**
 * What a completed CI run means (from compies, its #388, like the other #388 below): a failed run GitHub never gave a job is a start failure, not a red run. A
 * cancelled run with zero jobs is red: someone cancelled it, and a re-run would undo that.
 */
export function verdict(run, jobCount) {
  if (run.conclusion === "success")
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
 * The expected workflows that have no run yet. CI can finish before Attribution starts, so "every run listed so far is
 * done" is not "every run is done".
 *
 * @param {WorkflowRun[]} runs
 * @param {string[]} expected  workflow names
 * @returns {string[]}  workflow names
 */
export function missingWorkflows(runs, expected) {
  return expected.filter(name => !runs.some(run => run.workflowName === name));
}

/**
 * The workflows a push of a commit starts: CI always, and Attribution once its workflow file at that commit runs on a
 * push to every branch. A branch cut before that change, and `main` until 1.0.0, has no push run of it to wait for.
 *
 * @param {string | null} attributionYml  `.github/workflows/attribution.yml` at the commit, null when it has none
 * @returns {string[]}  workflow names
 */
export function expectedWorkflows(attributionYml) {
  const everyBranch = /^[ \t]*push:[ \t]*\n(?:[ \t]*(?:#.*)?\n)*[ \t]*branches:[ \t]*(?:\[[ \t]*["']\*\*["'][ \t]*\]|\n(?:[ \t]*#.*\n)*[ \t]*-[ \t]*["']\*\*["'])/m;
  return attributionYml !== null && everyBranch.test(attributionYml)
    ? ["CI", "Attribution"]
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
 *   the push runs alone would look green (#267). `waiting` covers a missing or unfinished run and a PR whose merge
 *   state GitHub has not computed yet.
 */
export function conclude({ runs, pr, expected }) {
  const state = pr === null
    ? "ok"
    : mergeState(pr);
  if (state === "conflict")
    return "conflict";
  if (missingWorkflows(runs, expected).length > 0 || runs.some(run => run.status !== "completed") || state === "unknown")
    return "waiting";
  return runs.some(run => run.conclusion !== "success")
    ? "red"
    : "green";
}
