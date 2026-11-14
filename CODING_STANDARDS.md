# Coding standards

What the Standards review checks in Winnies, on top of `GLOSSARY.md`, the ADRs and `docs/agents/`. Rules a tool can check live in `eslint.config.mjs`, the tests and the hooks; this file holds the judgement calls. A `/retro` adds to it, and each rule names where it comes from.

## Behaviour

- Behaviour stays as it is unless a ticket says otherwise (ADR-0001). The redesign replaces the visual layer only.
- A Safety net test that goes red without such a ticket is a regression: fix the code, not the test. A ticket that changes pinned behaviour on purpose updates its test in the same PR and names the change (#195, stories 46 and 47).
- A flaky test is fixed or deleted, never retried until green, so a red check always means something (#195, story 15).

## Tests

- A test asserts what an Owner, a Viewer or the API can observe, never internals. It may swap infrastructure for the test's own (the app's `server/db` for the test database, the clock), never the logic under test (the human, 2026-11-11, on #251's `vi.mock("../../server/db")`).
- Code that keeps a credential, a destructive action or a production build in bounds lives in a pure module with its own test, written in the PR that adds the guard: the split of `scripts/worktree-verdict.mjs` from `worktree-clean.mjs`. (The Before R0 review found four such guards untested: the browser helper's origin and secret checks, the dev sign-in's query rules, the dummy set's reset, the cleanup script's flags; #251.)
- A `ui/` component reaches a Nuxt-only global only with a stub in `.storybook/nuxt/` in the same PR, with a case in `scripts/storybook-nuxt.test.mjs`: Storybook renders components without the Nuxt app, so an unstubbed global fails the component's own story (#307).
- A helper a second test file needs moves into the shared test module in the PR that needs it twice, so a copy never merges: `tests/api/helpers.ts` for the API tests, `tests/support/` for a helper both suites need (it also holds the unit tests' fakes: the motion engine's fake element, #299), `tests/e2e/support/` for one only the e2e suite needs (the Safety net review, #206).

## Layout

- Desktop is the designed and verified target. Every surface must not break on a phone: no horizontal scroll, nothing unreachable. This is standing, so tickets carry no mobile criteria of their own (`docs/agents/tickets.md`).

## Design

- The look comes from `docs/design_handoff_winnies/` (ADR-0001). Sizes, colours, easings and copy are taken from it, not estimated.
- A screen, state, component variant, illustration, icon or Winniebert pose the handoff doesn't cover is a finding when the diff improvised it without the flag `docs/agents/design-handoff.md` asks for. The human decides case by case what goes back to Claude Design (the human, 2026-10-15).
- A surface speaks its dialect through `useDialect` where its layout or page is defined (`null` for none). A surface with no call is a finding in review; the e2e file pins each surface that exists (`tests/e2e/dialect.spec.ts`).
- The app's copy of a handoff file equals the handoff's (`scripts/handoff-sync.test.mjs`). A deliberate difference goes in a `winnies:deviation #<issue>` block in the copy, with an entry in `docs/design-deviations.md` that names the issue and says what the handoff needs to take it in, so the block can go (the first case is #268). (`docs/reviews/review_r0_2026-11-12.md`, Standards 3.)
- A text button is `UiButton`, an icon-only one `UiIconButton` (its `label` is the accessible name). A menu trigger is one of them; a menu item is neither.
- An icon is `UiIcon` with a name from `MATERIAL_ICON_NAMES`. A new one is its four handoff cuts copied into `app/assets/icons/`, its name added to the tuple, and the `ui-icon-default` baselines redrawn. A tabler icon stays `UiTablerIcon` until R3 (#308).

## Motion

- Every animation is a recipe of the motion engine, under its name in `docs/design_handoff_winnies/04-motion-and-sound.md`. No animation library, no `<TransitionGroup>` for list moves (ADR-0003).
- Two exceptions to the rule above, both decided by the human on 2026-11-13. Hover and press are CSS on the motion tokens, not recipes (#309, `ui/button.vue`): the jelly after a click is the recipe `m.release`. The switch knob's slide is the recipe `m.switchSlide`, which has no moment in `04-motion-and-sound.md`: the reference CSS's timing (`--dur-fast`, `--ease-spring`) on `transform` (#316).
- The server renders the reduced-motion end state, and `prefers-reduced-motion` turns all animation off (ADR-0001, ADR-0003).
- A component reaches its surface's engine through `useWinniesMotion()`, never `createMotionEngine`; a layout calls `provideWinniesMotion()` and renders `<ParticleLayer />` (#300).
- Time on a surface comes from its clock: a component reads `useSurfaceClock()`, a layout the clock its own `provideSurfaceClock()` returned (a component cannot inject what it provides). No component keeps a `setInterval` or `Date.now()` of its own for a displayed time or a tab title, so every digit of a surface changes in the same frame (ADR-0003, #304).

## Copy

- UI copy uses the glossary's words: a Challenge is Won, a Winnie is Complete, the mascot is Winniebert (`GLOSSARY.md` § Flagged ambiguities).
- No copy anywhere (app, Landing, Changelog, link-preview cards) says "free", mentions pricing or says "beta". Winnies is free today; the human wants to stay able to change that without a broken promise (#187, 2026-10-16). Describing access is fine: "works without an account".

## Environment

- A new environment variable lives in the four places the README names (README § Environment variables), in the same PR.
