# Review: Before R0 (2026-11-11)

- **Spec:** #219 (Before R0), tickets #221 to #239 and #243, PRs #242, #244, #245, #249.
- **Range and tip:** `9b504b4^1...origin/spec/219-before-r0-b`, tip `8ce77e5`. Lockfile excluded.
- **Date:** 2026-11-11.

Three read-only reviews of the same diff, run in parallel and reported side by side:

- **Standards** (`code-review` skill, Standards axis, no sub-agent): checked against CODING_STANDARDS.md, GLOSSARY.md, CLAUDE.md, ADRs 0001 to 0005, `docs/agents/*` at the tip, the README sections the diff touches, `eslint.config.mjs`, `.claude/skills/README.md` and the `writing-for-agents` skill, the smell baseline in `.claude/skills/code-review/SKILL.md`, and the comments on #219 and #235 to #239.
- **Spec** (`code-review` skill, Spec axis): checked #219 (A1 to A8, B1 to B9, Testing Decisions, Out of Scope), its sub-issues #221 to #239 and #243 with their comments, ADR-0002 and ADR-0005, and the diff. A deviation recorded on a ticket is not a finding unless the code contradicts the record. Tests were not run; the checks were by reading, plus read-only `gh api` and Vercel project reads.
- **Quality and architecture** (`thermo-nuclear-code-quality-review`, and step 1 of `improve-codebase-architecture` with the `codebase-design` vocabulary): checked the dev sign-in, the staging build decision, the script tooling and the test layer for depth, duplication and structure. Read-only.

## Standards

Checked and clean:

- Attribution: 54 commits authored and committed by Chris, 3 by GitHub (merge button); no trailer, no agent link, no `--no-verify`.
- Commit scopes: every scope used (`agents`, `ci`, `server`, `ui`) is in the CLAUDE.md list.
- Environment rule (CODING_STANDARDS § Environment): `WINNIES_STAGE` and `VERCEL_AUTOMATION_BYPASS_SECRET` are documented as exceptions in README § Environment variables in the same PR, which is the rule's own source.
- Copy rule: no "free", "beta" or pricing added. "Winnies Staging" is not user copy of the product.
- Design rule: staging favicons carry their "Design/asset needed / own build" flag in #237, decided by the human 2026-11-10.
- Behaviour rule (ADR-0001): production title and favicon hrefs resolve to the same strings as before (`"/" + "favicon.svg"`); e2e `toHaveTitle("Winnies")` holds because the harness blanks `WINNIES_STAGE`.
- Glossary vocabulary in comments, tests and docs (Winnie state, Won, Complete, Counter, Target, Win Condition, Quota, Challenge cap): correct, no "Avoid" term used for a domain concept.
- ESLint (jsdoc, kebab-case file names, `node/no-process-env` with a reasoned disable) is tooling and skipped. `.claude/skills/implement-spec-max` still differs from `implement-spec` only as `.claude/skills/README.md` says.
- Branch protection and `allow_auto_merge` checked with `gh api`: `check`, `attribution`, `api-tests`, `e2e` on both branches, admins enforced, auto-merge on. `delivery.md` is accurate.

Counts: must fix 1, ticket for later 2, note 8.

### 1. No GLOSSARY entry for "dev Owner" (judgement call) — must fix before the PR is ready

