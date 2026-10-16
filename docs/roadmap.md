# Roadmap

What's being built, what comes next and what's only an idea. Maintained by the planning agent as product manager; every change is approved and committed by the maintainer. Last updated 2026-10-16.

Only **Now** has tickets. Everything else lives here until its turn, then becomes a batch of tickets under one milestone. Entries link the closed issue they came from ("was #125") and the handoff frames that design them (IDs from `docs/design_handoff_winnies/01-screen-index.md`).

## Now: Redesign 1.0

The whole visual layer rebuilt from `docs/design_handoff_winnies/` (Kawaii Clay). Behaviour stays as is unless a ticket says otherwise (ADR-0001). Built on the `redesign` branch, released as v1.0.0 (ADR-0002).

Not yet ready to ticket. A redesign planning map comes first ([Redesign 1.0: Core planning map](https://github.com/christried/winnies/issues/166)): the open product questions in `08-open-questions.md`, how today's behaviour differs from the design's assumptions, and what safety net the rebuild needs (dependency update (was #146), unit tests (was #126), e2e tests (was #127), Storybook (was #119)).

| Phase          | Goal                                                                                                                                                                                   | Frames          | Milestone | Status      |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- | --------- | ----------- |
| R0 Foundations | Old design and daisyUI out; tokens, fonts, Tailwind entry, theme/dialect/motion plumbing in                                                                                            | 02-tokens       | –         | Not started |
| R1 Engine      | Motion composable, one clock per surface, particle layer                                                                                                                               | 04-motion       | –         | Not started |
| R2 Primitives  | Button, inputs, switch, win toggle, counter, timer, state pill, menu, modal, toast, tooltip (was #134, #158)                                                                           | 03-components   | –         | Not started |
| R3 Workspace   | Nav, summary + Winniebert, add row (was #147), Challenge rows, drag and keyboard reordering (was #157, 6a 10a), menus, modals, sign-in, error pages, Complete, long content (was #149) | 01–16           | –         | Not started |
| R4 Broadcast   | Shared View with freshness and reconnect, share menu (was #162), Overlay (corner)                                                                                                      | 17a–j, 18·0–18i | –         | Not started |
| R5 Showcase    | Landing (was #124), Changelog, link-preview cards (was #152)                                                                                                                           | 19a–e, CL-a–b   | –         | Not started |
| Release        | Merge `redesign` into `main`, 1.0.0 changelog entry, link updates                                                                                                                      | –               | –         | Not started |

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

## Ideas: no design yet

Unordered.

- **Admin panel**: role-gated, inspect and delete Winnies, Challenges and Owners. Was #116.
- **Mobile** for Workspace and Shared View; touch alternatives for tooltips and drag. The Overlay stays desktop. Was #165.
- **Shared Game record** that several Challenges point to, so autocomplete and statistics stay consistent. From #149.
- **Personal dashboard** for signed-in Owners: past Winnies, settings. From #124.
- **"Still running?" dialog**: after X minutes of the Total Timer running with no Challenge running, offer to pause the Winnie. Must-have after 1.0; X undecided. From #180.
- **Changeable display name**: an Owner picks the name Winnies shows for them, separate from their Discord name, and can change it as often as they like, behind a reasonable rate limit. Definitely to look into. It would also reopen showing the Owner's name on public surfaces, which 1.0 leaves out. From #184.

## Engineering backlog

Unordered. Items that turn out to be needed for the redesign move to Now.

- **Sentry**, client and server. Was #131.
- **Docker** for local Postgres and an app image; not a supported deploy. Was #129.
- **CONTRIBUTING.md.** Was #140.
- **Project structure conventions** written into `AGENTS.md` and ESLint once the rebuild settles them. Was #128.
- **Security review** of CSRF and rate limits. Was #156.
