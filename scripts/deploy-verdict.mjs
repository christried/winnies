// The decisions of scripts/deploy-wait.mjs, apart from the `gh api` calls it gathers its data with, as ci-verdict.mjs is apart
// from ci-wait.mjs: where a PR stands on its way to a merge, whether its base deploys, and where the deployment stands.
import { PASSING } from "./ci-verdict.mjs";
import { mergeState } from "./pr-state.mjs";

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
 * @typedef {object} CheckRun  a CI job as `GET commits/<sha>/check-runs?filter=all` returns it: every attempt, so a re-run
 *   is a second row with the same `name`. Commit statuses such as Vercel's are not check runs, so they never count here.
 * @property {number} id                   grows with each check run, so the highest `id` of a `name` is its newest attempt
 * @property {string} name                 the job's name, e.g. `e2e`
 * @property {string} status               queued, in_progress or completed
 * @property {string | null} conclusion    success, failure, cancelled, …; null until it completed
 * @property {string | null} completed_at  when it completed, as an ISO timestamp
 */

/**
 * The attempts that count: a re-run replaces the attempt before it. The push run and the `pull_request` run of one commit
 * both list a job of the same name, and they count as one check too, the newest `id` winning. Only the first 100 check
 * runs are read, as the script asks for one page, which is far more than this repository's checks.
 *
 * @param {CheckRun[]} runs  every attempt, as `filter=all` returns them
 * @returns {CheckRun[]} the runs that are no other run's earlier attempt, in their input order
 */
export function newestCheckRuns(runs) {
  return runs.filter(run => !runs.some(other => other.name === run.name && other.id > run.id));
}

/**
 * Where a PR stands on its way to a merge, by the newest attempt of each check.
 *
 * @param {Pr} pr   the PR
 * @param {CheckRun[]} runs  every attempt of the check runs of its head commit
 * @param {number} now  the time to measure the lag against, in ms since the epoch
 * @returns {{ verdict: "merged" | "closed" | "draft" | "red" | "conflict" | "behind" | "merge-yourself" | "wait", checks?: string[], why?: "rerunning" | "blocked" | "other" }}
 *   `checks` names the failed checks of a red PR, or the checks that run again for a `wait` that is `rerunning`. `why`
 *   says what a `wait` waits for: a check that runs again (its newest run is not completed and an earlier attempt exists),
 *   GitHub still reporting the PR `blocked` after every check passed, or anything else (a first run, a state GitHub
 *   has not computed, the two minutes of lag).
 */
export function prVerdict(pr, runs, now) {
  if (pr.merged)
    return { verdict: "merged" };
  if (pr.state === "closed")
    return { verdict: "closed" };
  if (pr.draft)
    return { verdict: "draft" };
  const newest = newestCheckRuns(runs);
  const failed = newest.filter(run => run.status === "completed" && !PASSING.has(run.conclusion));
  if (failed.length > 0) {
    return {
      verdict: "red",
      checks: [
        ...new Set(failed.map(run => run.name)),
      ],
    };
  }
  const state = mergeState(pr);
  if (state === "conflict")
    return { verdict: "conflict" };
  if (state === "behind")
    return { verdict: "behind" };
  const done = newest.length > 0 && newest.every(run => run.status === "completed");
  const last = Math.max(...newest.map(run => Date.parse(run.completed_at ?? "")).filter(Number.isFinite));
  // Only `clean` is mergeable: `blocked` is GitHub saying a rule stops the merge (a check with no run yet, a review).
  if (done && state === "clean" && now - last >= MERGE_LAG_MS)
    return { verdict: "merge-yourself" };
  const rerunning = newest.filter(run => run.status !== "completed" && runs.some(other => other.name === run.name && other.id < run.id));
  if (rerunning.length > 0) {
    return {
      verdict: "wait",
      why: "rerunning",
      checks: [
        ...new Set(rerunning.map(run => run.name)),
      ],
    };
  }
  if (!done)
    return { verdict: "wait", why: "other" };
  return {
    verdict: "wait",
    why: state === "blocked"
      ? "blocked"
      : "other",
  };
}

/**
 * The line of exit 2 for a PR that has not merged when the time is up.
 *
 * @param {number} number  the PR's number
 * @param {{ why?: "rerunning" | "blocked" | "other", checks?: string[] }} wait  the `wait` result of `prVerdict`
 * @returns {string} what is true of the PR, and to run the script again
 */
export function openLine(number, wait) {
  if (wait.why === "rerunning")
    return `#${number} has not merged yet: ${wait.checks.join(", ")} running again: run this again.`;
  if (wait.why === "blocked")
    return `#${number} has not merged yet: its checks passed, but GitHub still reports it blocked (a check with no run yet, or a review): run this again, and open the PR to see what blocks it.`;
  return `#${number} has not merged yet (its checks run, or auto-merge lags): run this again.`;
}

/** The verdicts that send the agent to act on a PR that can still move: a merge in the meantime or a re-run changes them. */
export const SECOND_READ = new Set(["behind", "merge-yourself"]);

/**
 * Reads a PR once, and a second time when the first says to act: the second read always stands, so a PR that merged in
 * between is `merged` and a re-run is `wait`. Any other verdict is final after one read.
 *
 * @template {{ verdict: string }} Read
 * @param {() => Read} readOnce  one read of the PR and its checks, already decided by `prVerdict`
 * @param {() => Promise<void>} pause  the wait between the two reads
 * @returns {Promise<Read>} the read that stands
 */
export async function settledVerdict(readOnce, pause) {
  const first = readOnce();
  if (!SECOND_READ.has(first.verdict))
    return first;
  await pause();
  return readOnce();
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

/**
 * What deploy-wait prints for a failed deployment: the deployment that failed, and the three things to do about it
 * (docs/agents/delivery.md § Issues says the same). The "ticket is not verified" clause is the one that file relies on.
 *
 * @param {object} input
 * @param {string} input.base  the branch the PR merged into
 * @param {string} input.sha  the full merge commit SHA
 * @param {string} [input.url]  the Vercel status's dashboard URL
 * @param {string} [input.deployment]  the deployment id at its end, as `deployVerdict` reads it
 * @returns {string} four lines
 */
export function failedDeploymentLine({ base, sha, url, deployment }) {
  const id = deployment ?? "<the deployment's id>";
  // The connector's `create_deployment` takes `dpl_<id>`, and the status URL ends in the bare id (#342).
  const deploymentId = id.startsWith("dpl_")
    ? id
    : `dpl_${id}`;
  return [
    `merged into ${base} at ${sha.slice(0, 7)}, but its deployment failed and the previous one keeps serving, so the ticket is not verified${url
      ? `: ${url}`
      : "."}`,
    `1. Read the build log: the Vercel connector's \`list_deployment_events\` with idOrUrl ${id} and builds 1.`,
    `2. Make a ticket for the failure, and leave a note on the spec of any other orchestrator who merges into ${base}: their merges fail to deploy until it is fixed.`,
    `3. If the log shows "Cannot find module" after "Already up to date", the build cache is stale (#342): redeploy the commit without it with the connector's \`create_deployment\`, forceNew "1" and requestBody {"name":"winnies","deploymentId":"${deploymentId}"}.`,
  ].join("\n");
}