- Where: `GLOSSARY.md` § People; the term is used in `docs/agents/delivery.md:27-30`, `scripts/shots.mjs:1,8`, `server/dev/sign-in.ts:7,11,60`, `server/dev/reset-dummy-winnies.ts:16-19`, `server/dev/dummy-winnies.ts:3`, and the UI display name `"Dev Owner"` (`sign-in.ts:58`).
- Rule: `docs/agents/domain.md` § Use the glossary's vocabulary ("If the concept you need isn't in the glossary yet ... there's a real gap"); `docs/agents/tickets.md` § Rules ("Use `GLOSSARY.md` terms in titles and bodies"). R0 tickets and every Manual QA step will now say "as a dev Owner".
- Why now: #239's brief left it to this review, and the term carries a permission rule (`delivery.md:29`: only a dev Owner's data is the agent's to change, identified by an email suffix). A rule that depends on a definition should have one place that holds it.
- Fix: a dev Owner entry under People. Decision (#250's acceptance criteria): add it. Reasons the review gave: (1) it is already vocabulary, 12 occurrences across `delivery.md`, the helper, the handler, the reset, the dummy set and the UI label; (2) a standing permission depends on it, and the definition currently lives in a sentence in `delivery.md` and a code comment in `sign-in.ts:60`; (3) it is easy to confuse with the Safety net's "throwaway Owner" of the API and e2e tests (test code only, `#195` story 17), and ADR-0005 draws exactly that line; (4) a dev Owner is an Owner, so the Relationships section needs no change. Keep the lowercase `dev` as written everywhere; the UI label "Dev Owner" is only the display name. Wording, under People after **Streamer**:

  ```
  **dev Owner**:
  An Owner made by `/api/dev/sign-in` instead of Discord, on `pnpm dev` and on staging; no production build has the route. Its email ends in `@dev.winnies.invalid`, and `?as=<name>` picks which one, each with its own Winnies and Quota. Agents check signed-in pages as one, and a dev Owner's data is the only data on staging they may change.
  _Avoid_: test user, fake account, throwaway Owner (the API and e2e tests' own sign-in, which lives in test code)
  ```

### 2. `server/utils/env.ts:1` now says something false (judgement call) — note

- `/* eslint-disable node/no-process-env -- only permitted place to read raw environment */` is no longer true: `stage.ts:1` is a second place, with the same kind of disable.
- Rule: single source of truth (`writing-for-agents` § Pruning, sediment); `eslint.config.mjs` is where the repo says where `process.env` may be read.
- Fix: reword `env.ts:1` to "the place the app reads its run-time environment", or move `stage.ts` into a `node/no-process-env: off` block in `eslint.config.mjs` next to the `scripts` and `tests` blocks and drop the inline disable. Either keeps the claim honest.

### 3. "The one place that names" the staging branch is one of four (judgement call, Duplicated Code smell) — ticket for later

- `stage.ts:7` says `STAGING_BRANCH` is "the one place that names it". The same literal also sits in `vercel.json` (`"redesign": true`), `scripts/staging-wizard.sh:210`, and the origin in `scripts/shots.mjs:24` / `staging-wizard.sh` (`STAGING_FQDN`). Nothing pins the copies, while this repo does pin such copies elsewhere (`scripts/harness-sync.test.mjs`, `scripts/playwright-pin.test.mjs`).
- Why it matters: ADR-0005 leaves "what staging tracks once `redesign` is gone" to the Release. That is exactly when one copy is changed and the others are not; the wrong copy in `stage.ts` silently drops the dev sign-in from staging, or worse for the wizard, writes Vercel variables for the wrong branch.
- Fix: now, reword the `stage.ts:7` comment to "the place the build decision names it". For later: a small `scripts/stage-sync.test.mjs` in the style of `harness-sync.test.mjs` that asserts `vercel.json`'s `deploymentEnabled` keys contain `STAGING_BRANCH`, and the wizard's and helper's values match `stage.ts`.

### 4. `scripts/shots.mjs`: credential guard logic is untested and the 404 message already refers to a PR (judgement call; Divergent Change smell) — ticket for later

- `scripts/shots.mjs` (329 lines) holds argument parsing, the origin allow-list (`readTarget`, lines 92-108), the path guard (`readPath`, 110-125), secret reading, `scrub`, sign-in, and the shooting. The repo's own pattern is to split the decision from the IO and test the decision: `ci-verdict.mjs`/`ci-wait.mjs`, `worktree-verdict.mjs` (introduced in this same diff, whose header says so), `attribution.mjs`. Here the decisions that keep a Vercel bypass secret from going to any other host are the ones with no test.
- Fix (ticket): extract `readTarget`, `readPath`, `slugOf` and `scrub` into `scripts/shots-guard.mjs` and add a `shots-guard.test.mjs` with the refused origins (`https://staging.winnies.christried.me.evil.com`, `http://localhost.evil.com`, `//evil`, `/\evil`, a Windows path) and the scrub case.
- Small, fix now with finding 6: line 193 says "staging only once the Part B PR is merged into `redesign` and deployed". "Part B" is a spec-internal phase name that means nothing once #249 is merged. Say "staging carries it from the deployment of #235 on".

### 5. `server/dev/dummy-winnies.test.ts:10-19` re-derives "Complete" (judgement call, Duplicated Code smell) — note

- The local `winnieState` repeats `challenges.length > 0 && every(status === "won")`, which is `isWinnieComplete` in `shared/utils/winnie-completion.ts`. The comment ("Local until R0 adds the Winnie-state derivation") is right for Running, Paused and Not started, which do not exist in the app yet, but not for Complete, which does, and GLOSSARY pins it ("Complete beats the other three").
- Fix: `import { isWinnieComplete } from "../../shared/utils/winnie-completion"` and keep only the Running / Paused / Not started cascade local, so a change to what Complete means cannot leave the dummy set's test behind.

### 6. `server/dev/sign-in.ts:22,53`: a variable named `as` (judgement call, Mysterious Name smell) — note

- `const as = query.as` and `const as = devOwnerName(query)` name a local after a TypeScript keyword; it reads as a typo in `${as}@dev.winnies.invalid` and `as === DEFAULT_NAME`. `shots.mjs` has the same `args.as`.
- Fix: `ownerName` in the handler and `devOwnerName`'s local; the query parameter stays `as`.

### 7. `nuxt.config.ts:19-37`: an inline module inside the config (judgement call, Divergent Change smell) — note

- The config is now edited for three reasons (branding, the dev sign-in module, the modules list), and the module is a 15-line `defineNuxtModule` in the middle of it. Nuxt auto-registers `modules/<name>.ts`, which would keep `nuxt.config.ts` a list and give the module its own file.
- Fix: move it to `modules/dev-sign-in.ts`. Low priority; do it in R0 when the config is touched anyway.

### 8. README does not list the new test command (judgement call) — must fix before the PR is ready

- `README.md:56-60` § Scripts omits `pnpm test:build`; `README.md:62-63` says CI runs "lint, typecheck, test and build (the `check` job)" and now also runs the build test; § Tests (lines 66-96) has no bullet for it ("run `pnpm build` first").
- Rule: README § Tests is what `implementer-frame.md` and `subagents.md` § Briefs point agents at for "how to run the tests". An agent who wants to run the production-build check cannot find it there.
- Fix: add `pnpm test:build` to § Scripts, "and the build test" to the CI sentence, and one § Tests bullet: "`pnpm build`, then `pnpm test:build`: fails if the production build carries `/api/dev/sign-in` (ADR-0005)".

### 9. Three commits have no scope (judgement call) — note

- `87047dc chore: check out text files with LF`, `0babb31 chore: add the staging wizard`, `c0b054e chore: skip Namecheap in the staging wizard ...`.
- Rule: `CLAUDE.md` § Commits, `type(scope): summary`, "Add a scope only when none fits". `ci` or `agents` plausibly fits the wizard (a tool for the agents' environment); none fits `.gitattributes`. Nothing enforces it, and the commits are merged and pushed.
- Fix: none to the history. For the next batch, `chore(agents)` for the wizard; if a scope for repo plumbing keeps being missing, add one to the CLAUDE.md list rather than omit it.

### 10. `docs/agents/delivery.md` § Issues repeats what the script and other documents already say (judgement call, sprawl and duplication) — note

- `delivery.md:25` ("Verify on staging, then close") is one bullet holding a six-step procedure (about 230 words); `delivery.md:27-28` restates `scripts/shots.mjs`'s usage line and its Git Bash leading-slash note, which are also in the script's header and in `readPath`'s error. The bypass-secret rule appears in `delivery.md:30`, `implementer-frame.md:31`, README, `.env.example`, `shots.mjs` and the wizard.
- Rule: `.claude/skills/writing-for-agents` § Pruning (one source of truth; the environment is a source of truth, a document restating it is a cache; sprawl) and § When to split. Cross-references are fine; copies drift (the decision on #239 already had to reconcile delivery.md with the implementer frame on whether to run a page locally).
- Fix: when `delivery.md` is next touched (retro, R0), make the verify bullet a numbered list, keep the usage line only in `shots.mjs` and point to it, and keep the bypass-secret rule in `delivery.md` with the other places pointing at it.

### 11. `server/dev/reset-dummy-winnies.ts:22`: an injectable `now` nobody injects, and the destructive delete has no test (judgement call, Speculative Generality) — note (cross-axis: pass to the Spec review)

- `resetDummyWinnies(ownerId, now = Date.now())` is only ever called with one argument, and no test calls it; the doc comment says the delete is "by `ownerId` and nothing else", which is the one property the `delivery.md:29` staging rule depends on. The unit test covers the data, not the delete, and `tests/support/test-server.ts` blanks `WINNIES_STAGE`, so the API suite cannot reach the route.
- Fix: either drop the `now` parameter, or use it in a test that runs the reset against the test database with two Owners and asserts the other Owner's rows survive. The second is the better use of the parameter and closes the gap; whether it is wanted is a Spec question (#236), so no verdict above note.

## Spec

### Checked and found conforming (no finding)

- **#235 dev sign-in.**
  - `stage.ts` holds the one pure function (`isStagingBuild`, `carriesDevSignIn`). `stage.test.ts` has every environment the ticket lists as data, plus extra rows. The Vercel branch of `isStagingBuild` ignores `WINNIES_STAGE`.
  - The route is registered by a module in `nuxt.config.ts` (lines 19 to 33) only when `carriesDevSignIn(nuxt.options.dev)`. `server/dev/sign-in.ts` has no check of its own and sits outside the directories Nitro scans.
  - `as` is validated and never falls back to the default. The email is `<as>@dev.winnies.invalid`. `to` is restricted to a path inside the app (the tab and backslash fix is in `LANDING_PATTERN`). The insert-or-find is one statement.
  - The cookie is signed with `makeSignature` and the Better Auth cookie attributes.
  - `server/utils/auth.ts` is untouched, so no sign-in method was added to production.
  - `tests/build/dev-sign-in.test.ts` reads every file of `.output/server` and fails on an empty directory. `ci.yml` runs it after `pnpm build`. The red run is shown by commits 6f8deac and cf965d5 and by the run linked on the ticket.
  - `tests/support/test-server.ts` blanks `WINNIES_STAGE` for the harness build. `.env.example` and README § Environment variables describe the switch.
- **#236 dummy set.**
  - `server/dev/dummy-winnies.ts` is data. It has one Winnie per state (Running "Evening Gauntlet", Paused "Fifty Challenges", Complete "Extremely Long Winnie Name Run", Not started "Nothing Yet").
  - The cap-length strings are exactly 30, 30 and 40 characters. The Winnie with 50 Challenges and the Winnie with none are both there. Won, Pinned, Counter at and below Target, and Win Condition present and absent are all covered. Every Winnie is dated 48 hours or more back.
  - `reset-dummy-winnies.ts` deletes by `ownerId` in one transaction. `?seed` is validated before anything is written.
  - The unit test pins one Winnie per state, one at 50 Challenges, and the invariants the app keeps (Counter at Target means Won, a Complete Winnie has no running timer).
- **#237 staging names itself.**
  - `stageBranding(isStagingBuild())` is handed over as `appConfig.brand`, not `runtimeConfig`. `default.vue`, `changelog.vue` and `use-favicon.ts` read it.
  - The three `public/staging/*.svg` files keep the shapes and change only the colours. I checked the three hue +180 hex values by hand and they are right. The recipe is written above `stageBranding`.
  - There is no in-page badge. The wordmark in `app-wordmark.vue` is untouched.
- **#238 `scripts/shots.mjs`.**
  - It takes a path, `--out`, `--as` and `--seed`. It shoots at 1440 and 390 px and prints console errors, or "no console errors" as its own line.
  - `BASE_URL` is limited to localhost or the exact staging origin. The secret is read from the environment, then from `.env`, and goes out only as a header scoped to the staging origin. A missing secret produces a sentence before any request is made. Output is scrubbed.
  - It imports the pinned `@playwright/test`. The lockfile has no diff. `.worktreeinclude` carries `.env`. `.env.example` names the variable with no value.
- **#239 documents.**
  - delivery.md § Issues, § Database migrations and § Walk-through, the release checklist, the subagents document, the implementer frame, tickets.md and the roadmap entry are all done as the ticket lists.
  - The documented Ready check works. The `gh api .../commits/34bc914/status` read returned `Vercel success`.
  - The `preview` grep matches the ticket comment: the remaining hits are history (ADR-0002, ADR-0005), the README sentence that says there is no preview, and two unrelated uses.
- **Part A and #233, rechecked at the tip.**
  - `.worktreeinclude` has `.env.test`. `.gitattributes` has `* text=auto eol=lf`. `.claude/worktrees/` is ignored.
  - The cleanup verdict is a pure function, `scripts/worktree-verdict.mjs`, with its test. AGENTS.md is a pointer. CLAUDE.md and the three skills have lost the before-`redesign` sentences. The CODING_STANDARDS Tests rule and the "For the orchestrator" brief section are present.
  - `vercel.json` has the build command and `deploymentEnabled`. README § Deployment is present.
- **#232 and #234 (the human's steps).** The code they rely on exists. That means `scripts/staging-wizard.sh` (CNAME, Discord redirect, `DATABASE_URL` and `BETTER_AUTH_SECRET` piped into Vercel for `redesign`, the bypass secret written to `.env`), the release checklist's staging wording, and `vercel.json`. #233's own comment records the verified staging build.

### Findings

#### 1. delivery.md contradicts itself on credentials. Verdict: note

- Spec/ticket line: #239, "The bypass secret is described as a credential: where it lives, and that it appears in no transcript, issue or report."
- `docs/agents/delivery.md:20` (§ Database migrations) says "An agent holds no staging or production credential". Line 30, three bullets below, says the bypass secret, a staging credential, lives in `.env`, which `.worktreeinclude` copies into every agent worktree. The criterion itself is met.
- Fix: say "no database credential for staging or production", which is what B6 says ("No agent holds a database credential for it").

#### 2. The spec text still says what #244 reversed. Verdict: note

- Spec/ticket line: #219 A8 and story 28: "Deleting a remote branch is the human's". #228's criterion repeats it.
- `docs/agents/delivery.md` § Branch hygiene now says the agent deletes merged remote branches and runs the cleanup. The human decided this on 2026-11-11, and #228 and #226 record it. The code matches the record, so this is not a defect.
- Fix: add one line to the #249 body, or to the #219 comment trail, saying A8 and story 28 are superseded. Otherwise a reader of the spec will think the delivery document is wrong.

#### 3. No GLOSSARY entry for "dev Owner". Verdict: ticket for later

- Spec/ticket line: #239 comment, "a GLOSSARY term for 'dev Owner' is left to the phase review". The spec does not ask for one.
- The term is now used in `delivery.md`, README, the code comments and the ticket titles. `GLOSSARY.md` does not define it. A dev Owner is an Owner, but one with an `@dev.winnies.invalid` email, a rule that agents may change its data, and a reset. `CLAUDE.md` makes `GLOSSARY.md` the domain source.
- Fix: a ticket for the glossary entry, to be done with R0's first docs pass. (Taken up by #250, see the closing section.)

#### 4. The Release-phase migration check is only on #211. Verdict: note

- Spec/ticket line: #219 B1, "The first migrating production deploy is a check of the Release phase: production's migration record has to match the committed migrations."
- Ticket #233 records it on #211 and meets its own criterion ("The Release check is on #211"). `docs/release-checklist.md` has no step for it, and the checklist is the document a release agent follows.
- Fix: optional. Add one step to the release checklist when the Release is planned.

#### 5. Preconditions of the staging Manual QA that I could not confirm. Verdict: note

- Spec/ticket line: #235 QA 3 and 4, #236 QA 4, #237 QA 3, #238 QA 2, #239 QA 1. All run after #249 merges.
- The code can pass them only if two things hold on Vercel. First, `VERCEL_ENV` and `VERCEL_GIT_COMMIT_REF` must reach the build. The #235 brief decision says `autoExposeSystemEnvs: true`, but the project read does not show that field. Second, a `redesign` build must be `VERCEL_ENV=preview`. #233 recorded "target preview" for the `redesign` deployment.
- If the variables are missing, `isStagingBuild` is false and staging answers 404, a silent failure. The helper's 404 sentence already says so.
- Fix: the first thing to do after #249 merges is to run QA 3. Do not close #235 to #239 before it.

#### 6. The helper shoots light only, and the subagents text says light and dark. Verdict: note

- Spec/ticket line: #238, "opens a path as a dev Owner at 1440 and at 390 px"; the spec does not mention dark.
- `shots.mjs` uses reduced motion and the default colour scheme. `docs/agents/subagents.md` still says to look at a page "at 390 and 1440 px wide, light and dark". The sentence goes on to say the verifier's comment names what the helper did not check, and the walk-through takes it. The two are consistent but easy to misread.
- Fix: none needed. If dark mode checks become routine, add a `--dark` flag.

#### 7. `favicon.ico` stays untinted on staging. Verdict: note

- Spec/ticket line: #237, "every favicon the app shows is tinted".
- `public/favicon.ico` is only requested by a page that has no `<link rel=icon>`. Every page that has a layout calls `useFavicon`, so only Nuxt's default error page falls back to it. The #237 comment records this and says R0 will bring its own.
- The look of the tinted icons is the human's call (the #237 comment says a sheet was sent in chat). No code defect.

#### 8. One harness file changed although the ticket says the suites are unchanged. Verdict: note

- Spec/ticket line: #235, "The API and e2e suites are unchanged and green, and the server they run against does not carry the route." The spec says "No Safety net test changes".
- `tests/support/test-server.ts` gained the `WINNIES_STAGE: ""` blank. No test file or expectation changed, and the brief decision on #235 records it. This is in the spirit of the spec, and the blank is needed so a developer's `.env` cannot change the server under test.

#### 9. The dev sign-in is a GET that changes state. Verdict: note

- Spec/ticket line: #235, "an address with no UI: opening it signs in".
- A GET that creates a session and, with `seed=reset`, deletes a dev Owner's Winnies could be triggered by any page a logged-in-to-Vercel viewer visits. The effect is limited to `@dev.winnies.invalid` accounts and the data an agent may change anyway, and staging sits behind Vercel login. The spec asks for an address, so this is by design.
- Fix: none.

### Count

- Must fix before the PR is ready: 0
- Ticket for later: 1 (finding 3)
- Note: 8 (findings 1, 2, 4, 5, 6, 7, 8, 9)

## Quality and architecture

### Conclusion on #246 (the shared-code import in the test build)

**Cause (reproduced, not guessed).** The vite server build (rolldown 1.2.18 under vite 8.3.7) leaves every import of `<root>/shared/` external on purpose (`@nuxt/vite-builder` `ssrEnvironment`, `external: [..., RegExp("^<root>/shared/")]`); Nitro then bundles those files. When an external module is first reached through a **relative source specifier**, rolldown (default `makeAbsoluteExternalsRelative: "ifRelativeSource"`) writes it into the chunk as a relative path, and that path is computed from a base two directory levels deeper than the chunk's own directory. In `.nuxt/test/<id>/dist/server/_nuxt/pages-*.js` the specifier then points nowhere, and Nitro's prerender rollup fails with `Could not resolve "../../../../../../../../shared/schemas/winnie.ts"`. The issue's guess ("a path computed from a build directory that differs between the build and the bundling step") is close, but the wrong end: the build directory is not involved, the specifier's spelling is.

Evidence, all on the tip, on Linux (node 24, `pnpm install --frozen-lockfile`, building through `@nuxt/test-utils` exactly as `tests/support/test-server.ts` does, minus the database):

1. The pages chunk of a normal build imports `shared/schemas/winnie.ts` as an **absolute** path. 13 builds on 2 pinned cores: 13 of 13 green, absolute every time.
2. `shared/schemas/winnie.ts` is reached by two spellings in the server graph: `~~/shared/schemas/winnie` (alias, `app/components/winnie/new-winnie-modal.vue:5`, absolute after alias expansion) and the **relative** `../../../shared/schemas/winnie` (`server/db/schema/winnie.ts:6`, which is bundled into the pages chunk through drizzle-zod; `pgTable` code is in that chunk). `shared/constants` has the same pair (`~~/` / `#shared/` in `app/`, relative in `server/db/schema/auth.ts`, `challenge.ts`, `server/db/queries/quota.ts`).
3. Making the alias importer relative too (one `sed` on `new-winnie-modal.vue`, so only relative importers exist) reproduces the failure **deterministically, 3 of 3**: `Could not resolve "../../../../../../../../../<root>/shared/schemas/winnie.ts" from ".nuxt/test/<id>/dist/server/_nuxt/pages-<hash>.js"`. Decoded, the specifier climbs to a base that sits exactly 8 levels below the repo root. The CI message has the same shape: 8 levels below `/__w/winnies/winnies` (e2e container job) and below `/home/runner/work/winnies/winnies` (api-tests host job) both resolve to "root + `shared/...`", consistent with that rule on two different checkout depths.
4. Adding `vite.$server.build.rolldownOptions.makeAbsoluteExternalsRelative: false` to `nuxt.config.ts` of the same failing copy makes the chunk import an absolute `<root>/shared/schemas/winnie.ts` and the build passes (4 of 4 runs; one run in each batch hit an unrelated `@nuxt/fonts` network timeout, not related).

**What is inferred, not shown.** Which importer wins is decided by resolve timing, which is why a build is green most of the time and red now and then. The plain tip did not fail in 13 builds on 2 cores. The race is the best explanation of the 25 percent versus 0 percent split between the alias and the relative spelling; it is not proven. The deterministic repro proves the mechanism and the fix, not the dice.

**Did this phase introduce or worsen it? No.**

- The relative import in `server/db/schema/winnie.ts` dates from c7a2488 (2026-08-29).
- The first failing SHA, `b85ad6f`, differs from the phase base `9b504b4^1` in no file under `app/`, `server/`, `shared/`, `tests/`, `public/`, `.github/`, `nuxt.config.ts`, `package.json` or the lockfile (`git diff --stat` empty for those paths). It is docs, scripts, `.gitattributes`, `.worktreeinclude`. The second failing SHA (`8b53f82`) only added `vercel.json` and README text. `tests/support/test-server.ts` (one `WINNIES_STAGE` blank) and `vitest.build.config.ts` (reads `.output`, builds nothing) cannot influence bundling.
- Nothing the phase added puts a new `shared/` importer into the client/SSR graph: `server/dev/*` is not bundled into the app, and the three `useAppConfig()` callers import nothing from `shared/`.
- Base rate from `gh run list`: 109 runs on 2026-11-10 with zero reruns; since 2026-11-11 07:54Z, 86 runs and 3 reruns, all on the test server's build. The "three of about twelve" in the issue reads as three of 86 runs (about 3 of 172 test-server builds, roughly 2 percent). The three `check` job builds never failed, which at that rate is unremarkable. The jump from 0 to 3 is more likely CI timing than code.

**Fix before R0? Yes, as its own small PR, not blocking this one.** Three reasons: every R0 ticket PR triggers four test-server builds (push and PR, API and e2e), so about 2 percent per build becomes a rerun every dozen tickets and blocks auto-merge into `redesign`; the same graph is built by Vercel on every merge into `redesign`, where a hit fails the staging deploy; and the repro makes the fix a ten-minute job. See finding 1 below.

### Findings

#### 1. #246: rolldown renders a shared external relative and wrong

- **Where:** `nuxt.config.ts:47-` (the `vite:` block, no server override); the dual spellings at `server/db/schema/winnie.ts:6`, `auth.ts:11`, `challenge.ts:5`, `server/db/queries/quota.ts:3` versus `~~/shared/...` / `#shared/...` in `app/`.
- **Problem:** see the conclusion above.
- **Restructuring:** in `nuxt.config.ts` add `$server: { build: { rolldownOptions: { makeAbsoluteExternalsRelative: false } } }` under `vite` (verified to produce the absolute spelling in the repro copy). Absolute is the spelling every green build already has, so the Nitro side is unchanged. Optional second layer, not needed for the fix: a `no-restricted-imports` pattern so `server/` and `app/` import `shared/` by one spelling only. Report the repro to rolldown upstream; a later rolldown or Nuxt bump may remove the need.
- **Verdict:** ticket for later, scheduled **before R0** (as #246, first in line). Not a PR-ready blocker: it is not caused by this diff and a rerun clears it.

#### 2. `worktree-clean.mjs` swallows a mistyped flag, including the safety flag

- **Where:** `scripts/worktree-clean.mjs:32-36`.
- **Problem:** flags are hand-parsed: `args.includes("--unlocked")`, `args.includes("--dry-run")`, and every other `--x` is dropped by `filter(arg => !arg.startsWith("--"))`. `--dryrun` or `--dry` is silently ignored and the script then **removes** worktrees. The same phase's `shots.mjs` parses with `node:util` `parseArgs` in strict mode, so one script refuses an unknown flag and the destructive one does not.
- **Restructuring:** `parseArgs({ strict: true, allowPositionals: true, options: { unlocked: {type:"boolean"}, "dry-run": {type:"boolean"} } })`; a typo then exits with a message. `unmatchedNames` already guards the positional side the same way.
- **Verdict:** **must fix before the PR is ready** (five lines; a flag introduced in this phase whose job is to prevent a deletion).

#### 3. The production-build guard hardcodes the route it guards

- **Where:** `tests/build/dev-sign-in.test.ts:21` (`includes("/api/dev/sign-in")`) versus `nuxt.config.ts:28`, `scripts/shots.mjs:151`, `server/dev/sign-in.ts` doc.
- **Problem:** the route string lives in four places. If it is renamed in `nuxt.config.ts` only, the test goes on passing while the production build carries the sign-in under its new name. This test is the only protection a credential-less session minter has in production (ADR-0005). The one-time proof that it can fail was manual (6f8deac, reverted).
- **Restructuring:** export `DEV_SIGN_IN_ROUTE` from `stage.ts`; `nuxt.config.ts` and the test import it. Add a second, rename-proof marker: the handler's own code (`dev.winnies.invalid`, the email domain) must be absent from `.output/server` too. `shots.mjs` keeps its copy (plain mjs, cannot import a `.ts` without a loader) but a one-line sync test could pin it.
- **Verdict:** ticket for later (small; before R-phase work touches the route).

#### 4. The dev sign-in handler has no automated test, and its security-adjacent parsers cannot be tested

- **Where:** `server/dev/sign-in.ts:19-47` (`devOwnerName`, `wantsReset`, `landing`, `LANDING_PATTERN`); `tests/support/test-server.ts:183-185` blanks `WINNIES_STAGE`, so no API or e2e test ever sees the route.
- **Problem:** the policy of _which builds_ carry the route is covered by an 11-row table (`stage.test.ts`), but the open-redirect guard (`LANDING_PATTERN`, with a long comment about `/\evil.com`, tab, newline) and the `as`/`seed` refusals are private functions of a module that imports `../db` and `../utils/auth` at top level, so a unit test cannot import them without the environment. Only the pure data module has tests. Depth is in the wrong place: the careful logic sits behind the least reachable seam.
- **Restructuring:** pull the three parsers into `server/dev/sign-in-query.ts` (`parseSignInQuery(query) -> { as, reset, to }`, throws the 400s), no db or auth import; unit-test it with a row table next to `dummy-winnies.test.ts`. The handler becomes parse, upsert owner, optional reset, mint session, redirect. Optionally one API test against a second server built with `WINNIES_STAGE=staging` later.
- **Verdict:** ticket for later.

#### 5. Staging identity is written down in five places with no sync check

- **Where:** `stage.ts:8` (`STAGING_BRANCH = "redesign"`), `scripts/staging-wizard.sh:210-211` (`STAGING_BRANCH`, `STAGING_FQDN`), `scripts/shots.mjs:24` (`STAGING_ORIGIN`), `vercel.json:7-8` (`"redesign"`), README § Deployment.
- **Problem:** ADR-0005 says "what staging tracks once `redesign` is gone is decided at the Release": the day that changes, three scripts and a JSON file have to change together, and the repo already has the precedent for exactly this problem, `scripts/harness-sync.test.mjs`.
- **Restructuring:** a small `scripts/staging-sync.test.mjs` that reads the wizard's two constants, `vercel.json`'s `git.deploymentEnabled` keys and the `shots.mjs` origin and compares them with `STAGING_BRANCH` and the FQDN in `stage.ts`. No code change to the scripts.
- **Verdict:** ticket for later.

#### 6. `stage.ts` is three shallow exports around one fact; `nuxt.config.ts` carries an inline module

- **Where:** `stage.ts:16-69`; `nuxt.config.ts:2-4,8,19-33,53`.
- **Problem:** `isStagingBuild(env)`, `stageBranding(staging)` and `carriesDevSignIn(dev, env)` are each a one-liner over the previous; the config calls `isStagingBuild()` itself for the brand and then `carriesDevSignIn(nuxt.options.dev)` re-reads the environment inside a 14-line `defineNuxtModule` whose only job is `addServerHandler`. Deletion test: delete `stageBranding` and `carriesDevSignIn` and the logic re-appears as two ternaries in the config; the interface is as large as the implementation. The 25-line colour-rotation recipe for `public/staging/*.svg` is documentation of assets, parked in a function's JSDoc.
- **Restructuring:** (a) one deep function `resolveStage(env, dev) -> { brand, devSignIn }`, or (b) delete the module altogether: Nuxt's config already has `$development`, so `nitro: { handlers: isStagingBuild() ? [DEV_SIGN_IN] : [] }` plus `$development: { nitro: { handlers: [DEV_SIGN_IN] } }` expresses "dev server and staging build" structurally, with no `nuxt/kit` import and no `carriesDevSignIn`; `stage.test.ts` then keeps only `isStagingBuild`. Not run; verify that Nitro accepts the `server/dev/sign-in` path in `handlers` the way `addServerHandler` resolves it. Move the recipe next to the assets (`public/staging/README`-style doc, or a script, finding 7).
- **Verdict:** ticket for later. The current shape works and is tested; it will cost a little each time stage logic grows.

#### 7. Staging favicons are hand-derived copies that will drift at the first redesign icon

- **Where:** `public/staging/*.svg`, recipe in `stage.ts:35-50`.
- **Problem:** three hue-rotated copies of `public/favicon*.svg`, kept in sync by a prose recipe ("copy it, convert each hex to HSL, add 180, render at 32 px"). The redesign replaces the visual layer (ADR-0001) and with it very likely these icons; the next icon change needs a human to redo a colour transform by hand, and a miss goes unnoticed because nothing checks it.
- **Restructuring:** generate them from the production icons: a ten-line `scripts/staging-icons.mjs` (hue rotate +180 on the literal hex values, write `public/staging/`) run by the ticket that changes an icon, plus a test that the committed copies equal the script's output. This deletes the recipe from the code and makes drift a red test.
- **Verdict:** ticket for later (before the first redesign icon lands).

#### 8. The hand-rolled Better Auth session minting is a copy of the library's internals

- **Where:** `server/dev/sign-in.ts:79-91` (`ctx.internalAdapter.createSession`, `ctx.authCookies.sessionToken`, `makeSignature`).
- **Problem:** it depends on three Better Auth internals that are not a public contract, and on the exact cookie format (`<token>.<signature>`). A Better Auth upgrade can break it silently until an agent notices on staging. The tests already have a supported mechanism for the same job (`testUtils()` in `tests/support/test-auth.ts`) but ADR-0005 rightly keeps it out of production code, so this duplicate is accepted; the cost is that nothing in CI fails when it rots (finding 4).
- **Restructuring:** none needed now. When finding 4's second server exists, one API test of `/api/dev/sign-in` followed by `GET /api/winnies` would pin it (`shots.mjs` `confirmSession` already does that check at run time).
- **Verdict:** note.

#### 9. `shots.mjs` is one 330-line script with its guards untestable

- **Where:** `scripts/shots.mjs` (`readTarget` 92-108, `readPath` 110-125, `scrub` 43-47, `slugOf` 145-148).
- **Problem:** the origin allowlist, the path checks and the secret scrubbing are what keep a bypass secret from leaving the staging origin; they are private functions of a script that runs `main()` on import, so unlike every other script of the repo (`ci-verdict`, `worktree-verdict`, `harness-sync`) none of it has a test. Reads cleanly otherwise (strict args, one `Refusal` class, first-line-only errors).
- **Restructuring:** move `readTarget`, `readPath`, `slugOf` and `scrub` to `scripts/shots-guards.mjs` with a `.test.mjs` (the `worktree-verdict` split, applied here); `shots.mjs` keeps the Playwright orchestration.
- **Verdict:** ticket for later.

#### 10. `worktree-clean.mjs` inspects every worktree before deciding, and repeats its names

- **Where:** `scripts/worktree-clean.mjs:74-88` (`describe`), `:97,118-126,131` (`name` and `branches` computed several times).
- **Problem:** `describe` runs `git status`, `git branch -r --contains` and a process scan for every worktree, including those `decide` keeps for "its session runs" or "not named", where no fact matters. `git status` in a worktree with `node_modules` is the slow part the header already warns about. `tree.path.split("/").pop()` appears three times; `new Set(branches)` twice.
- **Restructuring:** `worktrees()` returns `name`; make the three expensive facts lazy getters (or ask `decide` for the cheap verdict first and fetch the loss facts only for a wanted-gone tree). The verdict module and its tests stay as they are.
- **Verdict:** note.

#### 11. A third vitest config

- **Where:** `vitest.build.config.ts` next to `vitest.config.ts` and `vitest.api.config.ts`; `package.json` `test:build`; `tests/tsconfig.json` include list.
- **Problem:** three configs, one `exclude: tests/**` rule and three `include` lists that must stay mutually exclusive by hand. Not wrong, and the comment explains the split; it is the third of the same shape.
- **Restructuring:** vitest `projects` in one config (`unit`, `api`, `build`), the scripts become `--project`. Worth it if a fourth appears.
- **Verdict:** note.

#### 12. `dummy-winnies.test.ts` re-implements a shared rule and asserts conditionally

- **Where:** `server/dev/dummy-winnies.test.ts:11-19` (`winnieState`), `:76-123`.
- **Problem:** the local `winnieState` re-derives "Complete" as `challenges.length > 0 && every(won)`, which is `isWinnieComplete` in `shared/utils/winnie-completion.ts` (and the test file says only the Running/Paused half is missing). Several `it` bodies start with `if (state !== ...) return;` so for three of four Winnies they assert nothing; the `describe.each` reads as thorough but is partly vacuous.
- **Restructuring:** import `isWinnieComplete`; keep the local function only for the three states that do not exist yet. Move the state-specific rows out of `describe.each` into plain tests over the Winnie that has the state (`DUMMY_WINNIES.find(...)`), so no test passes by returning early.
- **Verdict:** note.

#### 13. Local `pnpm test:build` fails on a developer who simulates staging

- **Where:** `tests/build/dev-sign-in.test.ts:6-9`; `.env.example` `WINNIES_STAGE`.
- **Problem:** with `WINNIES_STAGE=staging` in `.env`, `pnpm build` is a staging build and `pnpm test:build` then correctly reports a carrier. The failure message says nothing about it; the file comment says "run `pnpm build` first". An agent following the README to simulate staging would meet a red test with no pointer.
- **Restructuring:** name `WINNIES_STAGE` in the assertion message (`expect(carriers, "...built with WINNIES_STAGE=staging? ...")`).
- **Verdict:** ticket for later (one line, fold into finding 3's PR).

#### 14. Wizard: duplicated constants aside, nothing structural

- **Where:** `scripts/staging-wizard.sh`.
- **Problem:** the library half is the skill's generated code and is not hand-edited by design; the stage half is linear and its secrets handling (hidden reads, piped, `trap unset`, `--sensitive`, a replace gate that defaults to no, `check_written` re-reading what Vercel lists) is deliberate and consistent. Its constants are finding 5. No test, which fits a one-off human wizard.
- **Verdict:** note.

### Improve-codebase-architecture, step 1: deepening candidates

Explored where this phase changed things (stage policy, dev sign-in, script tooling). Vocabulary from `codebase-design`; no ADR is contradicted.

| #   | Candidate                     | Shallow now                                                                                                                 | Deep after                                                                                                         | Strength                                                  |
| --- | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------- |
| A   | Dev sign-in query handling    | The seam is the Nitro handler, which cannot be imported without a database; the guards behind it are untestable (finding 4) | `parseSignInQuery`: small interface (`query -> {as, reset, to}` or a 400), all validation behind it, unit-testable | Strong                                                    |
| B   | The staging **stage** module  | Three pass-through exports plus an inline `defineNuxtModule` (finding 6)                                                    | One `resolveStage(env, dev)` or the `$development` handler config; fewer concepts in `nuxt.config.ts`              | Worth exploring                                           |
| C   | Shared-code external boundary | Two spellings of the same file cross the vite/Nitro seam; correctness depends on which wins (finding 1)                     | One spelling plus one rolldown option, so the seam has one adapter                                                 | Strong (it is #246)                                       |
| D   | Browser helper's guards       | Allowlist and scrubbing are private to a CLI script (finding 9)                                                             | `shots-guards.mjs`, the same split as `worktree-verdict.mjs`                                                       | Worth exploring                                           |
| E   | Staging identity              | Five literal copies (finding 5)                                                                                             | One module plus a sync test, or one config file read by all                                                        | Speculative until the Release decides what staging tracks |

Candidate C is the only one with a runtime consequence; A is the one that pays back in tests.

### Things checked and found sound

- `stage.ts`/`isStagingBuild`: on Vercel only Vercel's own variables count, so a dashboard variable cannot make production a staging build; `appConfig` bakes the brand at build time (ADR-0005).
- `reset-dummy-winnies.ts`: one transaction, delete by `ownerId` only, relies on the `onDelete: "cascade"` that exists on `challenge.winnieId`; empty `values` guarded.
- `tests/support/test-server.ts`: the `WINNIES_STAGE` blank is restored in `finally` through the existing `before` snapshot; the lock, build, teardown structure is untouched.
- `worktree-verdict.mjs`: pure, documented decision table with tests; the split from the gathering script is the right one (the same shape as `ci-verdict`).
- `use-favicon.ts`: the removed `FAVICON_HREF` export has no other reader.
- No file crosses 1000 lines (largest new: `staging-wizard.sh` at 547, `shots.mjs` at 329).

## What became of the findings

- **#250:** S1, S2, S3 (the comment), S8, Sp1, Sp3, Q2.
- **#251:** S3 (the test), S4, S5, S11, Q3, Q4, Q5, Q9, Q12, Q13.
- **#246:** Q1 (the diagnosis is posted on the issue; its own PR before R0).
- **The PR body of #249:** Sp2 (the spec text #244 superseded).
- **Notes, no ticket:** S6, S7, S9, S10, Sp4 to Sp9, Q6, Q7, Q8, Q10, Q11, Q14.
