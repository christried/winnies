# Delivery workflow

What agents do on their own in Winnies, and what waits for the human. The path is ADR-0002: ticket branch → PR → `redesign`, and `redesign` → `main` once, as v1.0.0. Until `redesign` exists (the Safety net phase), the base of every PR is `main`.

The shape comes from the compies repository, where it grew out of ten retros; rules marked "(compies)" are carried over with their reason, and a Winnies `/retro` replaces them as this project learns its own.

## Branches and merges

- **Ticket branches**: push freely. Name them `<type>/<issue#>-<slug>`; the integration branch of a spec is `spec/<issue#>-<slug>`.
- **Into `redesign`**: open the PR, then set auto-merge yourself, without asking, and move on: `gh pr merge <n> --auto --merge --delete-branch`. GitHub merges once `check` and `attribution` are green.
  - Auto-merge needs the repo setting `allow_auto_merge`, which is off today (`gh api repos/christried/winnies --jq .allow_auto_merge`). The human turns it on with `gh repo edit --enable-auto-merge`; until then, wait for CI with `node scripts/ci-wait.mjs <sha> --until-done` in the background and merge on green.
  - Before you verify a merged ticket, confirm the merge happened: `gh pr view <n> --json mergedAt,state`.
- **Into `main`**: open the PR yourself; merging it is the human's. That covers the Safety net, every hotfix and the 1.0.0 release. Once CI is green, hand the human `! gh pr merge <n> --merge`. A hotfix is merged forward into `redesign` after it lands.
- **Branch protection and repo settings are the human's.** `main`, and `redesign` once it exists, require the checks `check` and `attribution`, admins included. The auto-mode classifier refuses an agent's call to change branch protection (tried 2026-11-10), so hand the human the command.
- **Subagents** hand their work back; the orchestrating session does every merge (`docs/agents/subagents.md`).
- A PR body is written with the `pr` skill and carries no attribution (CLAUDE.md § Attribution).

## Database migrations

Run drizzle-kit migrations on local and test databases yourself. A migration that reaches production does so through a merge into `main`, which is the human's; the PR that carries one says so in its first line. An agent never holds a production credential: one that reaches a transcript gets rotated.

## Issues

- **Comments are your job.** Record what later tickets will need: decisions, deviations, verification results. A decision the human makes in chat is posted on its issue before the work goes on.
- **Verify, then close.** Once a ticket's PR is merged, check it against the ticket's acceptance criteria and its Manual QA steps on the Vercel preview (ADR-0002), not only in CI. Post the result as a comment and close the issue yourself. `Closes #n` closes an issue only on a merge into `main`, so a ticket merged into `redesign` is closed by hand.
- A check that needs the human (Discord sign-in on a preview, how a motion feels) is named in the comment and left to them; the ticket stays open until they answer.
- **Signed-in pages on staging.** The staging environment is the Vercel deployment of `redesign`. The human allowed a dev-only sign-in there, so agents can check the Workspace as a signed-in Owner (2026-11-10; it amends #195, story 17, for builds that are not production, and production never carries it). It is not built yet: until its ticket lands, signed-in pages are checked locally through the Safety net's e2e harness (#200), and on a preview by the human.

## Review, walk-through, retro

Every phase of the roadmap (one spec, one milestone) ends with these steps, in this order. A step that finds work makes tickets, fixed before the next step.

1. **Review.** Once every ticket of the phase is on the integration branch, review its diff in three `sonnet` subagents at high effort: `code-review` Standards, `code-review` Spec against the phase's spec and tickets, and `thermo-nuclear-code-quality-review` with `improve-codebase-architecture`. Each writes its report to a file in the orchestrator's scratchpad and returns at most 300 words; a `haiku` agent merges the files into `docs/reviews/review_<phase>_YYYY-MM-DD.md`. The orchestrator reads the headlines and turns what must change into tickets. (compies, retro 0.9: three full reports in the orchestrator's context cost what a whole ticket does.)
2. **Verify.** Each ticket is verified and closed as § Issues says.
3. **Walk-through.** Open a `ready-for-human` issue "Walk-through <phase>" with a checklist built from the spec's acceptance criteria. It is a joint session: the agent presents one surface at a time on the preview, the human judges it, and each finding becomes a ticket. How things look and how motion feels are the human's call; agents measure numbers.
4. **Retro.** Ask the human to run `/retro` on the phase's sessions: what the review and the walk-through caught that a check, a standard or a brief should have caught earlier. A mechanical mistake becomes a lint rule, a test or a hook; a judgement call becomes a line in `CODING_STANDARDS.md` or `docs/agents/`, with the incident that caused it.

The next phase is specced only after the retro (`docs/roadmap.md`).

## Branch hygiene

GitHub holds `main`, `redesign` and branches in active development. Before ending a work session, run `git fetch --prune` and delete merged remote branches with `git push origin --delete <branch>`.

Agent worktrees go with `node scripts/worktree-clean.mjs [--unlocked] [<agent ids>]`, run in the background (a worktree with `node_modules` takes minutes). It removes a worktree that is named on the command line, or that is locked by a Claude process that no longer runs, the session of an agent that has ended. A worktree that is not locked and not named stays, listed with the reason; `--unlocked` removes those too, for the end of a phase. A worktree whose session still runs stays until it is named. Whatever the rule, it keeps a worktree with uncommitted changes, an unpushed commit or a process running in it, and says why. Name an implementer's agent only once its ticket is verified: cleaned earlier, a failed check needs a fresh implementer to rebuild the context (compies, 2026-11-09). `--dry-run` prints what it would do and changes nothing.
