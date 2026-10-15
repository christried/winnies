# Tooling options for testing the rebuild

**Ticket:** #168 "Tooling options for testing the rebuild" (child of map #166). Feeds #178 "How to test visual work" and #179 "What safety net lands before R0".
**Scope:** what the repo has for testing today, the realistic options on this stack for visual, component, unit and e2e testing, dependency gaps, and the Tailwind `@theme inline` question (I1).
**Commit:** `cd443b2` (`git rev-parse --short HEAD`). Working tree had `AGENTS.md` and `docs/roadmap.md` modified; this file is new and uncommitted.
**Date:** 2026-10-15.

**Method.** Read-only. No packages were installed, no lockfile or app code touched, nothing written to GitHub. Repo facts come from files and `gh` reads. Versions come from `npm view` (registry, queried 2026-10-15), `pnpm outdated` (read-only), and the installed `node_modules`. Web facts come from official docs (URLs in Sources). One local probe ran the installed Tailwind compiler on a scratch file in the session scratchpad (not in the repo). "Unverified" marks anything I could not confirm from a primary source.

---

## Today in the repo

**Scripts (`package.json`).** `build`, `dev`, `generate`, `preview`, `typecheck` (`nuxt typecheck`), `lint` (`eslint . --max-warnings 0`), `test` (`vitest run`), `test:watch`, `db:*` (drizzle), `postinstall: nuxt prepare`. No Storybook, Histoire, Playwright or e2e script exists.

**Test files.** Five unit suites, all in `shared/utils/`: `counter.test.ts`, `sort-challenge.test.ts`, `theme.test.ts`, `timer.test.ts`, `winnie-completion.test.ts`. Nothing under `app/` or `server/` is tested. No Playwright config, no `.storybook/`, no `*.stories.*`, no Histoire config, no visual-regression baselines.

**Vitest config (`vitest.config.ts`).** `defineVitestConfig` from `@nuxt/test-utils/config` with `test.environment: "node"`. The Nuxt environment is not used. #126 asks to switch to `environment: "nuxt"`.

**CI (`.github/workflows/ci.yml`).** One job, `check`, on `ubuntu-latest`, triggered on `pull_request` and on push to `main`. Steps: checkout, `pnpm/action-setup@v4`, `setup-node@v4` with `.nvmrc` (value `24`) and pnpm cache, `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`. Job-level env holds `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET` from secrets, and `NUXT_PUBLIC_APP_URL=http://localhost:3000`. The job-level env is needed because `nuxt.config.ts` imports `server/utils/env.ts`, which validates env on any config load, including `nuxt prepare` at install. CI has no Postgres service and no browser install.

**Git hooks (`.husky/pre-commit`).** `pnpm lint-staged --max-arg-length 4000`, then `pnpm typecheck`. `.lintstagedrc.json` runs `eslint --fix --no-warn-ignored --max-warnings 0` on every staged file.

**Env files.** `.env.test` holds placeholder values (`postgres://test:test@localhost:5432/test`, Discord `test`). It is not wired to any script or to `vitest.config.ts`. `.env` is gitignored.

**Database.** `server/db/index.ts` uses `@neondatabase/serverless` `Pool` with `drizzle-orm/neon-serverless`. No local-driver fallback exists. This matters for e2e (see section 4).

**Node.** `package.json` engines `^24.11.0`; `.nvmrc` is `24`.

**Hosting.** Vercel (per the ticket). Not checked in the repo: no `vercel.json` was looked for, and Vercel project settings were not read.

**Installed versions (from `node_modules`, 2026-10-15):**

| Package                        | Installed              |
| ------------------------------ | ---------------------- |
| nuxt                           | 4.5.1                  |
| tailwindcss, @tailwindcss/vite | 4.3.3                  |
| vue                            | 3.5.40                 |
| vitest                         | 4.1.10                 |
| @nuxt/test-utils               | 4.1.0                  |
| typescript                     | 6.0.3                  |
| eslint                         | 10.8.0                 |
| better-auth                    | 1.6.29                 |
| drizzle-orm / drizzle-kit      | 0.45.2 / 0.31.10       |
| @neondatabase/serverless       | 1.1.0                  |
| daisyui                        | 5.7.14 (removed in R0) |

**Old issues, read-only.**

