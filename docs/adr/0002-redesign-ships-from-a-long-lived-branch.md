# The redesign ships from a long-lived branch as 1.0.0

The redesign (ADR-0001) is built on a long-lived `redesign` branch, one PR per ticket, and merges into `main` once as v1.0.0. Its first ticket deletes the old design, so it can't land piece by piece on a `main` that deploys to production, and ADR-0001 rules out running two design systems side by side. `main` stays frozen except for hotfixes, which are merged forward into `redesign`.

## Considered options

- **Land tickets on `main` behind a feature flag or separate route.** Rejected: it is the strangler setup ADR-0001 rejected, two design systems in one app.
- **Land on `main` and accept a broken production site for a while.** Rejected by ADR-0001.

## Consequences

- No user-facing release between 0.9.x and 1.0.0 except hotfixes. `CHANGELOG.md` gets one 1.0.0 entry at release.
- Manual QA runs on Vercel preview deploys of the ticket PRs, so sign-in must work on previews.
