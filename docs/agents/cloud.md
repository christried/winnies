# Cloud sessions

A session in a cloud container works to the same process as one on the human's machine: `delivery.md`, `subagents.md` and the rest apply unchanged (the human, 2026-11-12, #269). This file holds what differs there. You are in a cloud session when `CLAUDE_CODE_REMOTE` is set.

## Getting ready

The cloud environment `winnies` has a setup script, which the human approved. It makes Node 24 the default `node`, installs the dependencies, and writes `.env` and `.env.test` with the placeholder values of CI's `api-tests` job. It also sets `WINNIES_CHROMIUM` (§ The browser). A session on another environment has none of this: ask the human to start it on `winnies`.

Once per session, before the first commit:

1. Take the human's git identity, as the newest commit of `redesign` that is not a merge carries it. The container's own is an agent's, and the hooks refuse it (CLAUDE.md § Attribution).
   - `git log -1 --no-merges --format="%an <%ae>" origin/redesign` shows it; set both with `git config user.name` and `git config user.email`, in this repository only.
   - Done when `node scripts/attribution.mjs identity` exits 0.
2. Work on the branches `delivery.md` names. The container starts on a branch of its own (`claude/…`), which stays unused: the human lets a cloud session push ticket branches (2026-11-12, #269). It opens no PR and merges nothing (§ Delivery).

Before the first run of `pnpm test:api` or `pnpm test:e2e`, and again after the container restarted:

3. Start the Docker daemon, `dockerd` in the background, then `docker compose -f compose.test.yaml up -d`. It is the file `pnpm test:db:up` hands to Podman, which the container lacks. Done when `docker ps` shows `postgres` healthy and `neon-proxy` up.

## The browser

The container brings one Chromium, at `/opt/pw-browsers/chromium`, and `WINNIES_CHROMIUM` points `playwright.config.ts` and `scripts/shots.mjs` at it. `pnpm exec playwright install` is not run there.

It is an older build than the one `@playwright/test` pins. So `pnpm test:e2e` is a check before the push, and CI's `e2e` job stays the gate; a screenshot comparison counts only from the pinned image (ADR-0004).

## GitHub

GitHub's GraphQL API is refused: `gh pr …`, `gh issue …` and `gh repo …` end in HTTP 403. REST answers, so `gh api <route>`, `gh run …`, `scripts/ci-wait.mjs` and `scripts/deploy-wait.mjs` work. Where `issue-tracker.md` or `delivery.md` name a `gh` command, take:

| For                                           | In a cloud session                                                   |
| --------------------------------------------- | -------------------------------------------------------------------- |
| reading an issue, a PR, a list                | `gh api repos/{owner}/{repo}/…`, as `issue-tracker.md` § Conventions |
| `gh issue create`, `edit`, `close`            | the GitHub connector's `issue_write`                                 |
| `gh issue edit --add-label`, `--remove-label` | `issue_write` with the issue's whole list of `labels`                |
| a sub-issue                                   | `sub_issue_write`                                                    |
| a dependency, a label that does not exist     | `gh api --method POST` on the REST route                             |

## Delivery: push, then hand over

A cloud session opens no PR and posts no comment. The container's platform appends a footer that names the agent to every PR body written from it, through the connector and through `gh api` alike, and the `attribution` check refuses it; nothing in the repository can turn it off (#270: the footer came back after it was removed). Whether a comment gets one is not known, so none is posted.

So a ticket ends in the cloud like this:

1. Implement, check and review it as `delivery.md` and `subagents.md` say, and push the ticket branch. Done when `node scripts/ci-wait.mjs` is green on the pushed head, or the push ran no CI because no PR exists yet: then the four local checks (`pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:api`) and `pnpm test:e2e` are green on that head.
2. Commit `.handoff/<issue#>.md` as the branch's last commit. It holds, under one heading each: the PR's title; the PR's body, written with the `pr` skill; the comments to post on the issue (decisions, deviations); the local checks, each with the command or the steps to run (§ What stays local, and the ticket's Manual QA on staging while the secret is not saved).
3. Give the ticket the label `needs-local-check` and tell the human the branch.

A session on the human's machine takes it from there (`delivery.md` § Issues): it removes the file in a commit of its own, opens the PR with the file's title and body, posts the comments, merges as `delivery.md` says, does the local checks, and verifies and closes the ticket.

## Staging

`scripts/shots.mjs` reaches staging only when the human has saved the bypass secret on the `winnies` environment as a network secret: host `staging.winnies.christried.me`, header `x-vercel-protection-bypass`. The container's proxy then adds the header to every request to that host, the browser's included, and no agent sees the value. `VERCEL_AUTOMATION_BYPASS_SECRET` in the container's `.env` is a placeholder that only gets the helper past its own check; the rules for the real one (`delivery.md` § Issues) hold.

`net::ERR_TUNNEL_CONNECTION_FAILED` from the helper means the host is not allowed, so the secret is not saved. Vercel's login page means it is wrong or expired. Either way the staging check becomes a local check (§ What stays local), and the handoff file says which of the two it was.

The Vercel connector's tools are named `mcp__Vercel__…` here; `.claude/settings.json` denies the two share-link tools under both names.

## What stays local

A check a cloud session cannot do is handed on, never dropped or replaced by a guess (`delivery.md` § Issues, `needs-local-check`):

- a look at `pnpm dev`: the container's `DATABASE_URL` is a placeholder, so only the test server of the two suites runs there;
- staging, while the secret is not saved;
- anything in the human's own browser (`claude --chrome`), and whatever only the human does anyway.

## Two sessions at once

While a session on the human's machine implements a spec, a cloud session takes work outside that spec, and the other way round: two orchestrators never share an integration branch (the human, 2026-11-12). Before taking a ticket, read its assignee and the open PRs.

## Handoffs and retros

A scratchpad and a transcript stay on the machine that wrote them. So a handoff that crosses machines (`subagents.md` § Supervision) goes into `.handoff/<issue#>.md` on a pushed branch, briefs beside it in `.handoff/`, and the human is told the branch instead of a path. The friction worth a `/retro` goes into the same file: a `/retro` on the human's machine cannot read a cloud session. The session that takes the handoff removes the folder in a commit of its own.

## The container is not the human's machine

It is thrown away after the session, so starting `dockerd` there needs no question. What a later session should find installed belongs in the environment's setup script, which the human approves on a card; `scripts/machine-guard.mjs` still asks before an install.
