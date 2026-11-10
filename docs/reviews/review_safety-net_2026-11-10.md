# Review: Safety net (2026-11-10)

- **Spec:** #195 (Safety net), tickets #196 to #203, PR #205.
- **Range and tip:** `origin/main...origin/spec/195-safety-net`, tip `9f53dbe`. Lockfile excluded.
- **Date:** 2026-11-10.

Three read-only reviews of the same diff, run in parallel and reported side by side:

- **Standards** (`code-review` skill, Standards axis): checked against CODING_STANDARDS.md, GLOSSARY.md, CLAUDE.md, ADRs 0001 to 0004, docs/agents/*, the smell baseline in `.claude/skills/code-review/SKILL.md`, and the comments on #195 to #203. Formatting from `17fca72` was out of scope on purpose.
- **Spec** (`code-review` skill, Spec axis): checked the #195 body and its two comments, tickets #196 to #203 with their comments, the diff (77 files), and the PR #205 body. A deviation recorded on a ticket is not a finding unless the code contradicts the record.
- **Quality and architecture** (`thermo-nuclear-code-quality-review` with `improve-codebase-architecture`): checked the test harness and the test layer on top of it for duplication, depth and structure.

## Standards

Out of scope on purpose: formatting from `17fca72`, linter-enforced rules, and decisions recorded on the issues (local DB with test-only neonConfig preload, `input:focus` in #201, 10 s poll pin in #202, pins of today's Quota/duplicate/Q-findings in #197/#198, `serverNow` format in #199, no `data-testid`).

Clean against the documented standards: no retries (`retries: 0`, no vitest retry), no skip/only, no `data-testid`, tests assert only through HTTP/browser (no query/store/class assertions), no production secrets in the two new CI jobs, Playwright image and package pinned together with a test (ADR-0004), commit identity and trailers clean, commit scopes all on the CLAUDE.md list, no `server/` or `app/` behaviour change (the two `runtimeConfig` edits are a behaviour-neutral lint fix).

### Hard violations of a documented standard

None introduced by this diff.

One pre-existing one sits on a line the diff touches:

1. `app/components/app-wordmark.vue:29` renders `v{{ appVersion }} · beta`. Standard: CODING_STANDARDS.md § Copy ("No copy anywhere ... says 'beta'"). Commit 7183653 only changed the variable (lint autofix); the word was already there. Not a defect of the Safety net. Fix: leave to the R-phase ticket that rebuilds the wordmark and make sure it is on that ticket's criteria, or file a one-line `fix` ticket.

### Judgement calls (documented-standard adjacent)

2. `README.md` (Environment variables, "The one exception is `TEST_DATABASE_URL`") says the variable lives in `.env.example`, `.env.test` and "the `api-tests` job". The `e2e` job in `.github/workflows/ci.yml` also sets it (with the host `neon-proxy`, a different value). Standard: CODING_STANDARDS.md § Environment (the four places the README names). Fix: say "the `api-tests` and `e2e` jobs", and that the host differs between them.
3. `tests/e2e/landing.spec.ts:5` is titled "/ signed out renders the Landing". GLOSSARY.md says the Landing is Planned (#124), and the file's own comment says today's `/` is the Workspace shell. Standard: GLOSSARY.md § Landing, CODING_STANDARDS.md § Copy (use the glossary's words). Fix: title it "/ signed out shows the sign-in button and no Workspace controls", or keep the name and accept it as a placeholder for #124 (it is named after story 42).

### Baseline smells (always judgement calls)

4. **Duplicated Code, the largest item.** Each `tests/api/*.test.ts` file carries its own copy of the same helpers (three implementers and #199/#202 flagged it):
   - `interface ChallengeRow` x5 (`challenges.test.ts:6`, `-counter:6`, `-edit:6`, `complete:7`, `share:13`, `timers-*`), `WinnieRow` x3, `TimerResponse` x3.
   - `createWinnie` x6 (`challenges:20`, `-counter:15`, `-edit:18`, `winnies-manage:9`, `winnies-reorder:9`, `winnies:10`), `createChallenge` x3, `readChallenges` x3, `winnieWith` x4 (`complete:34`, `share:19`, `timers-challenge:44`, `timers-winnie:41`), `read`/`pick` x3, `expectSettledSeconds` x2, the `ISO`/`SERVER_NOW` regexes x3, `W = 2500` x3.
   - `expectValidationError` x6 has already drifted: `challenges.test.ts:48` checks the response text and `fieldErrors`; `winnies.test.ts:21` and `winnies-reorder.test.ts:57` check `statusMessage` and `fieldErrors`. `expectError` (`share.test.ts:41`, `timers-challenge.test.ts:98`) is the same function twice.
   - Fix: one `tests/api/support.ts` (next to `api.ts`) exporting the row types, `createWinnie`, `createChallenge`, `readWinnie`, `expectValidationError`, `expectError`, `SERVER_NOW`, `ISO`, and one named constant for the wait. Do it before R0, because every later ticket edits these pins.
5. **Duplicated Code, e2e.** `ownerRequest` (`viewer.spec.ts:34`) and `seedWinnie`/`seedChallenge` (`owner-journey.spec.ts:18`, `:26`) are two seeding helpers; both say "candidate for tests/e2e/support/". `viewer.spec.ts:9` re-derives the server address (`http://127.0.0.1:${TEST_SERVER_PORT}`) instead of using the `baseURL` Playwright already has (`page.request` does, as `owner-journey.spec.ts` shows). Fix: seed through `page.request` or one `tests/e2e/support/seed.ts`.
6. **Duplicated Code, harness.** `declare module "vitest" { ProvidedContext { serverUrl } }` appears in both `tests/api/api.ts:4` and `tests/api/global-setup.ts:4`. Fix: keep it in one.
7. **Duplicated Code, CI.** The `env:` block (six variables), the `postgres` and `neon-proxy` service blocks, and the proxy digest are written twice in `ci.yml` (`api-tests`, `e2e`) and again in `compose.test.yaml` and `HARNESS_ENV` (`tests/support/env.ts:18`). Only comments say "keep in sync"; the Playwright pin has a test, these do not. Fix: a small `scripts/*.test.mjs` in the style of `playwright-pin.test.mjs` that compares the proxy digest and the five harness values, or YAML anchors for the shared blocks.
8. **Divergent Change / long function.** `tests/support/test-server.ts:74` `startTestServer` (140 lines) does five jobs: reach the DB, take and keep alive the advisory lock, empty and migrate, swap `process.env`/console/streams for the build, build and start. The env/console save and restore (`:150-198`) is the hardest to follow. Fix: extract `acquireRunLock(pool)`, `resetDatabase(db)` and `withBuildEnv(env, fn)`; behaviour unchanged.
9. **Mysterious Name.**
   - `W` (`complete.test.ts:31`, `timers-challenge.test.ts:41`, `timers-winnie.test.ts:38`): rename `MIN_RUN_MS` or `WAIT_MS`.
   - Test titles ending `(Q1)`, `(Q2)`, `(Q3)`, `(Q6)`, `(Q9)` (`challenges-edit.test.ts:275`, `:161`, `challenges-counter.test.ts:152`, `:163`, `challenges.test.ts:197`): the numbers refer to a brief that is not in the repository. Drop them or name the finding ("today").
   - `pick`, `read` (timers/complete files): `findChallenge`, `readWinnie`.
   - `describeError` (`test-server.ts:49`) casts to an ad hoc shape with five optional fields.
10. **Message Chains (minor).** `test-server.ts:207` reaches `context.nuxt!.options.buildDir` through a non-null assertion to delete the build; it works around test-utils, which the comment says. Leave, but it breaks silently on a test-utils change; the #203 dependency update is the moment it would show.
11. **Shotgun risk (not a defect today).** `TEST_SERVER_PORT` 3101 is hard-coded as `localhost:3101` in both CI `env:` blocks (`BETTER_AUTH_URL`, `NUXT_PUBLIC_APP_URL`) and in `env.ts`; part of item 7.

## Spec

Verdict: every requirement of the spec and of #196 to #202 is implemented, and no test or code contradicts a recorded decision. The findings are one documentation gap in #203/#205, a few behaviours not asked for (mostly forced by the lint bump), and three small mismatches between a ticket line and the code.

### 1. (a) #203 has no record, and the PR #205 body is stale (most serious)

- Delivery rule, `docs/agents/delivery.md` § Issues: "Comments are your job. Record what later tickets will need: decisions, deviations, verification results." #203 has **zero comments** and its checkboxes are unverified anywhere.
- Ticket #203, AC: "Lint, typecheck, unit, API and e2e checks are all green, with no test changed to make it pass. A test that went red is either a real regression fixed in code, or **explained in the PR**." Fifteen-plus test files under `shared/utils`, `scripts/*.test.mjs`, `tests/api`, `tests/e2e` and `tests/support` changed in `17fca72`. Checked with `git diff -w`: they are formatting only (line breaks and trailing commas), and the commit message says "nothing edited by hand". But the PR #205 body never mentions it.
- PR #205 body is out of date against the tip: "Nothing under `server/`, `app/` or `shared/` changes"; "`git diff main -- server app shared nuxt.config.ts` is empty"; "Left: #203"; "`pnpm test` unchanged (7 files, 64 tests)". After #203 all of these are false (about 40 files under app, server and shared plus `nuxt.config.ts` changed, all formatting except two components). The substance behind story 17 and #196's "production auth config has no test sign-in path" still holds: `testUtils` and `neonConfig` grepped under `server/`, `app/` and `nuxt.config.ts` find nothing. The evidence line should be re-stated.
- Only the commit messages record: `@types/node` held at 24.19.2 (not 26), the `useRuntimeConfig().public` destructuring in `app-footer.vue` and `app-wordmark.vue` (vue-tsc 3.3.14 types it `unknown` in the template), the `pnpm-workspace.yaml` key change forced by antfu config 10.

### 2. (b) Behaviour or changes not asked for

- `17fca72` reformats `app/`, `server/`, `shared/`, `scripts/*.mjs`, `eslint.config.mjs`, `nuxt.config.ts`, and 20+ test files. Spec out of scope: "Any behaviour change". Not a behaviour change, and forced by "every dependency updated" plus `--max-warnings 0` lint. Two edits are not whitespace: `scripts/ci-wait.mjs` `decisionOf` and `scripts/worktree-clean.mjs` `git` become function declarations (`antfu/top-level-function`), and the two components above. Low risk, but #203's text does not mention them.
- `pnpm typecheck` now also runs `tsc -p tests/tsconfig.json`, and `eslint.config.mjs` gains a `tests/**` override (no-console, `node/no-process-env` off). Not in the spec; recorded on #200 and sensible.
- `scripts/neon-local.test.mjs` (host allow-list `localhost` / `neon-proxy`) and `scripts/playwright-pin.test.mjs`. The second is implied by ADR-0004 and story 11 ("move together"). The first, with the host refusal and the "database name contains test" guard in `tests/support/env.ts`, goes beyond story 4 but serves it ("a test run can never empty real data"). Fine, recorded on #200.
- `.nvmrc` is `24.15`, not `24`. Follows #203 "`.nvmrc` follows".

### 3. (c) Implemented, but differing from the ticket line

- Ticket #200, AC: "Selectors use roles, labels and visible text." The rename test uses `ownerPage.locator("input:focus")` (`tests/e2e/owner-journey.spec.ts`). Recorded on #201 as a finding for R3, but the spec (Testing Decisions) offered the alternative "a test may add a stable `data-testid` to the existing component", which was not taken. Fragile: it passes for any focused input.
- Story 42: "`/` signed out to render the Landing". No Landing exists (`app/pages/index.vue` is the Workspace shell); `tests/e2e/landing.spec.ts` is titled "renders the Landing" but asserts the sign-in button, no "Create new Winnie" and the title "Winnies". Documented in the file's comment; the title overclaims.
- Story 25: "starting a Challenge Timer to also start the Total Timer, and pausing to stop it". `timers-challenge.test.ts` pins that pausing a Challenge Timer leaves the Total Timer running (matches #199 AC "pausing it stops the Challenge Timer, as today"). The story is ambiguous; the ticket wording governs. Worth a glance by the human.
- Ticket #199, AC "No test is flaky across ten local runs": proven by Vitest `repeats: 9` inside one run, reverted (recorded, human told, no objection). No file in the branch shows it, so it cannot be re-checked.
- Spec Seams: "`setup({ build, server })`". Implemented as direct calls of the `@nuxt/test-utils/e2e` functions from a shared global setup, and Playwright's own runner for e2e. Recorded on #196 and #200.

### 4. Findings the implementers left for the human (not defects of the net)

- Ticket #198: duplicating a Challenge skips the limit of 50; un-winning an unwon Challenge moves its Counter. Both pinned.
- Ticket #199: `serverNow` is Postgres text (`2026-11-10 11:00:27.520433+00`), parsed by `new Date()`; Safari unverified. Human decided: no ticket.
- Ticket #197: deleted or unknown Winnie answers 403 "Not your Winnie.", not 404.

Only the human can verify (from the report): 2 (native Windows run), 10 (required checks on `main` and `redesign`, branch protection), 18 and #203 AC 5 (Discord sign-in/out on the Vercel preview, which is Ready), 45 (merge only with the net green: CI status on #205), #196 Manual QA 1 and 2 (and Ctrl+C leaving no server on Windows), #200 Manual QA 3, #203 Manual QA 1 to 3 (and `redesign` branching from the merge commit).

The spec review also has a story-by-story coverage map (user stories 1 to 47) and an acceptance-criteria tally per ticket. They are not findings and are not reproduced here.

## Quality and architecture

Verdict: the harness itself (test-server.ts, env.ts, neon-local, the guards) is solid and deep. The weakness is the test layer on top of it: the same fixtures are written ten times, and the e2e suite has several more ways to call the API. R0 to R5 will copy whichever file they open first, so the duplication multiplies.

### F1 (strongest). No shared fixtures module: "a Winnie with Challenges" is hand-copied per file

- Files (all under tests/api/): complete.test.ts:34, share.test.ts:19, timers-challenge.test.ts:44, timers-winnie.test.ts:41 (`winnieWith`, identical bar the Winnie name and the input type); challenges.test.ts:20, challenges-counter.test.ts:15, challenges-edit.test.ts:18, winnies-reorder.test.ts:9/20 (`createWinnie`, `createChallenge`); winnies.test.ts:10, winnies-manage.test.ts:9 (`createWinnie`).
- Also copied: `read` + `pick` (complete, timers-challenge, timers-winnie), `readChallenges` (3 files), the interfaces `ChallengeRow`/`WinnieRow`/`TimerResponse` (8 files, with drifting field sets), `ISO`, `SERVER_NOW`, `W` and `expectSettledSeconds` (share, timers-challenge, timers-winnie; `W` also in complete), `expectError` (share, timers x2), `startChallenge`/`timerOk`/`challengeTimerOk`. Roughly 400 of the 3,032 lines in tests/api are helper copies.
- Why it matters: the next Owner-side endpoint (R1 onward) gets another copy, and a response-shape change (R1 Winnie fields, R2 timers) must be edited in 8 places. The copies already drift: `winnieWith` differs by `spec?` in share.test.ts.
- Suggestion: tests/api/fixtures.ts (next to api.ts) with `createWinnie(owner, name?)`, `winnieWith(owner, inputs, name?)` (generic over the const tuple, as now), `readWinnie`, `pick`, `timer`/`timerOk`, `setStatus`, and the response types in one place. Better: type the rows from `SelectChallenge`/`SelectWinnie` (server/db/schema/challenge.ts:80, winnie.ts:66) with Date mapped to string, so a schema change breaks the typecheck instead of the copies drifting. Put `ISO`, `SERVER_NOW`, `W`, `expectSettledSeconds` in tests/api/timing.ts. Deletion test: removing the shared module would reappear as ten copies, so it earns its keep. Size: medium (mechanical, one ticket, verify with `pnpm test:api`).

### F2. Three variants of `expectValidationError`, six copies

- challenges.test.ts:48, challenges-counter.test.ts:58, challenges-edit.test.ts:54 check the message in the raw body text with JSON-escaping; winnies.test.ts:21, winnies-manage.test.ts:32, winnies-reorder.test.ts:57 check `statusMessage`. They assert different things under one name. Same for `expectError` (3 copies) and `expectNotYourWinnie`.
- Suggestion: one `expectValidationError` (status 422, `statusMessage` contains, `data.fieldErrors[field]` contains) plus `expectError(status, message)` in tests/api/expect.ts. If the escaped-text check has a reason (quotes in a message), keep it in the one version. Size: small, part of F1.

### F3. Owner-side API access exists in four forms across the two suites

- tests/api/api.ts `api()`: `fetch` + `inject("serverUrl")`.
- tests/e2e/viewer.spec.ts:31 `ownerRequest`: the same `fetch` re-implemented, with its own `SERVER` constant `http://127.0.0.1:${TEST_SERVER_PORT}` (also the url test-server.ts returns), plus a throw-on-failure and an unchecked `as T`.
- tests/e2e/owner-journey.spec.ts:19/27 `seedWinnie`/`seedChallenge`: `page.request.post`, a different mechanism (browser context cookies).
- viewer.spec.ts:51 `createWinnie`, repeating the shape of the API `winnieWith`.
- The comment above `ownerRequest` ("Same helper as in owner-journey.spec.ts, on purpose") is wrong: owner-journey.spec.ts has no `ownerRequest`; it has `seedWinnie`/`seedChallenge` over `page.request`. Correct or delete it (small). Its follow-on, "a candidate for tests/e2e/support/ once a third spec needs it", invites the duplication F1 describes.
- Code judo: `serverUrl` is not a variable. It is `TEST_SERVER_PORT`, fixed on purpose ("same on every machine"). So `provide`/`inject`, the double `declare module "vitest"` (api.ts:5 and global-setup.ts:5, identical blocks) and the `url` of `startTestServer` are indirection over a constant. Replace with one `tests/support/api.ts` exporting `SERVER_URL` and a plain-fetch `api(path, {as, method, json})` (no vitest import), used by Vitest and Playwright. Add `tests/support/seed.ts`: `seedWinnie(owner, {name, challenges})` returning ids and `shareSlug`, built on it. Then `ownerRequest`, `seedWinnie`, `seedChallenge`, viewer `createWinnie`, and F1's `winnieWith` copies collapse into one module, and every e2e test seeds via the `owner` fixture (fixtures.ts could expose it as a `seed` fixture). Note fixtures.ts:8-12 says later e2e tickets never edit tests/support/**: a shared helper there must be allowed, so amend that sentence in the same change. Size: medium; do it together with F1.

### F4. compose.test.yaml has no `name:`: add `name: winnies-test`

- compose.test.yaml:1. Without it, the compose project is named after the directory. Agents work in worktrees (`agent-<id>` directories), so each worktree gets its own project, while port 4444 is published by all of them: the second `pnpm test:db:up` fails on the port, or `test:db:down -v` run from one worktree misses another's containers. test-server.ts's design assumes one database shared by "three agents on one machine" (advisory lock), which only holds with one project. A fixed name makes `up -d` idempotent across worktrees. Consequence to state in README Tests (one line): `test:db:down` from any worktree stops everyone's database. Size: trivial.

### F5. startTestServer is a 140-line function that holds four jobs

- tests/support/test-server.ts:92-231. Run lock (acquire, keepalive, release), empty + migrate, build-time env swap and restore, build + start + teardown, in one function with a nested `release` closure, `lockClient`/`keepAlive` as mutable outer lets, and three nested try blocks. Correct and well commented, but a ticket that touches it (parallel e2e workers, a second suite) must read all of it.
- Suggestion: pull out `acquireRunLock(pool)` returning `{release}`, `resetDatabase(db)`, and `withBuildEnv(env, fn)` for the env/stream/console save and restore; `startTestServer` becomes a 30-line sequence. Also `sleep` (test-server.ts:50) re-implements `node:timers/promises`, which the tests already import. Size: small to medium, no behaviour change.

### F6. The harness environment is stated three times

- HARNESS_ENV in tests/support/env.ts:17, the `env:` blocks of `api-tests` and `e2e` in ci.yml (same five literals each), and the service blocks (postgres + proxy) in compose.test.yaml and twice in ci.yml. Each carries a "keep in sync" comment; nothing checks it.
- `scripts/playwright-pin.test.mjs` shows the repo's own answer: a test that reads ci.yml. Suggestion: a similar scripts test asserting the literals in ci.yml equal HARNESS_ENV and the proxy digest equals compose.test.yaml's. Size: small.

### F7. Smaller points

- tests/api/owner.test.ts:20-30 repeats inline what `listedIds` does (winnies.test.ts:14); falls out of F1.
- tests/e2e: `NAME` is defined separately in workspace.spec.ts, owner-journey.spec.ts and viewer.spec.ts; falls out of F3.
- tests/e2e/owner-journey.spec.ts `expectFrozen` uses `waitForTimeout(2_200)`; documented and can only pass wrongly. Acceptable, but if R2 adds more, move it to fixtures.ts.
- No file crosses 1k lines (largest test file: challenges-edit.test.ts, 411). The non-test changes under app/, server/, shared/ are lint/format only; no spaghetti growth.

### Recommended order (from this reviewer)

F1+F2+F3 as one "test fixtures" ticket before R0 starts (largest leverage, deletes roughly 500 lines); F4 now (trivial); F5 and F6 when convenient.

## Findings more than one reviewer raised

- Test fixture duplication in `tests/api` (`createWinnie`, `winnieWith`, the row interfaces, the `expectValidationError` and `expectError` variants, `ISO`/`SERVER_NOW`/`W`): Standards item 4; Quality and architecture F1, F2.
- E2E Owner-side API helpers (`ownerRequest`, `seedWinnie`/`seedChallenge`, the server address re-derived in `viewer.spec.ts`): Standards item 5; Quality and architecture F3.
- Duplicated `declare module "vitest"` block in `tests/api/api.ts` and `tests/api/global-setup.ts`: Standards item 6; Quality and architecture F3.
- Harness environment and service blocks stated in `ci.yml`, `compose.test.yaml` and `HARNESS_ENV`: Standards item 7; Quality and architecture F6.
- `startTestServer` (`tests/support/test-server.ts`) as one long function: Standards item 8; Quality and architecture F5.
- `tests/e2e/landing.spec.ts` title names a Landing that does not exist: Standards item 3; Spec finding 3.

## Resulting tickets

Fixed on the integration branch before the phase's verify step (`docs/agents/delivery.md` § Review, walk-through, retro):

- Ticket #206, Shared test helpers for the API and e2e tests: the `tests/api` duplication and the drifting `expectValidationError`/`expectError` variants, one Owner-side seeding helper for both e2e specs and one server address, the names (`W`, `pick`/`read`, `(Q<n>)` titles) and the `landing.spec.ts` title.
- Ticket #207, Test harness: a named compose project, a test that keeps the harness environment and the CI jobs in step, the README's `TEST_DATABASE_URL` line, and `startTestServer` split into named steps.

Not made into tickets:

- The "beta" in `app/components/app-wordmark.vue` predates this phase; R0 rebuilds the wordmark.
- `input:focus` for the rename editor is a recorded decision of #201; giving the editor an accessible name belongs to the R3 Workspace rebuild.
- Story 25's "pausing to stop it" reads two ways; the tests pin today's behaviour, which matches #199's acceptance criteria.
- The temporary `repeats: 9` proof of #199 is recorded on the issue and in PR #205, by design not in the code.
- The two #198 findings (duplicating skips the 50-Challenge limit; un-winning a Challenge that is not Won moves its Counter) wait for the human's decision.
- The formatting churn and the two `scripts/` rewrites come from `@antfu/eslint-config` 10's autofix (#203), accepted and recorded on #203.
