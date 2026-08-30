# wintool

A gaming Winnie tracker.

## Built with

- Node 24
- pnpm 11.10.0
- Nuxt 4.5.1

## Setup

    corepack enable
    pnpm install
    pnpm dev

Copy `.env.example` to `.env` and fill it in. `pnpm test` reads `.env.test` instead, which needs
the same keys with any values that pass validation.

## Authentication

Discord OAuth through Better Auth, using **two Discord applications** — one for local development,
one for production. A single application holding both redirect URIs would let a local build
authenticate against the production identity.

| Application | Redirect URI                                            | `BETTER_AUTH_URL`             |
| ----------- | ------------------------------------------------------- | ----------------------------- |
| dev         | `http://localhost:3000/api/auth/callback/discord`       | `http://localhost:3000`       |
| prod        | `https://<production-domain>/api/auth/callback/discord` | `https://<production-domain>` |

`BETTER_AUTH_URL` is the origin only. Better Auth appends the callback path itself, and Discord
compares the result as an exact string — a trailing slash or `127.0.0.1` in place of `localhost`
is a different URI.

**Preview deployments cannot sign in.** Every Vercel preview gets a different hostname and Discord
requires redirect URIs registered up front, so there is nothing to register. Known limitation, not
a bug.
