# Roadmap

What's being built and what comes next. Ideas that aren't grilled yet are Idea issues, not lines here (§ Ideas). Maintained by the planning agent as product manager; every change is approved by the maintainer. Last updated 2026-11-12.

Only **Now** has tickets. Everything else lives here until its turn, then becomes a batch of tickets under one milestone. Entries link the closed issue they came from ("was #125") and the handoff frames that design them (IDs from `docs/design_handoff_winnies/01-screen-index.md`).

## Now: Redesign 1.0

The whole visual layer rebuilt from `docs/design_handoff_winnies/` (Kawaii Clay). Behaviour stays as is unless a ticket says otherwise (ADR-0001). Built on the `redesign` branch, released as v1.0.0 (ADR-0002).

Every product question is decided in [Redesign 1.0: Core planning map](https://github.com/christried/winnies/issues/166) (closed); its Decisions so far list is the index specs and tickets link back to. Phases run one at a time, in table order, each through the same loop: `/to-spec` writes the phase's spec, `/to-tickets` cuts it into a batch under the phase's milestone, the batch is implemented (`/implement-spec`), reviewed, walked through and looked back on in a `/retro` (`docs/agents/delivery.md`), and only then does the next phase get its spec. No phase is specced or ticketed ahead of its turn.

One exception, decided by the human on 2026-11-12 (#281): R1 Engine and R2 Primitives are grilled, specced and ticketed while R0's walk-through and retro run. R2 is grilled alongside R1 only where it makes sense before R1 is finished. Two orchestrators then implement the two phases in parallel, each on its own integration branch (`CLAUDE.md` § Other sessions). The exception covers R1 and R2 only: R3 and later follow the loop above.

A second, narrower exception, decided by the human on 2026-11-12 (#326): R3's behaviour questions, the ones R1 and R2 cannot change, are grilled while R1 and R2 are implemented. The decisions are on #326. How R3 looks and feels waits for R2's walk-through, and R3's spec and tickets still wait for the retros. At R3's `/to-spec`, each decision on #326 is checked against what R1 and R2 shipped and against their reviews and retros; one that no longer holds goes back to the human.

| Phase          | Goal                                                                                                                                                                                                                                                                                                                                                                        | Frames          | Milestone                                                           | Status      |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- | ------------------------------------------------------------------- | ----------- |
| Safety net     | On `main`, before `redesign` branches: API tests, browser e2e smoke, required CI gate, then the dependency update (was #126, #127, #146; decided in #179; spec #195)                                                                                                                                                                                                        | –               | [Safety net](https://github.com/christried/winnies/milestone/4)     | Done        |
| Before R0      | The Safety net's retro fixes for the agents' environment, and staging: `redesign` at `staging.winnies.christried.me` with a dev sign-in (spec #219; ADR-0005)                                                                                                                                                                                                               | –               | [Before R0](https://github.com/christried/winnies/milestone/5)      | Done        |
| R0 Foundations | Old design and daisyUI out; tokens, fonts, Tailwind entry, theme/dialect/motion plumbing in; favicons from the handoff, staging copies generated; Storybook and component screenshots at the end (was #119; ADR-0004)                                                                                                                                                       | 02-tokens       | [R0 Foundations](https://github.com/christried/winnies/milestone/6) | Done        |
| Before R1      | R0's retro fixes for the agents' environment: commit messages and lint-staged, `ci-wait` and the Attribution job, records on the issues, branch cleanup, other sessions (spec #290)                                                                                                                                                                                         | –               | [Before R1](https://github.com/christried/winnies/milestone/7)      | Done        |
| R1 Engine      | Motion composable, one clock per surface, particle layer (spec #294)                                                                                                                                                                                                                                                                                                        | 04-motion       | [R1 Engine](https://github.com/christried/winnies/milestone/8)      | Done        |
| R2 Primitives  | Button, inputs, switch, win toggle, counter, timer, state pill, menu, modal, toast, tooltip (was #134, #158; spec #295)                                                                                                                                                                                                                                                     | 03-components   | [R2 Primitives](https://github.com/christried/winnies/milestone/9)  | Not started |
| Before R3      | R1's and R2's retro fixes for the agents' environment, as one batch after R2's retro (the human, 2026-11-13). R1's list is the retro comment on #294; #345 lands with it                                                                                                                                                                                                    | –               | –                                                                   | Not started |
| R3 Workspace   | Nav, summary + Winniebert, add row (was #147), Challenge rows, drag and keyboard reordering (was #157, 6a 10a), menus, modals, the header's sign-in button and a failed sign-in, error pages, Complete (its burst replaces canvas-confetti), long content (was #149), the skeleton on a slow Winnie switch. Behaviour decided early on #326, re-checked at the spec (§ Now) | 01–16           | –                                                                   | Not started |
| R4 Broadcast   | Shared View with freshness and reconnect, share menu (was #162), Overlay (corner), whose Complete replaces canvas-confetti (R1 grilling, #281); the Shared View's tab title, empty today (#253); the on-load pose (#169) with its first user, the Overlay card's entrance B07 (R3 grilling, #326)                                                                           | 17a–j, 18·0–18i | –                                                                   | Not started |
| R5 Showcase    | Landing (was #124), Changelog, link-preview cards (was #152), hero clip (last; via `/brag`); the sign-in buttons' Redirecting state and Twitch "Soon" (15b, 15c; R3 grilling, #326)                                                                                                                                                                                         | 19a–e, CL-a–b   | –                                                                   | Not started |
| Release        | Merge `redesign` into `main`, 1.0.0 changelog entry, link updates, the `visual` check on `main` (`docs/release-checklist.md`)                                                                                                                                                                                                                                               | –               | –                                                                   | Not started |

Decided for 1.0:

- Twitch sign-in shows as a disabled "Soon" button. Real Twitch sign-in is in Next.
- Landing is desktop only and just must not break on a phone, like every surface.

## Next: after 1.0

Designed in 6a. Ranked, provisional; re-checked when R5 starts.

1. **Play this myself!** A Viewer copies a Winnie into their own account from the Shared View. 6a 04a–i, was #125.
2. **Overlay settings.** Per page, timers, Calm, placement, with a live preview; add the Overlay theme (08 Q5). Placement brings the sidebar layout (Core 18·0–18i sidebar frames: Owner name, Win Condition, Pinned word, progress, page count). 6a 03a–c, was #138.
3. **Completion statistics.** 6a 05a–b, was #151.
4. **Loss counter.** 6a 06a–b, was #135.
5. **Challenge notes.** 6a 09a–b, was #154.
6. **Players.** 6a 01a–b, 08a–c, was #153.
7. **Discord notifications.** 6a 02a–g, was #130.
8. **German.** 6a 11a–f, was #145.
9. **Twitch sign-in.** Core 15c, was #155.
10. **Counter overshoot.** Target no longer caps the Counter. 6a 07a, was #148.

## Later: Game Modes and other proposals

Visual direction designed in 6b; rules not decided (08 Q13). Unordered. The Game Modes probably need their own planning map.

- **Game Modes**: identity and picker (6b 00a–c, 01a, was #139), Confirmation (6b 02a–b, was #122), Gauntlet (6b 03a–d, was #123), Timeboxed (6b 04a–c, was #137), Cursed Incremental (6b 05a–b, was #150).
- **Randomizer** wheel. 6b 06a, was #163.
- **Linked Challenges.** 6b 07a, was #136.
- **Autocomplete** for game and Win Condition. 6b 08a–b, was #142.
- **Generate a Winnie.** 6b 09a, was #143.
- **Archive**: deleted Winnies kept 30 days with Restore. 6b 10a, was #160.

## Ideas

An idea that isn't grilled yet is an `Idea: …` issue, captured with `/capture-idea` ([open Idea issues](https://github.com/christried/winnies/issues?q=is%3Aissue+is%3Aopen+label%3Aneeds-triage+%22Idea%3A%22+in%3Atitle); `docs/agents/issue-tracker.md` § Ideas). A grilling turns one into an entry above or a ticket. The ideas this section held moved there on 2026-11-10 (#212): Admin panel #116, Mobile #165, Shared Game record #213, Personal dashboard #214, "Still running?" dialog #215, Changeable display name #216, Try the Overlay before signing in #217.

## Engineering backlog

Unordered. Items that turn out to be needed for the redesign move to Now.

- **Sentry**, client and server. Was #131. Until then the 500 page's error ref is logged to Vercel's runtime logs, which keep it only briefly (R3 grilling, #326).
- **Docker** for local Postgres and an app image; not a supported deploy. Was #129.
- **CONTRIBUTING.md.** Was #140.
- **Project structure conventions** written into `CODING_STANDARDS.md` and ESLint once the rebuild settles them. Was #128.
- **Security review** of CSRF and rate limits. Was #156.
- **One stage decision**: `stage.ts`'s three one-line exports and the inline module in `nuxt.config.ts` become one `resolveStage(env, dev)`, or the `$development` handler config. Worth it once the stage logic grows. Review of Before R0, Q6.
- **Motion cookie seeded from the account**: on a browser's first visit `app/plugins/motion.ts` writes the account's value into the cookie, and the cookie then outranks the account for a year, so a browser can keep a stale `false`. The theme plugin seeds the same way. It must land in R3, before the Reduce motion switch. The fix, for theme and motion alike (#326): signed in, the account decides and the cookie only mirrors it; signed out, the cookie decides. Review of R0, Quality 1.
- **"beta" in the wordmark**: `app/components/app-wordmark.vue` shows `· beta`, and the handoff's footer and nav copy repeat it. It lands in R3 with the new wordmark, which reads `v{version}` with no replacement word (#326). Review of R0, Standards 5.
- **One Preference module**: theme and motion are two copies of one cookie, account and save mechanism. Worth exploring once the Overlay preset is specced. Review of R0, Quality candidate A.
- **`buildsStorybook` is looser than the dev sign-in gate**: it is true for any Vercel preview build, the dev sign-in's only for a preview of `redesign`, so a third enabled branch would get Storybook without it. Release checklist: a line in the "No Storybook on production" item of `docs/release-checklist.md`, or make it reuse `isStagingBuild`. Review of R1, S12.
- **A burst's count ignores `--particle-count`**, which #294 and the handoff say it follows. With Overlay settings (Next, item 2), when 6a's Calm lands: cap every burst by the token, or amend the spec and the handoff line; the human decides. Review of R1, P2.
- **`m.sticker` has no story**: one section with a Replay in the Celebratory or the Counter story. Lands in R3 Workspace, on the checklist of the first ticket that uses it (C01's sticker slap, or the Counter overshoot). Review of R1, P3.
- **Beats and recipes carry on in a hidden document**: nothing at the seam says so, and a beat on return can replay a boundary that ended long ago. Lands in R3 Workspace, a repro ticket first (`diagnosing-bugs`, a real browser), before the timer's tick ticket; then decide where the rule lives (`m.tick`, `m.beat` and `burst`, not each component). Review of R1, Q1.
- **A beat subscription is a bare unsubscribe function**, so each consumer must remember it: a scoped `useBeat(cb)` that releases on scope dispose. Lands in R3 Workspace, in the ticket that first calls `onBeat`. Review of R1, Q2.
- **One-shot recipes on a surface's first render run on the engine's default tokens** (#335): the engine now reads the surface's tokens on the first call (Q3 has landed in R2, #350), so the on-load pose can ship; its story renders on the first pass, as a layout does. Lands in R3 Workspace, with the on-load pose. Review of R1 (`docs/reviews/review_r1_2026-11-13.md`), the carried item.
- **Four recipes cancel every animation on an element**, loops included (`pageIn`, `highlight`, `mute`, `pageFlipIn`): a `cancelOneShots(el)` helper. Lands in R4 Broadcast, or R3 if a Workspace row combines a loop with `mute`. Review of R1, Q5.
- **`themeWipe` and the particles run their effects in `onfinish`**: settle both ways. Lands in R3 Workspace, in the header's theme popover ticket. Review of R1, Q6.
- **The Calm preset has two sources of truth**: one attribute drives both, or the Overlay's setting calls `m.refresh()` and sets the config together. Lands in R4 Broadcast, in the Overlay's preset ticket. Review of R1, Q9.
- **Two bare controls on today's screens**: `app/components/winnie/winnie-card-name.vue:55`'s rename `<button>` (the name looks like a heading, so `UiButton` may not fit; `UiInlineEdit` does) and `app/components/counter-pill.vue:92`'s bare `<input>`. Until R3, `CODING_STANDARDS.md` names both as the known exceptions to "a text button is `UiButton`". Lands in R3 Workspace; the pill goes with the Counter swap. Review of R2, S1 and P3.
- **The percent logic lives in three places**: `progressPercent` in `app/utils/progress-bar.ts`, the store's `percentComplete` and `shared-winnie-card.vue`; and `UiCounter`'s `full` repeats `isWonByCounter`. One function, called by all, in the first R3 ticket that touches the card; `UiCounter` takes `full` from a prop or from `isWonByCounter`. Lands in R3 Workspace. Review of R2, S2.
- **A `bare` variant of `UiTextInput`**: `UiCounter` strips the input's well with `!` overrides and `[&_input]` selectors. Split the well chrome from the base as `button.vue` splits its variants, add `variant="bare"`, and drop the overrides; `UiInlineEdit` needs none. Lands in R3 Workspace, before the swap of `counter-pill.vue` for `UiCounter`. Review of R2, S3 and Q1.
- **`win-toggle.vue` re-states `button.vue`'s clay**: the lips, the hover and press selectors, the disabled and busy classes and the focus ring are a copy, and have drifted (`--lip-md` against `--btn-lip`). Extract the constants (a shared `app/utils/clay.ts`) before R3 adds a third clay control. Lands in R3 Workspace. Review of R2, Q6.
- **Anchored-popover helpers exist twice**: `menu-nav.ts` and `tooltip.ts` each have their box types, fallback placement and clamp, and `tooltip.ts` renames its types to avoid the auto-import clash. One `app/utils/anchored.ts` with the shared types, a `clampInto` helper and the `position-area` support check. Lands in R3 Workspace. Review of R2, Q7.
- **Every Win toggle in a list is named "Mark Won"** (#317): R3's row tells them apart, for example with `aria-describedby` to the game's name (#317's report). A caller's own description must keep working next to the tooltip, which #349 makes sure of. Lands in R3 Workspace, in the Challenge row's ticket. Review of R2, #317 (the placement notes of the review file).
