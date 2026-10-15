# Labels

Every label in the tracker is listed here. Phases and feature batches are **milestones**, not labels.

## Status

The skills speak of five canonical triage roles. This table maps them to our labels.

| Label in mattpocock/skills | Label in our tracker | Meaning                              |
| -------------------------- | -------------------- | ------------------------------------ |
| `needs-triage`             | `needs-triage`       | Not evaluated yet                    |
| `needs-info`               | `needs-info`         | Waiting on the reporter              |
| `ready-for-agent`          | `ready-to-implement` | Fully specified, ready for the human |
| `ready-for-human`          | `ready-to-implement` | Fully specified, ready for the human |
| `wontfix`                  | `wontfix`            | Will not be actioned                 |

The human implements every ticket, sometimes by driving an agent. There is no agent-only work, so both "ready" roles share one label.

`duplicate` marks an issue closed as a duplicate.

## Type

Exactly one per issue, matching the Conventional Commits type of the work it produces:

- `feat`: new or changed behaviour or visuals
- `fix`: something broken
- `chore`: tooling, dependencies, tests, refactors
- `docs`: documentation only

## Planning

Used by `/wayfinder` (see `issue-tracker.md`): `wayfinder:map`, `wayfinder:research`, `wayfinder:prototype`, `wayfinder:grilling`, `wayfinder:task`.
