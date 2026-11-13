# Staging is the `redesign` deployment, and it carries a dev sign-in

Discord's OAuth needs a fixed redirect address and Better Auth trusts one origin, so a per-PR Vercel preview can't sign anyone in, which ADR-0002 assumed it could. `redesign` is therefore bound to `staging.winnies.christried.me` behind Vercel login, with a Neon branch and a `BETTER_AUTH_SECRET` of its own; only `main` and `redesign` build on Vercel, and the build runs the committed migrations first. Tickets are verified there. So that agents can check signed-in pages, the staging build and the dev server register a sign-in without Discord, and no production build carries it. The shape follows the Compies repository (its ADR 0007).

## Considered options

- **Make sign-in work on every PR preview.** Rejected: each preview has its own address, and all previews share one database.
- **A public staging.** Rejected: anyone could use the dev sign-in and see the redesign before 1.0.0.
- **Decide at run time, from an environment variable, whether the dev sign-in exists.** Rejected: one variable set in the Vercel dashboard would turn production into staging. The decision is taken at build time from what Vercel builds (a preview build of `redesign`), and a test on the production build's output fails when the route is in it.
- **One `BETTER_AUTH_SECRET` for staging and production.** Rejected: Better Auth's cookie cache trusts a signed session cookie without asking the database, so a session from the dev sign-in could be replayed against production.
- **A staging database branched from production.** Rejected: real Owners' Winnies would sit where a dev sign-in reaches them. Staging starts empty and holds dummy data.

## Consequences

- The test sign-in of the Safety net stays in test code only (#195, story 17). The dev sign-in is a second thing: it lives in the app, in builds that are not production.
- A PR into `redesign` gets no Vercel preview. A ticket is checked on staging after its merge.
- A non-production build also builds Storybook and serves it at `/storybook/`, behind the same Vercel login as staging; a test on the production build fails when it is there (#298, amending #178).
- Production runs migrations in its build from 1.0.0 on, when `redesign` merges into `main`.
- What staging tracks once `redesign` is gone is decided at the Release.
