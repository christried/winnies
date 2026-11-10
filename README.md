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

Requires Node 24 (see `.nvmrc`) and pnpm 11 via Corepack.

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

The one exception is `TEST_DATABASE_URL`, which only the API tests read. It is validated by the
test harness's own schema in [`tests/support/env.ts`](tests/support/env.ts) (the app's schema runs
at every build, and the app never needs it), lives in `.env.example`, `.env.test` and the `api-tests`
job of the CI workflow, and is never set on the hosting provider.

## Scripts

`pnpm dev` · `pnpm build` · `pnpm lint` · `pnpm typecheck` · `pnpm test` · `pnpm test:api` ·
`pnpm test:e2e` · `pnpm test:db:up` · `pnpm test:db:down` · `pnpm db:generate` · `pnpm db:migrate` ·
`pnpm db:studio`

CI runs lint, typecheck, test and build (the `check` job), the API tests (the `api-tests` job) and
the browser tests (the `e2e` job) on every pull request.

## Tests

- `pnpm test` runs the unit tests. No database needed.
- The API tests build the app, start it, and call it over HTTP, signed in as a throwaway Owner,
  against a local Postgres that they empty on every run:
  1. Install [Podman](https://podman.io) with its compose provider (`winget install RedHat.Podman`,
     then `podman machine init` and `podman machine start`). Podman is the prerequisite, Docker is not used.
  2. Create `.env.test` (git-ignored) with the `TEST_DATABASE_URL` line from `.env.example`. The
     other values the tests need are committed in `tests/support/env.ts`.
  3. `pnpm test:db:up` starts the test database, `pnpm test:api` runs the tests,
     `pnpm test:db:down` removes the database again.
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

## License

Source-available, all rights reserved — see [LICENSE.md](LICENSE.md). Contributions are
welcome; reuse needs permission.
