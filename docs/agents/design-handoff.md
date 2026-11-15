# Design hand-off

The redesign's look comes from Claude Design (ADR-0001). The human decides case by case when a gap goes back there, so an agent never quietly improvises visuals (the human, 2026-10-15).

The app's copy of a handoff file equals the handoff's, and a deliberate difference is recorded as `CODING_STANDARDS.md` § Design says (`docs/design-deviations.md`).

Whenever a decision, a spec or a ticket needs a design or an asset that `docs/design_handoff_winnies/` doesn't cover (a screen, a state, a component variant, an illustration, an icon, a Winniebert pose), flag it:

- a short **Design/asset needed** note that names the gap;
- a recommendation, **Claude Design hand-off** or **own build** (derived from existing tokens and components), with one line of reasoning.

While grilling or speccing, flag each piece of UI one way or the other. For each hand-off the human approves:

1. Write a paste-ready prompt for Claude Design: context, the tokens and components it builds on, the frames it sits next to (IDs from `01-screen-index.md`), states, light and dark, the copy, and the deliverable for `docs/design_handoff_winnies/`.
2. Publish it as its own ticket titled `Claude Design: <what>`, labelled `ready-for-human`.
3. Make it block the build ticket, which waits for the design.
4. Tell the human which files to copy from the export: the new frames and the hand-off note, nothing else. An export carries the whole reference folder again (compies, 0.9: nine duplicated files).
   - After copying, run `node scripts/strip-metadata.mjs`: an export carries a C2PA manifest in its images, and `scripts/attribution.mjs` refuses it (`CLAUDE.md` § Attribution).

## Where a departure from the handoff is recorded

A piece the handoff doesn't cover is flagged before it is built (above). A departure that is built goes in one of three places, by its kind. (R2's retro, item 8: the orchestrator promised the human an entry in `docs/design-deviations.md` for a recipe with no moment, and `scripts/handoff-sync.test.mjs` refused it; the record ended in `CODING_STANDARDS.md` § Motion.)

- **A changed copy of a handoff file**: a `winnies:deviation #<issue>` block in the token file's copy and an entry in `docs/design-deviations.md` (`CODING_STANDARDS.md` § Design). A change to the engine against the handoff's reference code is an entry there too, marked "an engine change, not a token block" (#337). Every other copy equals the handoff's.
- **A recipe with no moment** in `04-motion-and-sound.md`: a sentence among the exceptions of `CODING_STANDARDS.md` § Motion that names the recipe, the human's decision and the issue (`m.switchSlide`, #316), and a comment at the recipe that points to it.
- **An own build**, a piece the handoff doesn't draw that its ticket flagged "own build": a comment at the piece that says so and says what is not the handoff's, and the report's **Design/asset needed** note. A review cannot read the tickets, so it checks the comment against the note (review of R2, S5).
