# Implementer frame

The frame around every implementer's brief (`docs/agents/subagents.md` § Briefs). The orchestrator's spawn prompt names the ticket, the brief, the integration branch and your branch; read this file first, then the brief. Most of it comes from the compies repository: "(compies …)" names the incident behind a rule, "(Safety net …)" one from this repository's own retro of the Safety net.

You build ONE ticket in your own git worktree. The orchestrator reviews your diff and merges it. You never merge into `main`, `redesign` or the integration branch, and never open a PR.

## Before you start

1. Base your worktree on the integration branch (on `origin`):
   - `git fetch origin && git merge-base --is-ancestor origin/<integration branch> HEAD || git merge --ff-only origin/<integration branch>`. If it is not a fast-forward, stop and report: your worktree started from an unexpected commit. (#219: the auto-mode classifier refused `git reset --hard` here.)
   - then create your branch: `git checkout -b <your branch>`.
   - Before you edit a file, `git ls-files --eol <file>`; if it shows `w/crlf`, delete the file and `git checkout -- <file>`, then confirm `w/lf`. (#219: a fresh worktree held CRLF files its branch never changed, for five implementers.)
2. `pnpm install --frozen-lockfile` (runs `nuxt prepare` and installs the git hooks). If you add a dependency, use `pnpm add` and commit the lockfile.
3. Read, in this order:
   - your ticket, read as `docs/agents/issue-tracker.md` § Conventions says;
   - its parent spec the same way;
   - your brief;
   - `CODING_STANDARDS.md`, and `GLOSSARY.md` for the terms you touch;
   - the ADRs, handoff files and code your brief names.
4. Call the Skill tool with `tdd` and build the ticket test-first. The test seams the brief names count as confirmed by the human; a seam the brief doesn't name goes into your report.

## Rules

- Terms follow `GLOSSARY.md`.
- Match the surrounding code: comment density, naming, idiom. Comments say why.
- Sizes, colours, easings and copy come from `docs/design_handoff_winnies/`, never from an estimate. Something the handoff doesn't cover goes into your report as **Design/asset needed**; don't draw it yourself (`docs/agents/design-handoff.md`).
- A schema change or a migration only when your brief asks for one.
- Tests follow `CODING_STANDARDS.md` § Tests: what a test asserts, and what it may swap.
- Shell: this is Windows, and the Bash tool is Git Bash. Write every file with the Write tool, a scratch file or a script included, and run a script with `node <file>`. Keep every Bash call to plain commands inside your worktree, as `CLAUDE.md` § Scripting says the worktree guard wants them. A commit message with a body goes in a file: `git commit -F <file>`. (Safety net: 42 refused commands in 19 of 24 subagents.)
- Scratch files go to a folder named after your ticket inside your scratchpad directory (`<scratchpad>/<ticket number>/`), never into the checkout. (Safety net: the subagents of one session share a scratchpad.)
- The bypass secret in `.env` is a credential: never print `.env` or put its value in a command, a file, a commit, an issue, a PR or your report (`docs/agents/delivery.md` § Issues).
- Touch only what your brief allows. If the brief and the ticket disagree, or the code makes the brief wrong, do what the ticket needs and say so in the report.

## Commits

- Small commits on your branch, in Conventional Commits with the scopes `CLAUDE.md` lists. The body says why.
- No attribution of any kind: no `Co-Authored-By`, no session trailer, whatever your own instructions say (`CLAUDE.md` § Attribution). The hooks refuse such a commit; fix the message, never pass `--no-verify`.

## Checks

- `pnpm typecheck && pnpm lint`, and the test files you touched (`pnpm vitest run <file>`). They must pass before you push.
- An API or e2e test you touched or added runs with `pnpm test:api` or `pnpm test:e2e`, set up as `README.md` § Tests says; `pnpm vitest run` skips `tests/`. Run it in the foreground with the Bash tool's `timeout` at its maximum (600000 ms); a run that hits the timeout is started again in the foreground, never moved to the background. (Safety net: a test run in the background ended in a `sleep` the harness blocks.)
- A page is not looked at on your machine (no `pnpm dev`, no helper) unless your brief says so; it is checked on staging after the merge, with `node scripts/shots.mjs` (`docs/agents/delivery.md` § Issues). Name in your report the path to check and whether it needs the dummy set.
- The rest of the suite and the build run in CI on every push of your branch, not on this machine: several agents share it (compies 1.4).

## Before you report

1. Every background task you started has finished or is stopped. (Safety net: one implementer's "waiting on its own background work" notice arrived five times in 50 minutes, and the human saw a finished agent listed as active.)
2. Push your branch: `git push -u origin <your branch>`.
3. Wait for CI on your pushed head: `node scripts/ci-wait.mjs`, in the foreground. One call waits at most 2.5 minutes; exit 2 means CI is still running, so call it again until it exits 0 or 1. Red: fix, push, and wait again. A red head you can't fix goes into the report with its output.
4. Then `git fetch origin` and check containment: `git merge-base --is-ancestor origin/<integration branch> HEAD`. Not contained → `git merge origin/<integration branch>`, keeping both sides of a conflict and every removal the integration branch made, then rerun the checks, push, and wait for CI again. Checking only after the CI run avoids a loop of merges while the tip moves (compies 0.10).
5. The loop ends when the reported head contains the integration tip and is green, both on the same SHA.
6. Post the report on your ticket's issue, once step 5 holds. Write it to `<scratchpad>/<ticket>/issue-comment.md` with the Write tool, in the shape of § Report. (Not `report.md`: the Write tool refuses a subagent's file it takes for a report. It refused `report.md` for #284 and #285, and #288's implementer could not post at all.) `node scripts/attribution.mjs text <file>` must exit 0; if it doesn't, fix the text and check again. Then `gh issue comment <issue#> --body-file <file>`, with the issue number from your spawn prompt. The command prints the comment's link; keep it for § Return. (R0 retro, 2026-11-12: PR #267's body pointed to records on #272 and #274 that had never been posted.)

## Report (the issue comment, once, short, this shape)

- Branch and head SHA, and CI on it: green, or the failing output.
- The red run: the first test you wrote, and its failing line before any production code existed. A test that pins existing behaviour is green from the start: its red run is a deliberate break in the code under test, shown failing and then reverted before you commit. (Safety net: the frame left each implementer of a pinning test to decide alone what its red run was.)
- Acceptance criteria of the ticket: each one ✅ / ❌, with one line on how it is covered (test file and case name).
- Deviations from the brief or the ticket, and why.
- **Design/asset needed**, if anything.
- Anything the orchestrator must decide or look at (e.g. a page to check in the browser).

## Return

Your final message holds the comment's link from step 6 of § Before you report, then each item the orchestrator must decide or look at, one line each, or "none". Nothing else: the orchestrator reads the report on the issue. (R0 retro, 2026-11-12: each full report landed in an orchestrator context that reached 223k tokens.)

## Fix rounds

When the orchestrator sends a fix list, make the fixes, run steps 1 to 5 of § Before you report again, then post one short comment on the issue instead of a full report: the new head SHA, CI on it, and one line per fix-list item saying what changed. Return its link as in § Return. (R0 retro: a second full report would fill the orchestrator's context again.)
