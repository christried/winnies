# Tickets

Every ticket is written for an **agent** that implements it in one fresh session, from a brief the orchestrator checks (`subagents.md`). A ticket points at the detailed sources instead of repeating them. Work only the human can do (a Claude Design prompt to run, a walk-through, a repo setting) is its own `ready-for-human` ticket, so it never holds up a build ticket.

## Rules

- Use `GLOSSARY.md` terms in titles and bodies.
- Acceptance criteria describe **behaviour a person can check**, not pixel values. Sizes, colours, easings and copy live in the handoff; link them.
- No per-ticket mobile criteria. The standing "doesn't break on a phone" rule in `AGENTS.md` covers it.
- One ticket fits one fresh implementation session. Err on the finer side: split a ticket that spans two audiences (Owner and Viewer), two approval paths (code, and wording or a design the human approves), or a migration plus two surfaces (the human's preference, recorded in compies on 2026-11-08).
- A piece of UI the handoff doesn't cover carries its **Design/asset needed** flag (`design-handoff.md`).
- Tickets come in batches, one milestone per batch (a redesign phase or a feature). Don't create tickets for work that isn't scheduled; it lives in `docs/roadmap.md` until then.
- Each batch goes through `/to-spec` (one spec issue), then `/to-tickets` (sub-issues of the spec), then implementation. The next phase's spec is written only once the current batch is implemented.
- Labels: one type label (`feat`, `fix`, `chore`, `docs`) plus, once it's fully specified, `ready-to-implement` (an agent builds it) or `ready-for-human` (only the human can do it).
- Blocking edges use GitHub's native issue dependencies (see `issue-tracker.md`).

## Body

```markdown
## What and why

<a few sentences: what this delivers and why it matters>

## Acceptance criteria

- [ ] <observable behaviour>

## Manual QA

1. <step to click through on the preview deploy>

## References

- Handoff: <file and section, e.g. `docs/design_handoff_winnies/03-components.md` · win-toggle>
- Frames: <IDs from `01-screen-index.md`, e.g. 04, 10>
- Related: <ADRs, closed issues ("was #125"), prototypes>
```
