# Release checklist

Steps a release or a dependency update runs by hand, because no test can: only the human can sign in
with Discord. Everything automation can check (lint, typecheck, unit, API and e2e tests) is in CI and
is not repeated here.

## Production's migration record (before the 1.0.0 merge)

Read only, before the human merges `redesign` into `main`. From 1.0.0 on, `main` builds with `vercel.json`'s
`pnpm db:migrate && pnpm build`, so the first production deploy of 1.0.0 runs `drizzle-kit migrate` against
production's database (Neon branch `production`). Until then `main` builds with `nuxt build` and no migration (#233).

Production's migration record, the table `drizzle.__drizzle_migrations`, must match `server/db/migrations/`: one row
per migration already applied, with the same hash. A schema pushed or migrated by hand without a record makes the
build run those migrations again, and a failed migration fails the deploy while the previous deployment keeps serving
(`docs/agents/delivery.md` § Database migrations). No agent holds a database credential, so who reads it is settled
when the Release phase starts. Recorded on #211 when #233 merged.

## Required checks on `main` (1.0.0)

Run after the 1.0.0 merge of `redesign` into `main`, once the `visual` job has run green on `main`. Branch protection
is the human's (`docs/agents/delivery.md`): an agent hands over this line with a `!` in front of it and does not run it.

```
gh api --method PATCH repos/christried/winnies/branches/main/protection/required_status_checks -F strict=true -f 'contexts[]=check' -f 'contexts[]=attribution' -f 'contexts[]=api-tests' -f 'contexts[]=e2e' -f 'contexts[]=visual'
```

It keeps the four checks `main` requires today, keeps `strict`, and adds `visual`. Not before the job has run there:
the `visual` job does not exist on `main` until 1.0.0, and a required check that never runs blocks every hotfix.

## No Storybook on production (1.0.0)

After the 1.0.0 merge, `GET https://winnies.christried.me/storybook/` answers 404: only the non-production build
carries Storybook (#298, ADR-0005).

## Discord sign-in and sign-out

The tests sign in through a test-only helper that never talks to Discord, so the real OAuth round trip
is only ever exercised here. Run it against the deployment being released: production, or staging,
the Vercel deployment of `redesign` (ADR-0005). Staging sits behind Vercel login, so log in to Vercel
first; its tab reads "Winnies Staging".

1. Open the deployment signed out, at `/`.
   Expect the Workspace with the "Sign in with Discord" button and no "Create new Winnie" button.
2. Click "Sign in with Discord" and approve on Discord.
   Expect to be sent back to the deployment, not left on a Discord or error page.
3. Expect to land on `/` signed in: the "Create new Winnie" button, and your avatar or initials where
   the sign-in button was.
4. Open the account menu ("Account Menu").
   Expect it to read "Logged in as" followed by your Discord name.
5. Reload the page.
   Expect to still be signed in.
6. Choose "Log out" in the account menu.
   Expect to be back on `/` signed out, with "Sign in with Discord".
7. Reload the page, then open `/api/winnies`.
   Expect to still be signed out, and the API to answer 401.
