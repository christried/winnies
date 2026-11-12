# Labels

Every label in the tracker is listed here. Phases and feature batches are **milestones**, not labels.

## Status

The skills speak of five canonical triage roles. This table maps them to our labels.

| Label in mattpocock/skills | Label in our tracker | Meaning                             |
| -------------------------- | -------------------- | ----------------------------------- |
| `needs-triage`             | `needs-triage`       | Not evaluated yet                   |
| `needs-info`               | `needs-info`         | Waiting on the reporter             |
| `ready-for-agent`          | `ready-to-implement` | Fully specified, an agent builds it |
| `ready-for-human`          | `ready-for-human`    | Only the human can do it            |
| `wontfix`                  | `wontfix`            | Will not be actioned                |

Agents implement (CLAUDE.md § Roles), so `ready-to-implement` means ready for an agent. `ready-for-human` marks what only the human can do: a Claude Design prompt to run, a walk-through, a repo setting.

On an `Idea: …` issue, `needs-triage` means "not grilled yet": it waits for a grilling, not for `/triage` (`issue-tracker.md` § Ideas).

`duplicate` marks an issue closed as a duplicate.

`needs-local-check` marks a ticket that is merged and verified as far as a cloud session can, and waits for a check only a session on the human's machine can do (`delivery.md` § Issues). It sits beside the ticket's other labels and goes when the check is posted.

## Type

Exactly one per issue, matching the Conventional Commits type of the work it produces:

- `feat`: new or changed behaviour or visuals
- `fix`: something broken
- `chore`: tooling, dependencies, tests, refactors
- `docs`: documentation only

## Planning

Used by `/wayfinder` (see `issue-tracker.md`): `wayfinder:map`, `wayfinder:research`, `wayfinder:prototype`, `wayfinder:grilling`, `wayfinder:task`.
