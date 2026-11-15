# Review: Before R3 (2026-11-15)

- **Spec:** #359 (Before R3), with its two comments (the task graph, and the amendment of 2026-11-15).
- **Tickets:** #345, #358 and #360 to #373 (16 tickets, all on the branch).
- **Range and tip:** `redesign` to `spec/359-before-r3`, tip `52dd67a`, 75 files in the diff. No image was added.
- **Date:** 2026-11-15. All three reviews read the tip on this date.
- **Reviewers:** Standards (`code-review` skill, Standards axis), Spec (`code-review` skill, Spec axis, against #359 and its tickets), Quality (`thermo-nuclear-code-quality-review` with `improve-codebase-architecture`). All three were read-only: no build, no test run, no container, nothing changed.
- **CI:** at the tip, `check`, `api-tests`, `e2e` and `attribution` were green on the push and on the `pull_request` run; both `visual` runs were still in progress. Quality read the green run of `fa1f3bb` (run 43699810911) instead.

**Counts.** As the reviewers rated them:

- Standards: must change in this phase 0, later 2 (S4, S5), notes 6 (S1, S2, S3, S6, S7, S8).
- Spec: must change in this phase 0, later 2 (P1, P2), notes 5 (P3 to P7).
- Quality: must change in this phase 2 (Q1, Q2), later 5 (Q3 to Q7), notes 6 (Q8 to Q13).

That is 28 numbered findings. Numbering follows the reports. Placement, not severity, sets each finding's end in the last section: S1, S3 and S7 (rated notes) and P2 (rated later) are fixed in ticket #375, and Q4 (rated later) is split between #375 (part a) and a roadmap line (part b).

---

## Standards

Result: no hard breach of a documented standard, and nothing must change in this phase. Two later findings and six notes.

### S1 (note): `isCloudContainer` lives in the screenshot module, and that module's header is out of date

- Where: `scripts/visual-env.mjs` lines 1 to 5 (header) and 153 to 173 (`CLOUD_ENV`, `isCloudContainer`); imported by `scripts/local-checks.mjs:12`.
- Standard (baseline, judgement call): code-review skill, "Divergent Change" and "Mysterious Name". The header says "No IO here" and names only the pinned image.
- What is wrong: the module now also holds the runtime choice (Podman or Docker), the container's argv, the CA bundle, a `git status` parser and the update-filter check. The SessionStart hook for tickets imports its cloud test from it. `vitestFilters` loads `vitest/node` on call, so "No IO here" is no longer true.
- Proposed change: move the cloud test to a module that `local-checks.mjs` and `visual-image.mjs` both find neutral (`scripts/cli-helpers.mjs` is the nearest), and bring the header up to date. Optional: split the image-run decisions from the guard of `assertInContainer`. The ticket must also settle where the cloud test goes, because Q4 (a) proposes another home (see the open questions below).

### S2 (note): `local-checks.mjs` hard-codes the repository

- Where: `scripts/local-checks.mjs:60` (`"--repo", "christried/winnies"`).
- Standard: `docs/agents/issue-tracker.md` § Conventions says to infer the repository from `git remote -v`. The same file names the repository on its read-an-issue line, so it is not forbidden, but this script is the only one in `scripts/` that repeats it.
- Proposed change: drop `--repo` (the hook runs in the project directory), or keep it and say in the comment why (a worktree whose remote is not the repository).

### S3 (note): a standing rule moved from CLAUDE.md into a script header

- Where: `CLAUDE.md` § Attribution (the paragraph deleted in commit `77c46c1`); `scripts/attribution.mjs` header, line 14.
- Standard: `CLAUDE.md` § Agent skills, "Standing rules": record new standing rules in `CLAUDE.md`, `CODING_STANDARDS.md` or `docs/agents/`, never only in auto-memory.
- What is wrong: most of the removed paragraph was machinery, and that move is sound. One sentence is a rule: "A new place an agent could sign gets a new check there, with a test in `scripts/attribution.test.mjs`." It now stands only in the script's header, which an agent adding a new signing place may not open.
- Proposed change: keep that sentence in `CLAUDE.md` § Attribution. The `ENFORCED_AFTER` sentence is a fact about a constant and sits correctly in `scripts/commit-format.mjs`.

### S4 (later): a near-copy of `card` stays in `inline-edit.stories.ts`; other namesakes remain

- Where: `stories/ui/inline-edit.stories.ts:16-27` (the same box as `card` in `stories/support/ui-kit.ts`, plus `"data-card": story`); `stories/ui/progress-bar.stories.ts:79` (`card`, another layout, same name); `stories/ui/play-toggle.stories.ts:42` (`ringOf`, another body, same name as `ui-kit.ts`'s); `stories/ui/state-pill.stories.ts:42` (`iconOf`, the shared `iconOf` plus `!`).
- Standard: `CODING_STANDARDS.md` § Tests: a helper that a second story or test file needs moves to the shared module in the PR that needs it twice. `scripts/copied-helpers.test.mjs` catches identical parameters and body only, so a one-attribute difference passes.
- Proposed change: give `ui-kit.ts`'s `card` an optional attributes argument and use it in `inline-edit.stories.ts`; rename or fold the namesakes so `ringOf` and `iconOf` mean one thing in the stories. The three or four cases are R3's stories to touch anyway, so a roadmap line under R3 is enough.

### S5 (later): `gh` and `sleep` are defined in both waiting scripts

- Where: `scripts/ci-wait.mjs:84-91` and `scripts/deploy-wait.mjs:56-63`; `ci-wait.mjs:83` says "as in deploy-wait.mjs".
- Standard (baseline, judgement call): code-review skill, "Duplicated Code". The repository's own practice: the `scripts/cli-helpers.mjs` header, "In one place so the two cannot drift apart (#290 review)". This diff already moved `ghErrorLine` and `isErrorPage` there for the two scripts that wait on GitHub.
- Proposed change: move `gh` (stdout and stderr piped, 64 MB buffer) and `sleep` to `cli-helpers.mjs`, so the piped stderr that keeps an error page out of the terminal cannot drift. Update the first sentence of that file's header, which still says it serves the two scripts that delete things.

### S6 (note): two names for one command, and a leftover alias

- Where: `package.json` (`test:visual:podman`); `README.md`, Tests section ("kept so today's calls work"); `docs/agents/delivery.md` § Issues, "Stories are checked on staging" (`pnpm test:visual:podman`); `.github/workflows/ci.yml:202` (comment: `pnpm test:visual:podman --update`).
- Standard: `docs/agents/delivery.md` is the document the README points to for the check; `writing-for-agents` § Pruning: keep each meaning in a single source of truth. Baseline: Speculative Generality for the alias.
- Proposed change: the documented command is now `pnpm test:visual:image`. Delivery and the CI comment should say that, keeping "Podman" in the words of delivery's sentence about starting Podman's machine. The alias has no caller left that is not documentation: delete it with the next change to that line, or keep it with the one reason the README gives.

### S7 (note): `design-handoff.md` promises a pointer the recipe's comment does not carry

- Where: `docs/agents/design-handoff.md` § Where a departure from the handoff is recorded, second bullet; `app/utils/motion/engine.ts:808-810` (comment of `m.switchSlide`).
- Standard: that bullet says the record is a sentence among the exceptions of `CODING_STANDARDS.md` § Motion and "a comment at the recipe that points to it".
- What is wrong: the comment states the decision (the human, 2026-11-13, #316) but does not name `CODING_STANDARDS.md` § Motion.
- Proposed change: add "CODING_STANDARDS.md § Motion" to that comment, or loosen the sentence to "a comment at the recipe that says so".

### S8 (note): the step-file grammar is written out in three places

- Where: `docs/agents/delivery.md` § Issues, "Steps" bullet; `scripts/shots.mjs` header; `scripts/shots-guards.mjs` `STEP_FIELDS`.
- Standard: `writing-for-agents` § Pruning: a document that restates the environment is a cache; cache only what the agent cannot find by looking.
- What is wrong: nothing yet. The three agree today, checked field by field. The allow-list in `shots-guards.mjs` is the copy that cannot go stale.
- Proposed change (low priority): the delivery bullet keeps what the agent needs to choose the feature (what a step is for, that the file is data, that nothing is asserted) and points to the `shots.mjs` header for the fields. The bullet is long but accurate.

### Checked and clean (Standards)

- Commits: all 67 non-merge commits use a listed scope, one author and committer (the human's identity), and carry no trailer or agent link. Six baselines were deleted (the icon button's Focus, #358) with `UNSHOT_STORIES` and the DOM ring check in their place, as `delivery.md` § A flake at a required check asks.
- Guards and helpers sit in pure modules with their own tests (step-file allow-list, story id and URL, update filter, runtime and argv, retry and verdict functions).
- Credentials: a step file is parsed as data and refused on an unknown field; the story URL is built on the target's origin; every printed line passes `scrub`.
- Lint rules and their documents agree; a grep of `app/` finds only the two bare controls.
- Helper sharing follows `CODING_STANDARDS.md` § Tests bullet 4; the glossary holds (no new drift words, no "free", pricing or "beta" copy); ADR-0004 and the README say the same about Docker in a cloud container; the cross-references resolve; `CLAUDE.md` still holds the Scopes line that `commitlint.config.mjs` reads.

---

## Spec

Count: 0 must change in this phase, 2 later (P1, P2), 5 notes (P3 to P7). Placement moves P2 into #375 (see the last section).

### P1 (later): a second "is it a loop" test survives in support code

- Where: `stories/support/component-checks.ts:32`, `settled()`, reads `a.effect?.getComputedTiming().iterations !== Infinity`.
- What is wrong: the spec asks for one helper that says which loops are running, and ticket #361 asks for what a story needs to tell a loop from a one-shot. That helper is `isLoop` in `stories/support/motion-play.ts:150`. The lint rule covers only `stories/**/*.stories.ts`, so a read in support code passes by design, but here the support code repeats the predicate. It is correct today (it asks for the ending ones) and can drift the way #355 did.
- Proposed change: one line, `!isLoop(a)`. Suggested as a backlog line, or as a fix at R3's first story-support touch.

### P2 (later): the rule's wording misses the kind of line this phase has

- Where: `docs/agents/delivery.md` § Review, walk-through, retro, step 1, which tells the orchestrator to list every roadmap line that says it lands in this phase (`Lands in <phase>`).
- What is wrong: this phase's own lines are in the phase table's row ("R1's list is the retro comment on #294; #345 lands with it"), which carries no `Lands in Before R3` phrase, and § Engineering backlog has none. A reviewer who follows the sentence literally finds none. R3's lines do use "Lands in R3 Workspace", so R3 is covered.
- Proposed change: one clause, "in the phase's row of the table and in § Engineering backlog".

### P3 (note): "every story passes under the browser's preference" holds by construction for 30 of 32 files, and is run for 2

- Where: `.storybook/visual-variants.ts`, `browser-prefers-reduced`, runs `motion-press--default` and `ui-switch--toggling` only, as the spec decided ("the smallest set that covers both kinds"). All story files that take full motion go through `withMotion` (`stories/support/motion-play.ts`), and a static scan found no play function that asks for running animations outside a `withMotion` call in the files that use it.
- Not seen: the `skipped(...)` row in a real Interactions panel (the record says so; it imports `storybook/internal/instrumenter`), and Manual QA on staging with the system setting on. Needs the staging check after the merge; no ticket.
- Note from the report itself: its title says 30 of 32 files, and its body says all 33 story files that take full motion go through `withMotion`. The two counts are not reconciled in the report.

### P4 (note): Manual QA that only staging, a cloud container or the human's machine can run is still open

- Spec § Testing Decisions, seam 4, asks for B1 on staging from a cloud container. #364 and #365 were smoke-run against a local Storybook only; the `type` step and a signed-in page were never run (the record says no database). #366: the Docker path in a cloud container is "by data, not by run" (four points unproven). #367: Podman runs only; an update without a filter was not run. #368: Manual QA moved to PR #374, after it merges. #371: the hand run had no ticket labelled, so the printed list was seen only through the pure function. #370: dry-run output quoted.
- None of these changes a criterion's verdict from the code. Each should be ticked off on its issue after the deployment.

### P5 (note): #369 / spec B9, the frame

- The ticket says `delivery.md` and the implementer frame carry the rule that a wait for a whole run goes to the background and never under a caller's own timeout. `delivery.md` has both halves. `docs/agents/implementer-frame.md` step 3 carries only "do not wrap it in a `timeout` of your own and do not pass `--until-done`": it keeps the implementer's foreground 2.5-minute calls and says the wait is several calls.
- That is coherent (the background call is the orchestrator's) and probably what the brief chose. The record says "carry the rule" without naming the difference.

### P6 (note): accepted departures, not findings

- Ticket #358 ends as a deletion (the human, 2026-11-15; the spec's amendment). Section 7 of the brief is met: `UNSHOT_STORIES`, six baselines deleted and nothing else under `__screenshots__`, `expectRing` asserts solid, width, offset and colour, with no outline transition; README, `delivery.md` and the variants header updated.
- Ticket #364 adds `settlePhase`, because Storybook runs a render on to `finished` after a play function threw (recorded and tested).
- Ticket #361's gloss hold is `currentTime = 0` (accepted by the orchestrator).
- Ticket #370 leaves out a branch inside an open PR's head (the human, 2026-11-15).
- Ticket #366's ADR-0004 sentence stands (the human, 2026-11-15).
- Ticket #367 takes a third input, `storyFiles`, and shares the story reader.

### P7 (note): state at the time of review

- CI on `52dd67a`: `check`, `api-tests`, `e2e` and `attribution` green on the push and the `pull_request` run; both `visual` runs still in progress. PR #374 is a draft, `blocked`. The R2 row of the roadmap's phase table still says "Not started": PR 357 owns it.

### Spec clean areas

- All 16 tickets are on the branch and met. Ticket by ticket: #345 (`browser-prefers-reduced`, `withMotion` skips "full" under the preference); #358 (deletion, as amended); #360 (`"!test"` lint, `lint-planted.mjs`); #361 (`runningLoops`, `isLoop`, `isRunningLoop`, the lint selector); #362 (`copied-helpers.mjs`, six copies moved); #363 (bare-control lint, two named overrides); #364 (`--story`, `--dark`, `--full-motion`, `--dialect`); #365 (`--steps`, JSON allow-list); #366 (`pickRuntime`, `visual-image.mjs`, alias kept); #367 (`--update=all`, `baselinesOutsideFilter`); #368 (`deploy-wait` verdicts); #369 (`ci-wait` retry, `giveUpLine`, `parseJobCount`); #370 (`branch-prune` list); #371 (`local-checks.mjs`, SessionStart entry); #372 (review step 1, subagent handoff); #373 (documents, every R2 and R1 line placed).
- Scope: no change under `app/`, `server/`, `shared/`, `tests/` or `pnpm-lock.yaml`; no migration; no UI; no Safety net test touched.
- Dependencies: `oxc-parser` was already a dependency.
- Backlog: one line was made true and updated ("Two bare controls", by #363).

---

## Quality

Count: 2 must change in this phase (Q1, Q2), 5 later (Q3 to Q7), 6 notes (Q8 to Q13). Placement moves Q1 and Q2 into #375 and splits Q4 (see the last section).

### Q1. `ci-wait` gives up with exit 1, the code every caller reads as red, and says so only in prose

- Where: `scripts/ci-wait.mjs:104-117` (`readRetrying`), `scripts/ci-verdict.mjs` (`giveUpLine`), `docs/agents/implementer-frame.md` step 3.
- What is wrong: a read that GitHub did not answer after four reads is not a verdict, and the script already has exit 2 for "not settled, call again" (implementer-frame step 3). `readRetrying` calls `process.exit(1)` instead and relies on the last words of one line, "(not a red run: run this again)". The header of `giveUpLine` states the reason itself: the caller reads exit 1 as "red: fix, push". The frame carries a second rule on top of the exit code. An orchestrator or implementer that branches on the exit code alone (the background wait is read only when it ends) is sent to "fix, push" a green run.
- The text "(not a red run)" is also printed where it is false or misleading: `jobCountOf` (line 119, for a run already completed and not passing), `failures()` (line 148, after the red line of the same run), and the attempt reads (Q2).
- Proposed change: exit 2 from `readRetrying`, keeping the one-line text. "Exit 2: call again" then covers still-running, not-yet-computed and unreadable, and the frame loses its extra rule (the "three in a row, report it" count stays, as a sentence about exit 2). Add a test in Q3's style (a fake `gh`), so the exit code is under test: `ci-wait.test.mjs` has one test today (an unknown flag), and `giveUpLine` and `retryDecision` are tested only as pure functions, never the wiring that exits.

### Q2. A best-effort read after the `green:` line can turn the verdict into exit 1

- Where: `scripts/ci-wait.mjs:245-261`.
- What is wrong: the green path prints `green: ...` and then reads the earlier attempts of each run that passed on attempt 2 or later. That read is enrichment (naming a flake). If it fails four times, `readRetrying` prints a give-up line and exits 1, so the caller holds the line `green: CI (pull_request), ...` and exit code 1, which Q1's rule reads as red. A flake that is named is better than a green that is failed for the naming, and the flake is the case where GitHub's API is most likely to be under load (a re-run just happened).
- Proposed change: make this read non-fatal at the call site (an option of `readRetrying`, or a `tryRead` that returns `null`). Print one line, "could not read the earlier attempts of <url>: a run that passed on attempt N may be a flake, look at its attempts by hand (delivery.md § A flake at a required check)", and exit 0. Or read the attempts before printing `green:`, so a failure there is Q1's exit 2.

### Q3 (later): `deploy-wait` still ends a wait on one blip; two scripts do the same job with two failure policies

- Where: `scripts/deploy-wait.mjs` (`read`, from line 70: `done(1, "... failed: <ghErrorLine>")`); `scripts/ci-wait.mjs` (`readRetrying`).
- What is wrong: `ci-wait` reads again after a 5xx, an error page and a cut-off answer. `deploy-wait` turns the same 502 into `reading #N failed: GitHub answered with an error page (HTTP 502)`, exit 1, which its own header defines as "a check failed, ... or the deployment failed". It runs after every merge, up to 25 minutes in the background. The two scripts now share `ghErrorLine` and `isErrorPage` (one definition of an error page) but not the retry. `readRetrying` is not exported, so it cannot be reused or tested.
- Proposed change: move the loop into one module next to `cli-helpers.mjs` (`gh-read.mjs`: `ghRead(what, args, { pause })`, deciding with `retryDecision`, throwing one typed `GhUnreadable` that each script maps to its own exit code). Use it in both, and test it there with an injected `gh` and `pause`. Then Q1's wiring is under test in one place instead of two.

### Q4 (later, split): `visual-env.mjs` is no longer an env module, and the SessionStart hook now loads it

- Where: `scripts/visual-env.mjs` (305 lines, 15 exports, about 60 lines before), `scripts/local-checks.mjs:14`, `scripts/visual-env.mjs:7` (imports `../.storybook/visual-variants.ts`), `scripts/visual-image.mjs`, `vitest.storybook.config.ts`.
- What is wrong: the module holds four concerns under one name: the guard the Vitest config calls (`assertInContainer`, `asksForUpdate`); the choice of runtime and the `containerArgs` argv builder; the flag normaliser (`visualRun`), the git-porcelain parser (`changedPaths`), the update's outside-the-filter check (`baselinesOutsideFilter`, `outsideFilterMessage`, `vitestFilters`, which does a dynamic import) and two message builders. The deletion test says the complexity would not concentrate: it was four modules. The header's description is now the first of four.
- The sharpest cost: the SessionStart hook imports `isCloudContainer` from it, so every session start loads a module that imports a `.ts` file through Node's type stripping. The hook header promises it "never fails or delays a session's start" and "cannot throw", but a failed import happens at module load, before the `try`. CI catches it on the CI Node (the test asserts `stderr: ""`), not on a human's machine whose PATH has another Node. Cheap to avoid.
- Proposed change: (a) put `isCloudContainer` and `CLOUD_ENV` in a leaf (`scripts/environment.mjs`, importing nothing); `local-checks`, `pickRuntime` and `visual-image` import from there. (b) Split the rest by concern: `visual-guard.mjs` (what the config imports), `visual-image-args.mjs` (runtime, argv, messages), `visual-update-filter.mjs` (porcelain, outside-filter, `vitestFilters`). The tests group by function, so the split is mechanical; `visual-env.test.mjs` (772 lines) splits with it.
- Ends: part (a) in #375; part (b) a roadmap line.

### Q5 (later): `shots-guards.mjs` guards nothing about half of what it holds; its test is 1432 lines

- Where: `scripts/shots-guards.mjs` (599 lines, about 80 before), `scripts/shots-guards.test.mjs` (1432 lines, was 138), `scripts/shots.mjs` (697 lines).
- What is wrong: the header describes the bypass secret and the guards for origin, path and printed lines. From line 228 on it is the step-file schema (`readSteps`, `readStep`, `readTargetFields`), and from line 478 the printers for what a page showed (`describeFocus`, `describeAnimations`, `describeElement`). Those are two further modules under the name of a third. The test file crosses 1k lines by a wide margin in one PR, which the skill treats as a presumptive blocker unless decomposed first.
- Inside it, `readStep` (lines 355-443) is one 90-line function that branches on `kind` in three places, with inline magic numbers (`30`, `40`) next to named constants. A table with one row per kind (its fields, what is required, its extra check), which `STEP_FIELDS` already half is, would drop the if-chain. `describeLook` (line 171) and `shotFileName` (line 200) each carry their own idea of "the default look".
- Proposed change: `shots-guards.mjs` keeps the origin, path, scrub and look guards (about 130 lines); `shots-steps.mjs` (schema, `readSteps`, `describeStep*`); `shots-readouts.mjs` (`describeFocus`, `describeAnimations`). The test file splits the same way. In `shots.mjs`, `act`, `readFocus`, `readAnimations` and `runSteps` (about 200 lines, the part that drives a page) move to `shots-run.mjs`, and `main` keeps the argument and target work.

### Q6 (later): helpers copied between scripts, under the same name with a different meaning

- Where: `scripts/shots.mjs:76-82` (`oneLine`), `:375` (`firstLine`), `:107-110` (parseArgs error); `scripts/local-checks.mjs:20` (`oneLine`); `scripts/ci-wait.mjs:44-67`; `scripts/cli-helpers.mjs` (`firstLine`, `flagError`, `parseFlags`).
- What is wrong: `shots.mjs` `readArgs` builds its error message by hand, which is `flagError(error, USAGE)` character for character (the helper whose doc says it exists so the two cannot drift apart). `shots.mjs` `firstLine` is a different function from `cli-helpers.firstLine` (the first line, cut at 200 characters, against the line that starts with `!`, `error:` or `fatal:`): one name in two modules of one folder, with two contracts. `oneLine(text, limit)` exists in `shots.mjs` and, cut at 100 with no ellipsis variant, in `local-checks.mjs`; `ghErrorLine` has a third inline form. `ci-wait.mjs` keeps its own `parseArgs` try/catch although `parseFlags` exists; the exit code differs on purpose (1 here, 2 there), so `parseFlags` should take it as a parameter instead of being copied. The repository's `copied-helpers` check scans `stories/` and `tests/` only, so `scripts/` is not covered by the rule this phase added.
- Proposed change: use `flagError` in `shots.mjs`; rename the local `firstLine` (`firstLineOf` or `shortReason`); one `oneLine(text, limit)` in `cli-helpers.mjs`; add `scripts` to the scan in `copied-helpers.test.mjs` (SCANNED), after the two clones above are gone.

### Q7 (later): the story lint block restates antfu's `no-restricted-syntax` list, and only half the restatement is tested

- Where: `eslint.config.mjs:131-157` (block `stories`), `scripts/eslint-rules.test.mjs`.
- What is wrong: the comment says why: the options of a later block replace the list, so antfu's two selectors are copied into the stories block. If antfu adds or changes a selector, stories silently lose it, and nothing compares the copy with the original. The test "keeps antfu's restrictions" plants only `const enum`, not `TSExportAssignment`. The "!test" and "iterations" rules are well tested (planted snippet; an ignored path and an unparsable snippet throw instead of reporting nothing).
- Proposed change: build the stories array from the config antfu produces (read the resolved `no-restricted-syntax` options of a non-story path with `eslint.calculateConfigForFile` and append), or add a test that the resolved list for a story path starts with the one for a non-story path. Add the `TSExportAssignment` case. Also say in the bare-control rule's message that a `template:` string of a story is not covered (the comment on `bare-controls` already says so; the lint message does not).

### Q8 (note): a skipped full-motion step is a pass; nothing asserts that the quiet checks of the variant ran

- Where: `stories/support/motion-play.ts` (`withMotion`, `showSkipped`); `.storybook/visual-variants.ts` (`browser-prefers-reduced`); `scripts/visual-variants.test.mjs`.
- What is wrong: under the emulated preference, `withMotion("full", fn)` returns without running `fn` and without failing; the reason is a pseudo-call in the Interactions panel. The tie to the table is good: `variantTagProblems` fails a tag no story carries, and the test pins the two tagged stories. CI's log of `fa1f3bb` confirms the variant ran both. What no check says is that each tagged story runs at least one step under `withMotion("reduce")`: a later edit that leaves only full-motion steps makes the variant pass with nothing checked. Both stories have reduced steps today. `showSkipped` also relies on the internal `storybook/internal/instrumenter` and on `instrument({...}).skipped(...)`; its test mocks that, so it states the shape, not the panel.
- Proposed change (cheap guard, not a blocker): have `showSkipped` count, and have `afterEach` in `.storybook/vitest.setup.ts` fail when every `withMotion` call of a test was skipped.

### Q9 (later): two answers to "is this commit green"

- Where: `scripts/deploy-verdict.mjs:36` (`newestCheckRuns`: newest id per check name, the push run and the `pull_request` run counting as one); `scripts/ci-verdict.mjs` (`latestRuns`: newest run per workflow and event, push and `pull_request` apart).
- What is wrong: the first mirrors how GitHub's required checks pick a run, so it is defensible, and `merge-yourself` additionally requires `mergeable_state === "clean"`. But a failed `pull_request` job with a newer passing push job of the same name reads green in `deploy-wait` and red in `ci-wait`. `check-runs?per_page=100&filter=all` reads one page; past 100 attempts the newest could fall off the page and an earlier failed attempt would read red. The comment accepts this ("far more than this repository's checks").
- Proposed change: one sentence in `deploy-verdict.mjs`'s header that this is GitHub's rule on purpose, and why `ci-wait`'s is stricter. For the page limit, `--paginate` costs one flag, or a count check that says "100 rows: not all read".

### Q10 (note): `branch-prune` runs one `git for-each-ref --contains` per branch, for every branch

- Where: `scripts/branch-prune.mjs:107-122`. `containedInOpenPrs` is read by `asksAbout` only, that is, for a kept, not-merged branch; it is computed for every remote branch, including those about to be deleted and the merged ones.
- Proposed change: compute it after `decide` says keep, or only when `reason === NOT_MERGED`. The pure parts (`asksAbout`, `openPrsHolding`, `formatAge`) are clean and built on `decide`, so the two cannot disagree.

### Q11 (note): `visual-image.mjs`: the check that matters after an update is untested wiring, with two edges

- Where: `scripts/visual-image.mjs:100-139`; `scripts/visual-env.mjs` (`visualRun`, `vitestFilters`).
- The post-update `git status` and the exit code (1 when the container passed and baselines lie outside, the container's status otherwise) are in the script only. The decision functions are tested; the script's exit is not. The same fake-binary approach as Q1 and Q3 would cover it.
- `--update=none` counts as an update (`asksForUpdate`), so the container runs without `CI=true`: a missing baseline is written instead of failing. No test names the case.
- `-t <name>` (a test-name filter) is not a file filter, so an update with `-t` redraws across all files and skips the outside-filter check. The header says "file filter", so that is accurate, but the README and delivery text that tell agents to use `--update <file>` should say `-t` is not covered.
- `visual-stories.mjs` and `visual-variants.test.mjs` read stories through `storybook/internal/common` and `storybook/internal/csf-tools`, internal APIs that a Storybook minor can move. That was already the case; now one more script depends on them.

### Q12 (note): `local-checks.mjs` (SessionStart hook)

- Where: `scripts/local-checks.mjs`, `.claude/settings.json`.
- The hook's shape is good: `timeout: 10` in settings against a 5 s read with SIGKILL, `stdio` ignored, `windowsHide`, `maxBuffer`, a shape check of the answer, exit 0 on every path, nothing in a cloud container, tested as a child process with no `gh` on PATH and in a "cloud".
- Remaining: (a) "never delays" is not true: it can wait 5 s on every `startup`, `resume` and `clear`, so on a flaky network. The header should say "at most five seconds". (b) The repository is hard-coded (`--repo christried/winnies`) while the waiters use `{owner}/{repo}`; the hook breaks on a fork. (c) Ticket titles from GitHub go into the session's context. They are cut to one line of 100 characters, a fair bound, but an `Idea:`-style title from any commenter-owner is text an agent will read as an instruction-shaped line. The notice's own lines say "Name them to the human", so the surface is small. (d) No test ties the hook entry in `settings.json` (command, matcher, timeout greater than the read timeout) to the script; a one-line test would.

### Q13 (note): `ci-wait` and the wait budget

- `CALL_MS` is documented as "how long one call waits at most" and printed on the first line (`waitLine`). But `readRetrying` adds up to 17 seconds per failed read (three workflow reads and two PR reads per iteration), plus a 15 s poll after the deadline check. The line is a floor, not a ceiling: a caller that sets its timeout equal to it can still be cut. Fine in practice; say "about", or count `pause` time into the deadline.
- Network failures that are not an HTTP answer (`error connecting to api.github.com`, `ETIMEDOUT`, a reset) are the likeliest blip on a laptop and are not in `retryDecision`'s transient set (only 5xx, an error page and a `SyntaxError`). The note belongs to the same ticket as Q3.

### Quality clean areas

- `scripts/cli-helpers.mjs` (`isErrorPage` shared by `ghErrorLine` and `retryDecision`), `scripts/pr-state.mjs` (`blocked`, with a test), `scripts/attribution.mjs`, `scripts/commit-format.mjs` (comments only), `scripts/branch-verdict.mjs` (`asksAbout` on top of `decide`).
- `scripts/copied-helpers.mjs` and its test (fails on a path that does not parse; asserts it read the support modules, so a pass is not an empty walk). `scripts/lint-planted.mjs` (never answers "no messages" for an ignored path, a config that cannot load, or a snippet that does not parse).
- `.storybook/visual-variants.ts` with `visual-variants.test.mjs` (the `only: []` case, the exact match of `UNSHOT_STORIES`, the tag check, the ids tested against the real story list).
- `ci-verdict.mjs` pure functions: `parseJobCount` closes the `Number("") === 0` hole; `laterAttemptLines` tells a start-failure re-run from a flake.
- `shots.mjs` secret handling: the secret goes only to a route scoped to the staging origin, every printed line passes `scrub`, the step file is an allow-list parsed as JSON.
- Stories support: `row`, `card`, `iconOf`, `elementRef`, `resolvedNumber`, `isLoop`, `runningLoops` each have one home now; `runningLoops` documents its two-frame read and its limit. `deploy-verdict.mjs`: `openLine`, `settledVerdict` and `failedDeploymentLine` are small, pure and tested; `blocked` is distinct from "wait".

---

## What the reviewers could not settle

1. **Whether `--update=all` behaves as the old bare `--update`.** Settled by the orchestrator from Vitest's own code, no ticket. The config resolver (`node_modules/vitest/dist/chunks`) resolves the option as `UPDATE_SNAPSHOT === "all" || … ? UPDATE_SNAPSHOT : … UPDATE_SNAPSHOT ? "all" : "new"`, so the bare flag (`true`) and `all` both end as `updateSnapshot: "all"`.
2. **Whether the human's Node loads the `.ts` import from the SessionStart hook.** The orchestrator ran `node scripts/local-checks.mjs` from #367's branch on the human's machine (Node v24.18.1, `engines` `^24.15.0`): exit 0, 0.66 s, no output. #375 removes the import from the hook's path (Q4 a). No ticket.
3. **Whether `ci-wait` behaves as proposed after Q1 and Q2.** The orchestrator's answer: #375's tests, with the reads passed in. No separate ticket.

Left open between the reports, each with the orchestrator's answer:

4. **Where `isCloudContainer` goes.** S1 proposes `scripts/cli-helpers.mjs`; Q4 (a) proposes a new leaf, `scripts/environment.mjs`, that imports nothing. Both are in #375, so the ticket must pick one. Q4 (a) gives the reason for its leaf: the hook loads the module at every session start. Answer: the leaf, `scripts/environment.mjs`, as #375's brief says; `cli-helpers.mjs` has imports of its own.
5. **Two questions the Quality report wrote but did not ask.** (a) Whether the three-way splits of `visual-env.mjs` and `shots-guards.mjs` are done now or later: the placement answers it, with Q4 (a) now and Q4 (b) and Q5 later. (b) Whether exit 2 for "GitHub could not be read" is acceptable to the orchestrator's background-wait handling, which treats exit 2 as "run it again" today (the same action). Answer: yes. A background wait that ends with exit 2 and the line "GitHub could not be read" is run again, which is what exit 2 already asks for; #375's brief was written on that answer.
6. **P3's counts.** The Spec report gives 30 of 32 files in its title and all 33 story files in its body. Answer: #345's brief counted 32 story files with a `withMotion("full")` call; two are tagged `reduced-preference` and run under the preference, and the other 30 pass there by construction. The count is checked again when the `skipped(…)` row is looked at on staging.
7. **S2 and Q12 (b)** name the same hard-coded repository in `local-checks.mjs`. Both end as notes, so nothing is lost, but they are one finding seen twice.

---

## Where each finding ends

Ticket #375 carries Q1, Q2, Q4 (part a), S1, S3, S7 and P2. Each id appears once in the table below. Q4 is the one id with two parts: part (a) is in #375, part (b) is a roadmap line, and the row names both.

| Id  | End                                                                                                          | Detail                                                                                           |
| --- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| S1  | Fixed in this phase, ticket #375                                                                             | Cloud test moved and header updated (where it goes is open, question 4)                          |
| S2  | A note                                                                                                       | The script works where the hook runs, in the project directory.                                  |
| S3  | Fixed in this phase, ticket #375                                                                             | The one rule sentence goes back into `CLAUDE.md` § Attribution                                   |
| S4  | A line in `docs/roadmap.md` § Engineering backlog                                                            | **A near-copy of `card` in the stories**                                                         |
| S5  | A line in `docs/roadmap.md` § Engineering backlog                                                            | **Two waiting scripts, one read and one verdict rule**                                           |
| S6  | A note                                                                                                       | The name stays true: `test:visual:podman` forces Podman, and #373's brief decided that.          |
| S7  | Fixed in this phase, ticket #375                                                                             | Comment names `CODING_STANDARDS.md` § Motion                                                     |
| S8  | A note                                                                                                       | The three copies agree today, and the bullet is long but accurate.                               |
| P1  | A line in `docs/roadmap.md` § Engineering backlog                                                            | **A second loop test in story support**                                                          |
| P2  | Fixed in this phase, ticket #375                                                                             | One clause in the review step's sentence                                                         |
| P3  | A note                                                                                                       | It is looked at on staging at verification.                                                      |
| P4  | A note                                                                                                       | The open Manual QA is taken at verification, `docs/agents/delivery.md` § Issues.                 |
| P5  | A note                                                                                                       | The split is coherent: the background call is the orchestrator's, and the brief likely chose it. |
| P6  | A note                                                                                                       | Accepted departures, each decided by the human or the orchestrator.                              |
| P7  | A note                                                                                                       | A state at review time; the R2 row is PR 357's to change.                                        |
| Q1  | Fixed in this phase, ticket #375                                                                             | Exit 2 for an unreadable GitHub; test of the exit code                                           |
| Q2  | Fixed in this phase, ticket #375                                                                             | The earlier-attempts read is not fatal after `green:`                                            |
| Q3  | A line in `docs/roadmap.md` § Engineering backlog                                                            | **Two waiting scripts, one read and one verdict rule**                                           |
| Q4  | Split: part (a) fixed in this phase, ticket #375; part (b) a line in `docs/roadmap.md` § Engineering backlog | Part (b): **visual-env.mjs split by concern**                                                    |
| Q5  | A line in `docs/roadmap.md` § Engineering backlog                                                            | **`shots-guards.mjs` holds three modules**                                                       |
| Q6  | A line in `docs/roadmap.md` § Engineering backlog                                                            | **Helpers copied between scripts under one name**                                                |
| Q7  | A line in `docs/roadmap.md` § Engineering backlog                                                            | **The story lint block copies antfu's list**                                                     |
| Q8  | A note                                                                                                       | Both tagged stories have reduced-motion steps today, so nothing is missed yet.                   |
| Q9  | A line in `docs/roadmap.md` § Engineering backlog                                                            | **Two waiting scripts, one read and one verdict rule**                                           |
| Q10 | A note                                                                                                       | It costs one git call per branch; the verdicts are right.                                        |
| Q11 | A note                                                                                                       | The decisions are tested, and the two edges are rare.                                            |
| Q12 | A note                                                                                                       | The hook is safe as built; the wording and the hard-coded repository are for a later edit.       |
| Q13 | A note                                                                                                       | The line is a floor, and the fix is one word; fine in practice.                                  |

Count: 28 ids. Seven are fixed in this phase (S1, S3, S7, P2, Q1, Q2 and Q4 part a). Eight ids go to the roadmap (S4, S5, P1, Q3, Q4 part b, Q5, Q6, Q7 and Q9), in seven roadmap lines, because Q3, S5 and Q9 share one. Thirteen are notes. The seven roadmap lines are written in `roadmap-lines.md`.

---

## Roadmap lines due in this phase

No line of § Engineering backlog says `Lands in Before R3`. The phase table's Before R3 row makes three claims, taken from the Spec report's last section. All three landed.

1. **"R1's and R2's retro fixes for the agents' environment, as one batch after R2's retro."** Landed. The 16 tickets carry R2's items 1 to 17, 20 and 21 (18 and 19 are notes by decision) and R1's.
2. **"R1's list is the retro comment on #294."** Landed, item by item:
   - 1 (a first real-browser story with the module's first ticket): `tickets.md` (#373).
   - 2 (#345): #345.
   - 3 (installed or cached state; `deploy-wait`'s failed-deployment line; the preview deployment): `delivery.md` (#373); #368; a roadmap backlog line (#373).
   - 4 (copied test helpers): replaced by #362 (the frame line is not added, by the human's decision).
   - 5, 6, 7, 13, 14: `subagents.md` and the implementer frame (#373); 6 in both.
   - 8 (a model at its usage limit): no rule, by the human's decision of 2026-11-13.
   - 9 (`needs-local-check` at a session's start): #371.
   - 10 (branch without a PR): #370.
   - 11 (`deploy-wait` "behind"): #368.
   - 12 (`--auto` on a PR that has just opened): one line in `delivery.md` (#369).
   - 15 (a blip from GitHub): #369.
   - 16 (Podman's machine): already in `delivery.md` § Issues since 2026-11-13.
   - 17 (the Write tool refusing a report file): a note, as decided.
   - "Left over": the two `chore/269-…` branches are listed by #370's output; deleting them is the human's.
3. **"#345 lands with it."** Landed (merge `fa1f3bb`). Its Manual QA on staging is still open (P3).

Backlog lines made true or untrue by this phase without being updated: one was made true and updated (the "Two bare controls" line, by #363). The R2 row of the phase table still says "Not started", which PR 357 owns; the Before R3 row's status is the retro's to change.