- 119 "Use Histoire / Storybook": decision already written as Storybook, not Histoire. Assumes the daisyUI theme and `main.css`. Those are obsolete after the redesign (ADR-0001).
- 126 "Unit Test Coverage": asks for `environment: "nuxt"`, component tests with `@nuxt/test-utils`, unit tests over server queries, handlers, Pinia store and composables, with no live database. Notes `pnpm test` should stay fast.
- 127 "Explore integration + e2e testing": **asks for Cypress** by name. Also asks for a Docker Postgres service in CI, Better Auth session seeding (no Discord OAuth in the suite), and a flakiness-is-a-defect rule. This conflicts with the Playwright-leaning options below; it is a decision for the owner (see Open trade-offs).
- 146 "update deps" (milestone v0.9.4, open): "check other dependencies for updates before it gets out of hand".

---

## Dependencies and I1

### Gaps (`pnpm outdated` snapshot plus `npm view` where newer)

Major-version gaps are marked **MAJOR**. Everything else is semver minor or patch.

| Package                                       | Installed        | Latest                     | Gap         | Likely to break on update                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| --------------------------------------------- | ---------------- | -------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| vitest                                        | 4.1.10           | 5.0.5 (npm)                | **MAJOR**   | Node >= 22.12 and Vite >= 6.4 required; `clearMocks` default flips to `true`; `testNamePattern` matching changes; `test.projects` inline entries now inherit root config; `vitest/environments`, `vitest/runners`, `vitest/suite`, etc. removed; `sequential` removed; hoisted `vi.mock` must be top-level. Source: [Vitest 5 migration](https://vitest.dev/guide/migration). `@nuxt/test-utils` 4.3.3 accepts vitest `^4 \|\| ^5` ([npm](https://www.npmjs.com/package/@nuxt/test-utils)), so the two can move together. |
| typescript                                    | 6.0.3            | 7.0.2                      | **MAJOR**   | TypeScript 7 is the native port. Not researched: whether `vue-tsc` 3.3.x (installed 3.3.9, latest 3.3.13) and `nuxt typecheck` work on it. **Unverified.** Pre-commit and CI both run typecheck.                                                                                                                                                                                                                                                                                                                          |
| @types/node                                   | 24.13.3          | 26.6.5                     | **MAJOR**   | Nuxt 4.6 wants Node `^22.22.3 \|\| ^24.15.0 \|\| >=26.0.0` ([Nuxt 4.6](https://nuxt.com/blog/v4-6)). Engines and `.nvmrc` pin 24.x.                                                                                                                                                                                                                                                                                                                                                                                       |
| @nuxt/fonts                                   | 0.14.0           | 1.0.1                      | **MAJOR**   | Not researched (no 1.0 migration notes fetched). **Unverified.** The app uses `fonts.defaults` in `nuxt.config.ts`.                                                                                                                                                                                                                                                                                                                                                                                                       |
| nuxt                                          | 4.5.1            | 4.6.1                      | minor       | Node range above. `nuxt upgrade --dedupe`; CLI v4. Auto-imported h3 helpers (`sendRedirect` returns the response, `createError` takes `status` and `statusText`); `useCookie` parses the header once per request, so a cookie set in a plugin during SSR is readable by a later `useCookie`. Typed `$fetch` is opt-in. Source: [Nuxt 4.6](https://nuxt.com/blog/v4-6). Server code using `sendRedirect`/`createError` should be grepped before upgrading. **Not checked in the repo.**                                    |
| @nuxt/test-utils                              | 4.1.0            | 4.3.3                      | minor       | Peers: nuxt `^3.21 \|\| ^4 \|\| ^5`, vitest `^4 \|\| ^5`, playwright-core `^1.43.1`.                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| better-auth                                   | 1.6.29           | 1.7.8 (pnpm)               | minor       | Not researched. **Unverified.** Auth is the riskiest runtime dependency.                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| @better-auth/drizzle-adapter                  | 1.6.29           | 1.7.8 (pnpm), 1.7.10 (npm) | minor       | Peers `better-auth` ^1.7.10 (npm view 1.7.10). Must move with better-auth.                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| eslint                                        | 10.8.0           | 10.12.0                    | minor       | Rules and flat config.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| @antfu/eslint-config                          | 9.2.0            | 9.5.1                      | minor       |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| eslint-plugin-better-tailwindcss              | 4.7.0            | 4.9.1                      | minor       | Lints Tailwind class order and names. Could fire on the redesign's classes.                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| @nuxt/eslint                                  | 1.16.0           | 1.17.0                     | minor       |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| zod                                           | 4.4.3            | 4.6.7                      | minor       |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| vue-router                                    | 5.2.0            | 5.4.0                      | minor       |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| pinia / @pinia/nuxt                           | 4.0.3 / 1.0.2    | 4.1.0 / 1.0.3              | minor       |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| vue                                           | 3.5.40           | 3.5.44                     | patch       |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| vue-tsc                                       | 3.3.9            | 3.3.13                     | patch       | See typescript row.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| @nuxt/content                                 | 3.16.0           | 3.16.2                     | patch       |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| drizzle-orm / drizzle-kit                     | 0.45.2 / 0.31.10 | 0.45.4 / 0.31.11           | patch       |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| @neondatabase/serverless                      | 1.1.0            | 1.2.0                      | minor       | Driver choice matters for e2e (section 4).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| lint-staged                                   | 17.3.0           | 17.6.0                     | minor       |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| @iconify-json/tabler, @nuxt/icon, @nuxt/fonts | —                | —                          | patch/minor |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| daisyui                                       | 5.7.14           | 5.7.50                     | n/a         | Removed in R0. Do not update.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |

Not in the outdated list (already latest in pnpm's view): `tailwindcss` and `@tailwindcss/vite` 4.3.3. Latest on npm, not installed: `playwright` / `@playwright/test` 1.64.1, `@storybook/vue3-vite` 10.6.2, `@storybook/addon-vitest` 10.6.2, `@chromatic-com/storybook` 5.5.1, `@argos-ci/playwright` 7.7.1, `histoire` 1.0.0-beta.1.

Sources for the table: `pnpm outdated` (run in repo, read-only); `npm view <pkg> version` (2026-10-15).

### I1: does Tailwind 4.3.3 support the `@theme inline` mapping?

**Yes, for the pattern in `02-tokens.md`, with one gotcha.** Tested with the installed `tailwindcss` 4.3.3 compiler (`node_modules/tailwindcss/dist/lib.mjs`) on a scratch file.

Input:

```css
@theme inline {
  --color-*: initial;
  --color-surface: var(--color-surface);
  --spacing: 4px;
}

```

Output (relevant part):

```css
@layer theme {
  :root,
  :host {
    --color-surface: var(--color-surface);
  }
}
@layer utilities {
  .bg-surface {
    background-color: var(--color-surface);
  }
  .p-3 {
    padding: calc(4px * 3);
  }
}

```

What this means:

- **Self-reference is emitted, not dropped.** `@theme inline` still writes `--color-surface: var(--color-surface)` into `:root`, inside `@layer theme`. On its own this is a cycle and resolves to the guaranteed-invalid value.
- **The unlayered token file overrides it.** `02-tokens.md` imports `winnies-tokens.css` unlayered, so its `:root` and `[data-theme]` declarations beat the layered self-reference, and utilities read the live value. Unlayered rules beat layered rules of the same origin regardless of specificity ([CSS Cascade 5, cascade layers](https://www.w3.org/TR/css-cascade-5/#cascade-layers), not fetched in this run). The probe did not include the token file, so this last step is inferred from the spec, not tested.
- **Order matters.** `--color-*: initial` must come before the surface registrations in the same block. In my first probe it came after and removed `bg-surface` entirely. The handoff's `docs/design_handoff_winnies/tokens/tailwind-theme.css` already has it first (line 17, directly after `@theme inline {`).
- **Spacing is inlined.** With `@theme inline`, `p-3` compiles to `calc(4px * 3)`, not `calc(var(--spacing) * 3)`. Fine while spacing is static; spacing cannot be switched at runtime (e.g. by a dialect) via `--spacing`.
- **No warning** was emitted by the compiler for the self-reference.

So the handoff's fallback ("move the registrations to a separate file imported before the token file") is probably not needed on 4.3.3, but it is cheap insurance. The check is a browser test of computed `background-color` with the token file loaded, which belongs in R0.

Source: [Tailwind v4 theme docs](https://tailwindcss.com/docs/theme) for `inline`, `initial`, and `--spacing` semantics; the output above is from the installed compiler.

---

## 1. Visual-regression and screenshot testing

Requirement: component and page screenshots, light and dark, reduced motion, consistent between a Windows dev machine and Linux CI, cheap, low-maintenance for one person.

Key fact for every self-hosted option: Playwright names snapshots by platform and warns that rendering depends on "host OS, version, settings, hardware" ([Playwright snapshots](https://playwright.dev/docs/test-snapshots)). Windows and Linux font rasterization differ, so baselines made on Windows will not match CI. The usual fix is to generate baselines only in a pinned container image (`mcr.microsoft.com/playwright:vX.Y.Z-noble`, with the Playwright version pinned to match) ([Playwright Docker](https://playwright.dev/docs/docker)). That image advice is general; the docs do not mention font rendering directly. **The "same fonts on both" claim is an inference, not a documented result.**

| Option                                                                                | Fit                                                                                                                                                                                                                                                                             | Effort                                                                          | Cost                                                                                                                                                                                                                                   | CI story                                                                                                                                                          | Gotchas                                                                                                                                                                                                                                                              |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Playwright `toHaveScreenshot`** on pages and/or stories (`@playwright/test` 1.64.1) | Good for pages and full flows. Light and dark via `colorScheme` (`'light'`, `'dark'`, `'no-preference'`) ([Playwright emulation](https://playwright.dev/docs/emulation)). Reduced motion via `reducedMotion` in the browser context: **not shown in the fetched docs; verify.** | Medium. Config, Docker baseline workflow, a `--update-snapshots` routine.       | Free.                                                                                                                                                                                                                                  | Strong: runs in the same ubuntu job. Baselines must be generated in the pinned container, so Windows devs either run tests in Docker or update baselines from CI. | Default `threshold` 0.2 and no `maxDiffPixels`; set both explicitly. Animations and carets need disabling (`animations: 'disabled'`, `caret: 'hide'`; **not confirmed in fetched docs, verify**). Hover and motion stabilisation are needed.                         |
| **Storybook stories + Chromatic** (`@chromatic-com/storybook` 5.5.1)                  | Good for component states. Rendering happens on Chromatic's servers, so there are no local font or OS baselines. Stories double as the component workbench (see section 2).                                                                                                     | Low-medium. Storybook plus an addon, a Chromatic project and token.             | Free tier: **5,000 billed snapshots/month, unlimited users** ([Chromatic pricing](https://www.chromatic.com/pricing)). Starter $179/month, 35,000 snapshots, $0.008 overage. Pro $399/month, 85,000. TurboSnap is not listed for Free. | Chromatic runs a status check on each PR, usually a separate service. Needs a token secret.                                                                       | Snapshot count grows with stories x themes x viewports. Stories must avoid live store and session dependencies (#119 excludes them, so there is no coverage for those). Sends rendered story output to a third party. Page-level visual testing is not its main use. |
| **Storybook + Argos** (`@argos-ci/playwright` 7.7.1)                                  | Similar to Chromatic, but also runs Playwright screenshots.                                                                                                                                                                                                                     | Medium.                                                                         | Hobby free: **5,000 screenshots/month, personal projects only**. Private GitHub orgs need Pro, $100/month, 35,000 screenshots, $0.004 extra ($0.0015 for Storybook). ([Argos pricing](https://www.argos-ci.com/pricing))               | Check per PR.                                                                                                                                                     | Whether this repo is personal or under an org decides whether Hobby applies. **Verify the account type.** Open-source terms not confirmed.                                                                                                                           |
| **Vitest browser mode `toMatchScreenshot`**                                           | Native screenshot assertion in Vitest, so no second runner. The v5 migration notes name `browser.expect.toMatchScreenshot.screenshotDirectory` (default `__screenshots__`) ([Vitest 5 migration](https://vitest.dev/guide/migration)).                                          | Medium. Needs `@vitest/browser-playwright` (Storybook's addon-vitest peers it). | Free.                                                                                                                                                                                                                                  | Same as Playwright: baselines are platform-specific.                                                                                                              | Not evaluated in depth. Browser mode is a second test environment alongside the Nuxt one. **Unverified in practice.**                                                                                                                                                |
| **Lost Pixel**                                                                        | Self-hosted or hosted visual diffing for Storybook and Playwright.                                                                                                                                                                                                              | Medium.                                                                         | Unknown. **Unverified.**                                                                                                                                                                                                               | Yes.                                                                                                                                                              | The npm `lost-pixel` package (3.22.0) was last modified 2024-11-14. No `@lost-pixel/nuxt` package exists on npm (404). Likely stale; **verify before considering.**                                                                                                  |
| **Percy**                                                                             | Hosted visual diffing.                                                                                                                                                                                                                                                          | —                                                                               | —                                                                                                                                                                                                                                      | —                                                                                                                                                                 | **Not researched.**                                                                                                                                                                                                                                                  |

**Reduced motion and light/dark, cross-cutting.** Both Storybook (`globals`/toolbar) and Playwright (`colorScheme`, `reducedMotion`) can set these per story or test. The redesign's `data-theme` and `data-motion` attributes (from `02-tokens.md`) mean the test or story must set the attribute too, not only the emulated OS preference. This applies to any option above.

**Windows dev machine.** Local runs produce Windows-named baselines. Options: (a) only ever generate or update baselines in Docker or CI, (b) run visual tests only in CI, or (c) use a hosted service so neither machine holds baselines.

---

## 2. Component workbench

| Option                                                                       | Fit                                                                                                                                                                                                                                                             | Effort                                                  | Cost  | Nuxt status                                                                                                           | Gotchas                                                                                                                                                                        |
| ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | ----- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Storybook via `@nuxtjs/storybook` 10.0.1**                                 | Nuxt-specific module, maintained under `nuxt-modules` (maintainers include pi0 and huang-julien). Depends on `@storybook-vue/nuxt` 10.0.1. Peers `storybook` `^10.6.0` ([npm](https://www.npmjs.com/package/@nuxtjs/storybook)). Updated 2026-10-13.            | Low-medium.                                             | Free. | Designed for Nuxt, so auto-imports and modules are expected to work. **Unverified against Nuxt 4.5.1 in this repo.**  | `engines` node `>=22`. Only 10.0.1 exists; its peer requires Storybook 10.6. Check that Tailwind v4 via `@tailwindcss/vite` and `app/assets/css/main.css` load in the preview. |
| **Storybook with `@storybook/vue3-vite` 10.6.2** (no Nuxt module)            | Official framework. Peers `vite` `^5 \|\| ^6 \|\| ^7 \|\| ^8`, `storybook` `^10.6.2`, `typescript >= 4.9`. Storybook's Vue 3 + Vite guide does **not** mention Nuxt ([Storybook Vue 3 + Vite](https://storybook.js.org/docs/get-started/frameworks/vue3-vite)). | Medium. Manual handling of Nuxt auto-imports and Pinia. | Free. | Works for plain components. Nuxt-only globals (`useRuntimeConfig`, auto-imported composables, `NuxtLink`) need stubs. | `preview.ts` `setup()` is the only documented hook for global plugins. `docgen: 'vue-component-meta'` is recommended; the default `vue-docgen-api` is deprecated as of 10.6.   |
| **Histoire** (`histoire` 1.0.0-beta.1, `@histoire/plugin-nuxt` 1.0.0-beta.1) | Declares **Vite `^7.3.0`** (Nuxt 4.5 uses Vite 8, per the Nuxt 4.5 entry on the [Nuxt blog](https://nuxt.com/blog)) and **`@histoire/plugin-nuxt` peers `nuxt` `^3.0.0-rc.11` only** (npm). Package last modified 2026-01-07.                                   | —                                                       | Free. | **Not supported by its own declared peers on Nuxt 4.** Consistent with #119's decision against it.                    | Would need a manual Vite setup and still ignores Nuxt 4 in its peers.                                                                                                          |

**Leading option (for #178 to decide):** Storybook. It has a Nuxt-specific module (`@nuxtjs/storybook`, maintained by nuxt-modules contributors, not Storybook itself), current 10.6 peers, and an addon ecosystem (Vitest addon, Chromatic). Histoire is effectively ruled out by its own peer ranges. Whether `@nuxtjs/storybook` works with this app's Nuxt 4.5 and Tailwind 4 setup is **unverified**; a spike is needed.

**Mapping to #119 acceptance:** the issue says stories must use "daisyUI theme from `main.css`". That is obsolete after R0. Stories should load the new `tailwind-theme.css` and token file, and both `data-theme` values.

---

## 3. Unit tests

| Option                                                     | Fit                                                                                                                                                                              | Effort                                     | Cost  | CI story                      | Gotchas                                                                                                                                                                                                                                                                                      |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | ----- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vitest 4.1.10 with `@nuxt/test-utils` 4.1.0** (current)  | Works today for `shared/utils`. #126 wants `environment: "nuxt"` for composables, stores and components.                                                                         | Low for the switch, medium for the suites. | Free. | Already in CI as `pnpm test`. | Nuxt environment boots Nuxt per file, so runtime grows. #126 asks to measure it. The unit suite still loads `nuxt.config.ts`, which imports `server/utils/env.ts`, so **unit tests need env vars set** (CI already provides them as secrets). Ran on `node` today, which needs no Nuxt boot. |
| **Upgrade to Vitest 5.0.5**                                | Same role, newer.                                                                                                                                                                | Medium.                                    | Free. | Same.                         | Breaking items in section "Gaps": `clearMocks` default, Node 22.12+, Vite 6.4+, removed entry points. Upgrade alone, separate from the redesign.                                                                                                                                             |
| **`@nuxt/test-utils` `mountSuspended`**                    | Mounts components in the Nuxt environment, with async setup and plugin injection. Options `route` and `spy` ([Nuxt testing](https://nuxt.com/docs/4.x/getting-started/testing)). | Low.                                       | Free. | As above.                     | Keep Nuxt-env and e2e files separated by `include` globs, not comments.                                                                                                                                                                                                                      |
| **Plain `@vue/test-utils` with `happy-dom`** (no Nuxt env) | Lighter for pure components that do not use auto-imports.                                                                                                                        | Low.                                       | Free. | Fast.                         | Nuxt auto-imports (`useRoute`, `useRuntimeConfig`) are missing, so anything depending on them needs stubs.                                                                                                                                                                                   |

Server-side unit tests (#126 asks for query and handler tests with no live DB): the handlers use the Neon `db` singleton, so they need a seam (mock the `db` module, or inject it). That is a design question for the redesign, not a tooling one. **Not researched further.**

Setup note from the Nuxt docs: the Nuxt environment is configured with `defineVitestProject` inside `defineConfig` from `vitest/config`, with options under `environmentOptions.nuxt` (`domEnvironment` defaults to `happy-dom`, `intersectionObserver` mock defaults on, `indexedDb` off) ([Nuxt testing](https://nuxt.com/docs/4.x/getting-started/testing)). The current `defineVitestConfig` helper in this repo works with 4.x, but the docs page shows the newer form. **Verify before changing.**

---

## 4. E2E tests (Playwright, Nuxt test-utils, auth, Postgres)

### Tooling

| Option                                                                                                             | Fit                                                                                                                                                                                                                                                                                            | Effort  | Cost  | CI story                                                                                   | Gotchas                                                   |
| ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ----- | ------------------------------------------------------------------------------------------ | --------------------------------------------------------- |
| **Playwright** via `@playwright/test` 1.64.1 and `@nuxt/test-utils/playwright` (or `setup()` with `browser: true`) | Standard choice. `setup()` options: `build` (default true), `server` (default true), `host` (targets an existing deployment, e.g. a Vercel preview), `browser` (default false), `setupTimeout` 120000 (240000 on Windows) ([Nuxt testing](https://nuxt.com/docs/4.x/getting-started/testing)). | Medium. | Free. | Easy in the ubuntu job, with `playwright install --with-deps chromium` (**not verified**). | Windows setup timeout is longer by design.                |
| **Cypress** (named in #127)                                                                                        | Named by the owner. **Not researched in this run.**                                                                                                                                                                                                                                            | —       | —     | —                                                                                          | Conflicts with Playwright-leaning options; owner decides. |
| **Vitest browser mode** (`@vitest/browser-playwright`, used by `@storybook/addon-vitest`)                          | Possible for component-level e2e; the Nuxt docs point to `@nuxt/test-utils/browser` ([Nuxt testing](https://nuxt.com/docs/4.x/getting-started/testing)).                                                                                                                                       | Medium. | Free. | Same job.                                                                                  | Newer path; less documented for full flows.               |

### Auth (Better Auth)

**Recommended pattern (matches #127's "seed a session, don't drive Discord OAuth").** Better Auth's [Test Utils plugin](https://better-auth.com/docs/plugins/test-utils) (v1.6 docs; a v1.8 beta page exists):

- Keep `testUtils()` out of the production auth config. Add it from a separate test-only auth instance.
- Reach it through `auth.$context`, then `ctx.test`.
- `test.login({ userId })` creates a session and returns `cookies`.
- `test.getCookies({ userId })` returns Playwright-ready cookies; use `context.addCookies(cookies)`. The session cookie is `better-auth.session_token`.
- Keep `testUtils()` in a static `plugins` array (conditional spread breaks TypeScript inference).
- `captureOTP: true` for OTP flows (not needed here).

**Gotchas.** The test-only auth instance must share the test database. Against a Vercel preview, the seeding must write to the database the preview uses; the test-utils plugin cannot be included in the deployed preview. Setting a deployed preview's test user needs a separate path (a seeding script that hits the preview's DB, or an admin route). **Not designed in this run.**

### Postgres

- The app's `server/db/index.ts` uses **`@neondatabase/serverless`** `Pool` with `drizzle-orm/neon-serverless`. The Neon serverless driver does not talk to plain Postgres. Its docs say plain Postgres needs a Neon-compatible proxy in between, and point to a community local setup (`TimoWilhelm/local-neon-http-proxy` in a Docker Compose file) ([Neon serverless driver](https://neon.com/docs/serverless/serverless-driver); [Neon local development guide](https://neon.com/guides/local-development-with-neon), community Docker image, **not verified**).
- So #127's "local Postgres in Docker" is not a direct fit for the current driver. Options: (a) run the Neon proxy in Docker Compose (extra service, third-party image), (b) point e2e at a separate Neon test branch (not local, and still a network dependency), or (c) switch the driver for tests only (changes runtime behaviour in tests; ADR-0001 says behaviour stays fixed, so this needs a ticket). **Decision for the owner.**
- Neon branching for Vercel previews is a plausible way to give each preview its own DB, not verified in this run.
- `.env.test` already exists with a `postgres://` URL, but nothing reads it.

### Vercel previews (ADR-0002: manual QA runs on previews)

- Vercel's [Protection Bypass for Automation](https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/protection-bypass-automation) is available on **all plans**. Playwright sets `x-vercel-protection-bypass: $VERCEL_AUTOMATION_BYPASS_SECRET` in `extraHTTPHeaders`, and optionally `x-vercel-set-bypass-cookie: true` for in-browser follow-up requests.
- With `setup({ host })` or `baseURL` pointed at a preview, e2e can run against the preview's own deploy. The secret must be a CI secret, and the preview's env must carry the same Better Auth config.
- Sign-in on previews: Discord OAuth redirects must allow the preview domain. Not checked in this run.

### CI

- The current job has no browser, no Postgres service, and runs `pnpm test` (unit only). Adding e2e means a second job or a step with `services: postgres` (if the driver question is settled) and a Playwright browser install.
- 127 asks for CI e2e on every PR with Postgres as a service container and the four-places env rule (`.env.example`, `server/utils/env.ts`, `ci.yml` env, secrets, README; Vercel if relevant).

---

## Open trade-offs for the decision tickets

### For #178 "How to test visual work"

- **Where screenshots are taken.** Chromatic or Argos (rendering off-machine, no OS baselines, free tier with limits) versus Playwright `toHaveScreenshot` (free, but baselines are OS-specific and must come from a pinned Docker image, so Windows devs cannot update them locally without Docker). A split is possible: Chromatic for component states, Playwright for pages.
- **Free-tier fit.** Chromatic free is 5,000 snapshots/month; Argos Hobby is personal repos only. Count stories x light/dark x reduced motion x viewports to see if the free tier survives the redesign. The repo is personal (confirmed by the maintainer, 2026-10-15), so Argos Hobby applies.
- **Light, dark and reduced motion** need the attribute (`data-theme`, `data-motion`) set, not just the OS preference emulated. Decide once for both tools.
- **Leading option (not binding):** Storybook stories for component states, with Chromatic free for their visual diffs (no local baselines, works on Windows), and Playwright screenshots on Vercel previews later for pages. This is the cheapest path that avoids baseline management. The Playwright-only path is also viable if the owner accepts Docker for baselines.
- **Storybook vs Histoire.** Histoire's own peer ranges exclude Nuxt 4 and Vite 8, so the real choice is Storybook (`@nuxtjs/storybook` or plain `@storybook/vue3-vite`). Needs a spike for Nuxt auto-imports and Tailwind 4.
- **Vitest browser mode `toMatchScreenshot`** would avoid a second runner. Not evaluated in depth.
- **#119's acceptance** needs rewriting: it names the daisyUI theme, and the redesign replaces it.

### For #179 "What safety net lands before R0"

- **Dependency update (#146) before R0 or after?** Gaps that touch the test setup: Vitest 5 (major), TypeScript 7 (major, `vue-tsc` compatibility unverified), `@types/node` 26 (Node policy), `@nuxt/fonts` 1.0 (major, unverified), Nuxt 4.6 (Node range and h3 helper changes). The most cautious order is: nuxt 4.6 and Node policy first, then Vitest 5, then TypeScript 7 as its own ticket.
- **Node policy.** Nuxt 4.6 needs Node `^24.15.0` (or 22.22.3+ / 26+). `engines` says `^24.11.0`, and `.nvmrc` is `24`. A 24.11 developer machine would fail the install check.
- **Which unit tests go in before R0.** The current five `shared/utils` suites are safe. #126's Nuxt environment and component tests are not needed before R0 but make the R0 plumbing (theme, dialect, motion) testable.
- **E2E before R0 or after?** A safety net for behaviour (ADR-0001) has to exist before R0 deletes daisyUI, otherwise nothing checks that flows still work. That argues for an e2e smoke set (sign-in via seeded session, create/start/win/complete, share link) before R0. Its Postgres question (Neon driver vs local) has to be settled first.
- **Cypress or Playwright** (#127 names Cypress). Playwright is the tool this research evaluated in depth. The owner decides.
- **Postgres for e2e.** Options: Neon proxy in Docker Compose, a Neon test branch, or a driver swap for tests (behaviour risk, needs a ticket). Decide before writing e2e CI.
- **Preview-based e2e.** Requires `VERCEL_AUTOMATION_BYPASS_SECRET` as a CI secret, the preview DB, and Discord redirect allow-listing for preview domains. Not checked on the Vercel project.
- **Tailwind I1 check** is cheap and can go into R0: a browser test that `bg-surface` resolves to the token value under light and dark. The compile probe above says it should pass.

---

## Could not verify

- Playwright `reducedMotion` option and `animations`/`caret` options (not in the fetched docs).
- Percy pricing and features (not researched).
- Cypress (named in #127, not researched).
- `@nuxtjs/storybook` against this app (Nuxt 4.5.1, Tailwind 4.3.3, auto-imports).
- TypeScript 7 with `vue-tsc` and `nuxt typecheck`.
- `@nuxt/fonts` 1.0 migration notes.
- `better-auth` 1.7 migration notes.
- Chromatic free tier TurboSnap and overage (the free column does not list them; Starter overage is stated).
- Lost Pixel status beyond the stale npm package.
- Argos open-source terms.
- Vercel project settings, `vercel.json` and Discord redirect configuration (not read).
- Vitest browser-mode screenshot behaviour in practice.
- Neon local proxy images (community, not checked).

## Sources

- Nuxt testing (4.x): https://nuxt.com/docs/4.x/getting-started/testing
- Nuxt 4.6 release notes: https://nuxt.com/blog/v4-6
- Nuxt blog index (4.5, 4.4, 4.x dates): https://nuxt.com/blog
- Storybook Vue 3 + Vite (10.6): https://storybook.js.org/docs/get-started/frameworks/vue3-vite
- Storybook addon-vitest and Chromatic addon versions, peers: npm registry, `@storybook/addon-vitest` 10.6.2, `@chromatic-com/storybook` 5.5.1
- `@nuxtjs/storybook` 10.0.1 (npm): https://www.npmjs.com/package/@nuxtjs/storybook
- Histoire 1.0.0-beta.1 and `@histoire/plugin-nuxt` 1.0.0-beta.1 peers (npm registry)
- Playwright snapshots: https://playwright.dev/docs/test-snapshots
- Playwright Docker: https://playwright.dev/docs/docker
- Playwright emulation: https://playwright.dev/docs/emulation
- Playwright 1.64.1 (npm registry)
- Chromatic pricing: https://www.chromatic.com/pricing
- Argos pricing: https://www.argos-ci.com/pricing
- `@argos-ci/playwright` 7.7.1 (npm registry)
- Lost Pixel `lost-pixel` 3.22.0 (npm registry; last modified 2024-11-14)
- Vitest 5 migration: https://vitest.dev/guide/migration
- Better Auth Test Utils (v1.6 docs): https://better-auth.com/docs/plugins/test-utils
- Neon serverless driver: https://neon.com/docs/serverless/serverless-driver
- Neon local development: https://neon.com/guides/local-development-with-neon
- Vercel Protection Bypass for Automation: https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/protection-bypass-automation
- Tailwind v4 `@theme` docs: https://tailwindcss.com/docs/theme
- CSS Cascade Level 5, cascade layers: https://www.w3.org/TR/css-cascade-5/#cascade-layers (not fetched in this run)
- Installed `tailwindcss` 4.3.3 compiler, probed locally from `node_modules`.
- Repo files: `package.json`, `vitest.config.ts`, `nuxt.config.ts`, `.github/workflows/ci.yml`, `.husky/pre-commit`, `.lintstagedrc.json`, `.env.test`, `server/db/index.ts`, `shared/utils/*.test.ts`, `docs/adr/0001-*.md`, `docs/adr/0002-*.md`, `docs/design_handoff_winnies/02-tokens.md`, `docs/design_handoff_winnies/08-open-questions.md`.
- GitHub issues (read-only `gh issue view`): #166, #168, #119, #126, #127, #146.
