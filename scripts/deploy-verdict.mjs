// The decisions of scripts/deploy-wait.mjs, apart from the `gh api` calls it gathers its data with, as ci-verdict.mjs is apart
// from ci-wait.mjs: where a PR stands on its way to a merge, whether its base deploys, and where the deployment stands.
import { mergeState } from "./pr-state.mjs";

/** Check-run conclusions that let a PR merge. */
const PASSING = new Set(["success", "neutral", "skipped"]);
/** How long auto-merge may lag behind the last check before an agent merges itself (docs/agents/delivery.md § Branches and merges). */
export const MERGE_LAG_MS = 2 * 60_000;

// Both shapes are GitHub's REST API, not `gh pr view --json`: that command asks GraphQL, which a cloud session is
// refused (docs/agents/cloud.md), and REST answers on every machine.
/**
 * @typedef {object} Pr  a PR as `GET pulls/<n>` returns it
 * @property {string} state            open or closed; a merged PR is closed too
 * @property {boolean} merged          closed by a merge
 * @property {boolean} draft           a draft does not merge
 * @property {string} mergeable_state  clean, behind, dirty, blocked, unknown, …
 */
/**
 * @typedef {object} CheckRun  a CI job as `GET commits/<sha>/check-runs` returns it. Commit statuses such as Vercel's
 *   are not check runs, so they never count here.
 * @property {string} name                 the job's name, e.g. `e2e`
 * @property {string} status               queued, in_progress or completed
 * @property {string | null} conclusion    success, failure, cancelled, …; null until it completed
 * @property {string | null} completed_at  when it completed, as an ISO timestamp
 */

/**
 * Where a PR stands on its way to a merge.
 *
 * @param {Pr} pr   the PR
 * @param {CheckRun[]} runs  the check runs of its head commit
 * @param {number} now  the time to measure the lag against, in ms since the epoch
 * @returns {{ verdict: "merged" | "closed" | "draft" | "red" | "conflict" | "behind" | "merge-yourself" | "wait", checks?: string[] }}
 *   `checks` names the failed checks of a red PR
 */
export function prVerdict(pr, runs, now) {
  if (pr.merged)
    return { verdict: "merged" };
  if (pr.state === "closed")
    return { verdict: "closed" };
  if (pr.draft)
    return { verdict: "draft" };
  const failed = runs.filter(run => run.status === "completed" && !PASSING.has(run.conclusion));
  if (failed.length > 0) {
    return {
      verdict: "red",
      checks: [
        ...new Set(failed.map(run => run.name)),
      ],
    };
  }
  if (mergeState(pr) === "conflict")
    return { verdict: "conflict" };
  if (pr.mergeable_state === "behind")
    return { verdict: "behind" };
  const done = runs.length > 0 && runs.every(run => run.status === "completed");
  const last = Math.max(...runs.map(run => Date.parse(run.completed_at ?? "")).filter(Number.isFinite));
  if (done && pr.mergeable_state === "clean" && now - last >= MERGE_LAG_MS)
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
