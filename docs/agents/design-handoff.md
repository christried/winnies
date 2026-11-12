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
