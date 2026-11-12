# Winnies

Track gaming challenges. A **Winnie** is a named list of challenges — each challenge has
its own stopwatch, and the Winnie has one total timer over all of them. It completes when
every challenge is won. Sign in with Discord; share any Winnie read-only through a permanent
link.

**Live:** [winnies.christried.me](https://winnies.christried.me/)

## Stack

Nuxt 4 · Vue 3 · TypeScript · Tailwind 4 + daisyUI · Drizzle ORM + Neon Postgres ·
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

`WINNIES_CHROMIUM` is the fourth exception: the path of a Chromium for the browser tests and
[`scripts/shots.mjs`](scripts/shots.mjs) to start, for a machine that brings its own instead of the one
`pnpm exec playwright install chromium` downloads. Unset everywhere but in a cloud session's environment
([`docs/agents/cloud.md`](docs/agents/cloud.md)); it lives in `.env.example` (commented out) and nowhere else.

The other values the tests need (`HARNESS_ENV` in `tests/support/env.ts`) are repeated in those two jobs,
and `scripts/harness-sync.test.mjs` fails `pnpm test` when the copies, the service images or
`compose.test.yaml` disagree.

## Scripts

`pnpm dev` · `pnpm build` · `pnpm lint` · `pnpm typecheck` · `pnpm test` · `pnpm test:api` ·
`pnpm test:build` · `pnpm test:e2e` · `pnpm test:db:up` · `pnpm test:db:down` · `pnpm db:generate` ·
`pnpm db:migrate` · `pnpm db:studio`

CI runs lint, typecheck, test, build and the build test (the `check` job), the API tests (the `api-tests` job) and
the browser tests (the `e2e` job) on every pull request.

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
    (ADR-0004). The image tag and `@playwright/test` in `package.json` move together:
    `scripts/playwright-pin.test.mjs` fails `pnpm test` when they differ.
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
