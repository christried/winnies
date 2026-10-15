# Tickets

Every ticket is written for the **human** who implements it. They may hand it to an agent, so a ticket points at the detailed sources instead of repeating them.

## Rules

- Use `CONTEXT.md` terms in titles and bodies.
- Acceptance criteria describe **behaviour a person can check**, not pixel values. Sizes, colours, easings and copy live in the handoff; link them.
- No per-ticket mobile criteria. The standing "doesn't break on a phone" rule in `AGENTS.md` covers it.
- One ticket fits one fresh implementation session.
- Tickets come in batches, one milestone per batch (a redesign phase or a feature). Don't create tickets for work that isn't scheduled; it lives in `docs/roadmap.md` until then.
- Labels: one type label (`feat`, `fix`, `chore`, `docs`) plus `ready-to-implement` once it's fully specified.
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
