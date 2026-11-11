// The decisions of scripts/deploy-wait.mjs, apart from the gh calls it gathers its data with, as ci-verdict.mjs is apart
// from ci-wait.mjs: where a PR stands on its way to a merge, whether its base deploys, and where the deployment stands.

/** Check-run conclusions that let a PR merge. */
const PASSING = new Set(["SUCCESS", "NEUTRAL", "SKIPPED"]);
/** How long auto-merge may lag behind the last check before an agent merges itself (docs/agents/delivery.md § Branches and merges). */
export const MERGE_LAG_MS = 2 * 60_000;

/**
 * @typedef {object} Pr  a PR as `gh pr view --json state,isDraft,mergeStateStatus,statusCheckRollup` prints it
 * @property {string} state             OPEN, MERGED or CLOSED
 * @property {boolean} isDraft          a draft does not merge
 * @property {string} mergeStateStatus  CLEAN, BEHIND, DIRTY, BLOCKED, UNKNOWN, …
 * @property {{ __typename: string, name?: string, status?: string, conclusion?: string, completedAt?: string }[]} statusCheckRollup
 *   the PR's checks; only the CheckRun entries (the CI jobs) count, not commit statuses such as Vercel's
 */

/**
 * Where a PR stands on its way to a merge.
 *
 * @param {Pr} pr   the PR
 * @param {number} now  the time to measure the lag against, in ms since the epoch
 * @returns {{ verdict: "merged" | "closed" | "draft" | "red" | "conflict" | "behind" | "merge-yourself" | "wait", checks?: string[] }}
 *   `checks` names the failed checks of a red PR
 */
export function prVerdict(pr, now) {
  if (pr.state === "MERGED")
    return { verdict: "merged" };
  if (pr.state === "CLOSED")
    return { verdict: "closed" };
  if (pr.isDraft)
    return { verdict: "draft" };
  const runs = (pr.statusCheckRollup ?? []).filter(check => check.__typename === "CheckRun");
  const failed = runs.filter(run => run.status === "COMPLETED" && !PASSING.has(run.conclusion));
  if (failed.length > 0) {
    return {
      verdict: "red",
      checks: [
        ...new Set(failed.map(run => run.name)),
      ],
    };
  }
  if (pr.mergeStateStatus === "DIRTY")
    return { verdict: "conflict" };
  if (pr.mergeStateStatus === "BEHIND")
    return { verdict: "behind" };
  const done = runs.length > 0 && runs.every(run => run.status === "COMPLETED");
  const last = Math.max(...runs.map(run => Date.parse(run.completedAt ?? "")).filter(Number.isFinite));
  if (done && pr.mergeStateStatus === "CLEAN" && now - last >= MERGE_LAG_MS)
    return { verdict: "merge-yourself" };
  return { verdict: "wait" };
}

/**
 * Whether Vercel builds a branch, from the project's vercel.json.
 *
 * @param {null | { git?: { deploymentEnabled?: boolean | Record<string, boolean> } }} config  vercel.json, or null when there is none
 * @param {string} branch  the branch a PR merged into
 * @returns {boolean} true when a push to the branch deploys. Vercel deploys every branch unless vercel.json says no; of
 *   the patterns, only a branch's own name and `**` are read, which is all this repository's vercel.json uses.
 */
export function deploysFrom(config, branch) {
  const enabled = config?.git?.deploymentEnabled;
  if (enabled === undefined)
    return true;
  if (typeof enabled === "boolean")
    return enabled;
  if (branch in enabled)
    return enabled[branch] === true;
  return enabled["**"] !== false;
}

/**
 * Where the deployment of a commit stands, from its combined commit status.
 *
 * @param {{ context: string, state: string, target_url?: string }[]} statuses  `.statuses` of `GET commits/<sha>/status`: the latest per context
 * @returns {{ verdict: "ready" | "failed" | "wait", url?: string, deployment?: string }}
 *   the Vercel status's dashboard URL, and the deployment id at its end, which the Vercel connector's
 *   `list_deployment_events` takes
 */
export function deployVerdict(statuses) {
  const vercel = statuses.find(status => status.context === "Vercel");
  if (!vercel || vercel.state === "pending")
    return { verdict: "wait" };
  const url = vercel.target_url;
  const deployment = url?.split("/").filter(Boolean).pop();
  return vercel.state === "success"
    ? { verdict: "ready", url, deployment }
    : { verdict: "failed", url, deployment };
}
