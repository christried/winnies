# Cloud sessions

A session in a cloud container works to the same process as one on the human's machine: `delivery.md`, `subagents.md` and the rest apply unchanged (the human, 2026-11-12, #269). This file holds what differs there. You are in a cloud session when `CLAUDE_CODE_REMOTE` is set.

## Getting ready

The cloud environment `winnies` has a setup script, which the human approved. It makes Node 24 the default `node`, installs the dependencies, and writes `.env` and `.env.test` with the placeholder values of CI's `api-tests` job. It also sets `WINNIES_CHROMIUM` (§ The browser). A session on another environment has none of this: ask the human to start it on `winnies`.

Once per session, before the first commit:

1. Take the human's git identity, as the newest commit of `redesign` that is not a merge carries it. The container's own is an agent's, and the hooks refuse it (CLAUDE.md § Attribution).
   - `git log -1 --no-merges --format="%an <%ae>" origin/redesign` shows it; set both with `git config user.name` and `git config user.email`, in this repository only.
   - Done when `node scripts/attribution.mjs identity` exits 0.
2. Work on the branches `delivery.md` names. The container starts on a branch of its own (`claude/…`), which stays unused: the human gave cloud sessions the rights of `delivery.md` (2026-11-12, #269). Its limits hold too: a merge into `main` stays the human's.

Before the first run of `pnpm test:api` or `pnpm test:e2e`, and again after the container restarted:

3. Start the Docker daemon, `dockerd` in the background, then `docker compose -f compose.test.yaml up -d`. It is the file `pnpm test:db:up` hands to Podman, which the container lacks. Done when `docker ps` shows `postgres` healthy and `neon-proxy` up.

## The browser

The container brings one Chromium, at `/opt/pw-browsers/chromium`, and `WINNIES_CHROMIUM` points `playwright.config.ts` and `scripts/shots.mjs` at it. `pnpm exec playwright install` is not run there.

It is an older build than the one `@playwright/test` pins. So `pnpm test:e2e` is a check before the push, and CI's `e2e` job stays the gate; a screenshot comparison counts only from the pinned image (ADR-0004). The pinned image runs here under Docker, from one command: `pnpm test:visual:image` (README § Tests), which needs the daemon of § Getting ready, step 3, but not `docker compose`.

The motion stories' play functions run there too, as a check before the push: `WINNIES_VISUAL=container CI=true pnpm vitest run -c vitest.storybook.config.ts stories/motion` (add `--project <variant>` for one variant). The token stories' screenshot comparisons fail in that container, an older Chromium than the pinned one, so keep the `stories/motion` filter. For the screenshots themselves run `pnpm test:visual:image`. `--update` is never passed outside the pinned image, and CI's `visual` job stays the gate (ADR-0004).

## GitHub

GitHub's GraphQL API is refused: `gh pr …`, `gh issue …` and `gh repo …` end in HTTP 403. REST answers, so `gh api <route>`, `gh run …`, `scripts/ci-wait.mjs` and `scripts/deploy-wait.mjs` work. Where `issue-tracker.md` or `delivery.md` name a `gh` command, take:

| For                                           | In a cloud session                                                    |
| --------------------------------------------- | --------------------------------------------------------------------- |
| reading an issue, a PR, a list                | `gh api repos/{owner}/{repo}/…`, as `issue-tracker.md` § Conventions  |
| `gh issue create`, `edit`, `close`            | the GitHub connector's `issue_write`                                  |
| `gh issue edit --add-label`, `--remove-label` | `issue_write` with the issue's whole list of `labels`                 |
| `gh issue comment`                            | `add_issue_comment`                                                   |
| a sub-issue                                   | `sub_issue_write`                                                     |
| a dependency, a label that does not exist     | `gh api --method POST` on the REST route                              |
| `gh pr create`                                | `create_pull_request`                                                 |
| `gh pr merge <n> --auto --merge`              | `enable_pr_auto_merge` with `MERGE`                                   |
| `gh pr merge <n> --merge`                     | `merge_pull_request` with `merge`, no commit title or message (below) |
| `gh pr ready <n>`                             | `update_pull_request`                                                 |

Every write to GitHub from the container, through the connector or `gh api`, comes out with a footer that names the agent. Something on the way out adds it, after the attribution hook has looked at the call, and an edit through REST brings it back (#277). CLAUDE.md § Attribution allows it in a PR body, an issue, a comment and a review, so leave it; don't write one yourself.

It must not reach a commit. A merge commit takes the PR's title, not its body, whether auto-merge makes it or `merge_pull_request` does: tried on 2026-11-12 (#279), a merge through the connector without `commit_title` or `commit_message` came out clean. So leave both out. Auto-merge cannot be set on a PR whose checks are already green; the two-minute rule of `delivery.md` merges it then.

## Staging

`scripts/shots.mjs` reaches staging only when the human has saved the bypass secret on the `winnies` environment as a network secret: host `staging.winnies.christried.me`, header `x-vercel-protection-bypass`. The container's proxy then adds the header to every request to that host, the browser's included, and no agent sees the value. `VERCEL_AUTOMATION_BYPASS_SECRET` in the container's `.env` is a placeholder that only gets the helper past its own check; the rules for the real one (`delivery.md` § Issues) hold.

`net::ERR_TUNNEL_CONNECTION_FAILED` from the helper means the host is not allowed, so the secret is not saved. Vercel's login page means it is wrong or expired. Either way the staging check becomes a local check (§ What stays local), and the comment says which of the two it was.

The Vercel connector's tools are named `mcp__Vercel__…` here; `.claude/settings.json` denies the two share-link tools under both names.

## What stays local

A check a cloud session cannot do is handed on, never dropped or replaced by a guess (`delivery.md` § Issues, `needs-local-check`):

- a look at `pnpm dev`: the container's `DATABASE_URL` is a placeholder, so only the test server of the two suites runs there;
- staging, while the secret is not saved;
- anything in the human's own browser (`claude --chrome`), and whatever only the human does anyway;
- deleting a remote branch: the container's proxy refuses it, by `git push --delete` and by REST alike (#277). A cloud session doesn't run `branch-prune` (`delivery.md` § Branch hygiene) and leaves the branches to a local session.

## Handoffs and retros

A scratchpad and a transcript stay on the machine that wrote them. So a handoff that crosses machines (`subagents.md` § Supervision) is posted as a comment on the spec's or the ticket's issue, briefs included, and the human is told the issue's number instead of a path. The friction worth a `/retro` goes into the same comment: a `/retro` on the human's machine cannot read a cloud session.

## The container is not the human's machine

It is thrown away after the session, so starting `dockerd` there needs no question. Its disk is small: a ticket's Docker volume for the pinned image (`winnies-visual-node-modules-<hash of the checkout path>`, found with `docker volume ls`) is removed as soon as the ticket is merged into the integration branch, with `docker volume rm` (the human, 2026-11-13, #295: the disk stood at 98% with eleven such volumes, and a compare run died with `ENOSPC`). The shared `winnies-visual-pnpm-store` stays. What a later session should find installed belongs in the environment's setup script, which the human approves on a card; `scripts/machine-guard.mjs` still asks before an install.
