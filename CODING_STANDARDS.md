# Coding standards

What the Standards review checks in Winnies, on top of `GLOSSARY.md`, the ADRs and `docs/agents/`. Rules a tool can check live in `eslint.config.mjs`, the tests and the hooks; this file holds the judgement calls. A `/retro` adds to it, and each rule names where it comes from.

## Behaviour

- Behaviour stays as it is unless a ticket says otherwise (ADR-0001). The redesign replaces the visual layer only.
- A Safety net test that goes red without such a ticket is a regression: fix the code, not the test. A ticket that changes pinned behaviour on purpose updates its test in the same PR and names the change (#195, stories 46 and 47).
- A flaky test is fixed or deleted, never retried until green, so a red check always means something (#195, story 15).

## Tests

- A helper a second test file needs moves into the shared test module in the PR that needs it twice, so a copy never merges: `tests/api/helpers.ts` for the API tests, `tests/support/` for a helper both suites need, `tests/e2e/support/` for one only the e2e suite needs (the Safety net review, #206).

## Layout

- Desktop is the designed and verified target. Every surface must not break on a phone: no horizontal scroll, nothing unreachable. This is standing, so tickets carry no mobile criteria of their own (`docs/agents/tickets.md`).

## Design

- The look comes from `docs/design_handoff_winnies/` (ADR-0001). Sizes, colours, easings and copy are taken from it, not estimated.
- A screen, state, component variant, illustration, icon or Winniebert pose the handoff doesn't cover is a finding when the diff improvised it without the flag `docs/agents/design-handoff.md` asks for. The human decides case by case what goes back to Claude Design (the human, 2026-10-15).

## Motion

- Every animation is a recipe of the motion engine, under its name in `docs/design_handoff_winnies/04-motion-and-sound.md`. No animation library, no `<TransitionGroup>` for list moves (ADR-0003).
- The server renders the reduced-motion end state, and `prefers-reduced-motion` turns all animation off (ADR-0001, ADR-0003).

## Copy

- UI copy uses the glossary's words: a Challenge is Won, a Winnie is Complete, the mascot is Winniebert (`GLOSSARY.md` § Flagged ambiguities).
- No copy anywhere (app, Landing, Changelog, link-preview cards) says "free", mentions pricing or says "beta". Winnies is free today; the human wants to stay able to change that without a broken promise (#187, 2026-10-16). Describing access is fine: "works without an account".

## Environment

- A new environment variable lives in the four places the README names (README § Environment variables), in the same PR.
