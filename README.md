# wintool

A gaming win-challenge tracker.

## Built with

- Node 22 (see `.nvmrc`)
- pnpm 11.10.0
- Nuxt 4.5.1

## Setup

    corepack enable
    pnpm install
    pnpm dev

`pnpm install` also installs the git hooks, via the `prepare` script.

## Pre-commit gate

Every commit runs, in order:

1. `pnpm lint-staged` — ESLint with `--fix` over the staged files only. Fixes are re-staged, so
   they land in the same commit.
2. `pnpm typecheck` — `nuxt typecheck` over the whole project. It cannot be scoped to staged
   files, because a type error usually surfaces in a different file from the change that caused
   it.

Either step failing aborts the commit.

**Cost: about 7 seconds**, nearly all of it the typecheck. That is a deliberate trade — slow
enough to notice, fast enough not to reach for `--no-verify`. If it grows past roughly ten
seconds, move `pnpm typecheck` out of `.husky/pre-commit` into a `.husky/pre-push` hook and let
CI be the backstop. Change this note when you change the gate.

> Typecheck only sees files inside a Nuxt tsconfig project — `app/`, `server/`, `shared/`, and
> the config files. A stray `.ts` at the repo root is not typechecked at all.
