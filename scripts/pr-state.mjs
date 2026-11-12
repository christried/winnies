// What a PR's state means to ci-wait.mjs and deploy-wait.mjs, in one place so the two agree on "in conflict". Both read
// GitHub's REST API, not `gh pr view --json`: that asks GraphQL, which a cloud session is refused (docs/agents/cloud.md).

/**
 * Whether a PR can merge, from the `mergeable_state` of `GET pulls/<n>`.
 *
 * @param {{ mergeable_state?: string }} pr  the PR as `GET pulls/<n>` returns it
 * @returns {"conflict" | "unknown" | "ok"} `unknown` while GitHub has not computed it, which it does on the first read
 *   after a push or a base change. Only `dirty` is a conflict: `behind`, `blocked`, `unstable`, `has_hooks`, `draft` and
 *   `clean` all `ok`, since a PR that is behind its base or waits on a check does not conflict with it.
 */
export function mergeState(pr) {
  const state = pr.mergeable_state;
  if (state === "dirty")
    return "conflict";
  if (state === undefined || state === "unknown")
    return "unknown";
  return "ok";
}

/**
 * The open PR a commit is the head of.
 *
 * @param {{ number: number, state: string, head: { sha: string }, base: { ref: string } }[]} prs  `GET commits/<sha>/pulls`,
 *   which also lists closed and merged PRs, and PRs the commit is only an older commit of
 * @param {string} sha  the full SHA
 * @returns the one open PR whose head is exactly `sha`, or null
 */
export function headPrOf(prs, sha) {
  return prs.find(pr => pr.state === "open" && pr.head.sha === sha) ?? null;
}
