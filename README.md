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

## Scripts

`pnpm dev` · `pnpm build` · `pnpm lint` · `pnpm typecheck` · `pnpm test` ·
`pnpm db:generate` · `pnpm db:migrate` · `pnpm db:studio`

CI runs lint, typecheck, test and build on every pull request.

## License

Source-available, all rights reserved — see [LICENSE.md](LICENSE.md). Contributions are
welcome; reuse needs permission.
