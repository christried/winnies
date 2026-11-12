# Winnies

Track gaming challenges. A **Winnie** is a named list of challenges — each challenge has
its own stopwatch, and the Winnie has one total timer over all of them. It completes when
every challenge is won. Sign in with Discord; share any Winnie read-only through a permanent
link.

**Live:** [winnies.christried.me](https://winnies.christried.me/)

## Stack

Nuxt 4 · Vue 3 · TypeScript · Tailwind 4 · Drizzle ORM + Neon Postgres ·
Better Auth (Discord) · Pinia · Vitest. Deployed on Vercel.

## Running locally

Requires Node 24.15 or newer in the 24 line (see `.nvmrc`) and pnpm 11 via Corepack.

```bash
corepack enable
cp .env.example .env
pnpm install
pnpm db:migrate
pnpm dev
```

### Environment variables

Each variable lives in four places: `.env.example`, the Zod schema in
[`server/utils/env.ts`](server/utils/env.ts), the `env:` block in
[`.github/workflows/ci.yml`](.github/workflows/ci.yml) plus the repository secrets behind it and
your hosting provider (Vercel in my case).

The one exception is `TEST_DATABASE_URL`, which only the API and e2e tests read. It is validated by the
test harness's own schema in [`tests/support/env.ts`](tests/support/env.ts) (the app's schema runs
at every build, and the app never needs it). It lives in `.env.example`, `.env.test` and every CI job
that runs a suite, which are the `api-tests` and `e2e` jobs, with a different host in each: `localhost`
in `api-tests`, `neon-proxy` (the service's name) in `e2e`, which runs in a container. It is never set
on the hosting provider.

`WINNIES_STAGE` is the second exception. It is a build-time switch read by [`stage.ts`](stage.ts), not a
variable the app validates or reads at run time: set to `staging` it makes a local `pnpm build` carry the
dev sign-in like the staging build does. It lives only in `.env.example` (commented out) and in a
developer's `.env`, never in `env.ts`, CI or Vercel: a Vercel build goes by its branch and ignores it, so
no dashboard variable can turn production into staging.

`VERCEL_AUTOMATION_BYPASS_SECRET` is the third exception. Only [`scripts/shots.mjs`](scripts/shots.mjs) reads
it (from the environment, else from `.env`), to get through Vercel login on staging. It is not in `env.ts`, CI
or the hosting provider's build environment, because it is the project's Protection Bypass setting and not the
app's. It lives in `.env.example` (commented out) and in the main checkout's `.env`.

The other values the tests need (`HARNESS_ENV` in `tests/support/env.ts`) are repeated in those two jobs,
and `scripts/harness-sync.test.mjs` fails `pnpm test` when the copies, the service images or
`compose.test.yaml` disagree.

## Scripts

`pnpm dev` · `pnpm build` · `pnpm lint` · `pnpm typecheck` · `pnpm test` · `pnpm test:api` ·
`pnpm test:build` · `pnpm test:e2e` · `pnpm test:db:up` · `pnpm test:db:down` · `pnpm db:generate` ·
`pnpm db:migrate` · `pnpm db:studio` · `pnpm favicons:stage` · `pnpm storybook` · `pnpm build-storybook` ·
`pnpm test:visual:podman`

`pnpm favicons:stage` regenerates `public/staging/` from `public/`; `scripts/favicon-tint.test.mjs` fails `pnpm test`
when a committed copy differs (the rule is in `scripts/favicon-tint.mjs`). After a handoff re-sync, run
`pnpm strip:metadata`: a design export carries a C2PA manifest that `scripts/attribution.mjs` refuses.

`pnpm storybook` serves Storybook on <http://localhost:6006>, for local use only; it is never deployed.
It loads the app's own `app/assets/css/main.css`, so the stories see the real token file, the Tailwind entry and the
self-hosted fonts. The toolbar sets the three switches as the app does: theme (`data-theme` on `<html>`), dialect
(`data-dialect` on `<body>`, none for Workspace) and reduced motion (`data-motion="reduce"` on `<html>`). Stories are
plain `.stories.ts` files in `stories/`; the config is in `.storybook/`. The addon-a11y panel runs axe on a story;
the check that fails on a violation is the `visual` job (`pnpm test:visual`, see § Tests): it runs axe on every story
and fails on one (`a11y.test` is `"error"`). `pnpm build-storybook` builds the static Storybook, which only proves every
story compiles.

CI runs lint, typecheck, the Storybook build, test, build and the build test (the `check` job), the API tests (the
`api-tests` job), the browser tests (the `e2e` job) and the screenshot tests (the `visual` job) on every pull request.

## Tests

- `pnpm test` runs the unit tests. No database needed.
- `pnpm build`, then `pnpm test:build`: fails if the production build carries `/api/dev/sign-in` (ADR-0005).
  It reads `.output`, so it needs the build first; CI runs it after `pnpm build`.
- The API tests build the app, start it, and call it over HTTP, signed in as a throwaway Owner,
  against a local Postgres that they empty on every run:
  1. Install [Podman](https://podman.io) with its compose provider (`winget install RedHat.Podman`,
     then `podman machine init` and `podman machine start`). Podman is the prerequisite, Docker is not used.
  2. Create `.env.test` (git-ignored) with the `TEST_DATABASE_URL` line from `.env.example`. The
     other values the tests need are committed in `tests/support/env.ts`.
     In an agent worktree this step does not apply: Claude Code copies `.env.test` into it from the
     main checkout (`.worktreeinclude`). A worktree made another way gets no copy and needs one by hand.
  3. `pnpm test:db:up` starts the test database, `pnpm test:api` runs the tests,
     `pnpm test:db:down` removes the database again. The compose project is named `winnies-test`, so
     `up` and `down` act on the same database from every checkout and worktree. `test:db:down` therefore
     stops it for every checkout, also under another checkout's run in progress: run it only when no run is going.
- The database is two containers: Postgres and a WebSocket proxy in front of it, because the Neon
  driver the app uses only speaks WebSocket. The image and the reason for it are written at the top
  of [`compose.test.yaml`](compose.test.yaml); CI uses the same images as `services:`.
- The app's database setup is untouched. A test-only file (`tests/support/neon-local.mjs`) points the
  Neon driver at the proxy, inside the test server process and the test process only.
- `pnpm test:api` and `pnpm test:e2e` build into `.nuxt/test/` (not `.output`) and remove that build afterwards.
- The e2e tests drive the same built server in a real browser with [Playwright](https://playwright.dev),
  signed in as a throwaway Owner. Same setup as the API tests (the database, `.env.test`), plus once
  per machine `pnpm exec playwright install chromium`. Then `pnpm test:e2e` runs them, natively on
  Windows. Spec files are `tests/e2e/*.spec.ts`; read the header of `tests/e2e/fixtures.ts` before adding one.
  - `pnpm test:api` and `pnpm test:e2e` share the build, the database and the run lock, so two runs
    (yours, or another person's) queue behind each other, for up to 30 minutes.
  - A failed test leaves its trace in `test-results/`: `pnpm exec playwright show-trace <trace.zip>`.
    In CI the `e2e` job uploads `playwright-report/` and `test-results/` as the `playwright-report` artifact.
  - CI runs the e2e tests in the `mcr.microsoft.com/playwright:v<X.Y.Z>-noble` image
    (ADR-0004), and the screenshot tests run in the same image (the `visual` job). The image tags and
    `@playwright/test` in `package.json` move together: `scripts/playwright-pin.test.mjs` fails `pnpm test` when one differs.
- The screenshot tests render every token story in Storybook, run axe on it and compare it with a committed baseline,
  pixel for pixel. They run inside the pinned Playwright image only: Windows rasterizes fonts differently, so a baseline
  made on a bare machine never matches CI (ADR-0004). `pnpm test:visual:podman` runs them there under Podman.
  - Prerequisite: Podman, as for the API tests (`podman machine start`). The first run pulls the image
    (`mcr.microsoft.com/playwright:v<X.Y.Z>-noble`, about 2 GB) and installs the dependencies inside the container,
    which takes minutes; later runs reuse them.
  - The repo is mounted into the container. The Linux `node_modules` live in a named Podman volume
    (`winnies-visual-node-modules-<hash of the checkout path>`) and the pnpm store in `winnies-visual-pnpm-store`; the
    Windows `node_modules` are never visible there. `podman volume rm` frees them.
  - `pnpm test:visual:podman --update` regenerates the baselines in `stories/__screenshots__/<variant>/`. Commit them
    with the change that moved them: the PR shows each as an image diff, and that is the review. Arguments after the
    flags go to Vitest (`--project workspace-dark`).
  - `pnpm test:visual` and `pnpm test:visual:update` are what runs inside the image; run on the host they refuse
    to start (`scripts/visual-env.mjs`), so a baseline can only come from the container.
  - A story with no baseline fails the run (`CI=true`, which the Podman script and the `visual` job set); it does not
    write one. Tolerance is zero.
  - A failed comparison leaves the new picture and a diff image in `.vitest/attachments/`. In CI the `visual` job
    uploads that directory as the `visual-diffs` artifact.
- The one flow automation cannot cover, signing in with Discord, is checked by hand before a release:
  [`docs/release-checklist.md`](docs/release-checklist.md).

## Deployment

Only `main` and `redesign` build on Vercel ([`vercel.json`](vercel.json), ADR-0005). A push to any
other branch creates no deployment, and a pull request into `redesign` gets no preview: a ticket is
checked on staging after its merge.

| Branch     | Served at                                                  | Database                                                 |
| ---------- | ---------------------------------------------------------- | -------------------------------------------------------- |
| `redesign` | https://staging.winnies.christried.me, behind Vercel login | Neon `staging` branch, database `winnies_staging`        |
| `main`     | https://winnies.christried.me                              | Neon `production` branch, the project's primary database |

The Vercel build command is `pnpm db:migrate && pnpm build`: each deploy first applies the committed
migrations in `server/db/migrations/` to that environment's `DATABASE_URL`. drizzle-kit runs all pending
migrations in one transaction. If one fails, nothing is applied, the build fails, and the previous
deployment keeps serving. Fix forward with a new migration; never edit a migration that has already run
on staging.

`vercel.json` reaches `main` with 1.0.0 (ADR-0002). Until then `main`, and any branch cut from it for a
hotfix, builds as before: `nuxt build`, no migration.

## License

Source-available, all rights reserved — see [LICENSE.md](LICENSE.md). Contributions are
welcome; reuse needs permission.
