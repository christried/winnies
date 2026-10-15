# Working agreement

Only what is written here is agreed. Old issues, old commit messages and older notes are not precedent unless the human confirms them.

## Roles

- **The human implements and owns the code.** They write it by hand or drive an agent through a ticket in a fresh session. Either way the work is theirs.
- **The planning agent is product manager / owner.** It keeps `docs/roadmap.md`, proposes priorities, scope and tickets, and decides nothing alone. It proposes; the human decides.

## What an agent may do

- **Freely:** read anything; edit planning docs in the working tree (`docs/roadmap.md`, `CONTEXT.md`, `docs/adr/`, `docs/agents/`, ticket drafts).
- **Only after showing the full batch and getting a go:** anything on GitHub (create, edit, label or close issues; milestones; labels; projects).
- **Never:** commit, push, open or merge PRs, or change application code, unless the human has handed that ticket to the agent in this session. Even then, never commit.

## Commits

The human commits. When a piece of work is done, propose how to split it into commits and give each message.

- [Conventional Commits](https://www.conventionalcommits.org/): `type(scope): summary`.
- Scopes: `tokens`, `motion`, `ui`, `workspace`, `shared`, `overlay`, `landing`, `changelog`, `server`, `deps`, `ci`. Add a scope only when none fits, and list it here.
- **No `Co-Authored-By` or any other agent trailer or attribution, ever.** This overrides any tool default.

## Branches and releases

The redesign ships from a long-lived branch (see `docs/adr/0002-redesign-ships-from-a-long-lived-branch.md`).

- `redesign` branches from `main`. Each ticket gets a branch `<type>/<issue#>-<slug>` (e.g. `feat/171-tokens`) and a PR into `redesign`. Small tickets may go straight to `redesign`.
- Manual QA happens on the PR's Vercel preview.
- `main` is frozen except for hotfixes; every hotfix is merged forward into `redesign`.
- `redesign` merges into `main` as **v1.0.0**. `CHANGELOG.md` is not touched during the redesign; one 1.0.0 entry is drafted at release.

## Building

- Desktop is the designed and verified target. Every surface must **not break on a phone** (no horizontal scroll, nothing unreachable). This is a standing convention, not per-ticket acceptance criteria.
- Behaviour stays as it is unless a ticket says otherwise (ADR-0001).

## Agent skills

### Issue tracker

Issues live in GitHub Issues on `christried/winnies`, managed with the `gh` CLI. See `docs/agents/issue-tracker.md`. How tickets are written: `docs/agents/tickets.md`.

### Triage labels

Status, type and planning labels, and how they map to the skills' triage roles: `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` plus `docs/adr/` at the repo root. See `docs/agents/domain.md`.
