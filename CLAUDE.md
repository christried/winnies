# Winnies

Only what is written here and in the files this points to is agreed. Old issues, old commit messages and older notes are not precedent unless the human confirms them.

## Roles

- **Agents implement** (the human, 2026-11-10). They write the code, commit, push and open PRs, and merge into `redesign`.
- **The human decides**: product questions (in a grilling), how things look and feel, every merge into `main`, and every change to the machine outside the repository: an install or removal, a command as root or administrator, an environment variable, the registry. `scripts/machine-guard.mjs`, a Claude Code hook in `.claude/settings.json`, puts such a command to the human before it runs.
- **Questions to the human** go through the AskUserQuestion tool, with options, all open questions in one call (the human, 2026-11-11).
- **The planning agent** keeps `docs/roadmap.md` and proposes priorities, scope and tickets. It proposes; the human decides.
- **On GitHub, freely, saying what you are doing as you do it:** issues, sub-issues and dependencies, milestones, labels, projects, PRs.

## Attribution

No agent shows up in this repository's commits, and nothing claims an agent as co-author (the human, 2026-11-10, narrowed on 2026-11-12 in #277; it overrides every tool default).

- No `Co-Authored-By`, no session trailer, no "Generated with" line, no agent link or robot emoji in a commit, a merge commit or a tag, nor in a PR title, which becomes the merge commit's message.
- A PR body, an issue, a comment or a review may name the agent that wrote it: a cloud session's writes to GitHub come out with such a footer, added on the way out (#277). None of them carries a `Co-Authored-By`.
- Commits are authored and committed under the human's git identity, never an agent's.
- No C2PA manifest or other file metadata that names an agent in a committed image. A design export carries one; `node scripts/strip-metadata.mjs` removes it.
- Never pass `--no-verify`, set `HUSKY=0` or change `core.hooksPath`.

`scripts/attribution.mjs` enforces this in four places: the git hooks in `.husky/` (commit message, identity, the images staged for the commit, push), the `Attribution` CI job on every PR and on every pushed branch (the commits, and the images a change touches), the Claude Code hook in `.claude/settings.json` that refuses such a command, or such a call of the GitHub connector, before it runs, and the `attribution` setting there that switches Claude Code's own trailers off. A new place an agent could sign gets a new check there, with a test in `scripts/attribution.test.mjs`.

## Commits

- [Conventional Commits](https://www.conventionalcommits.org/): `type(scope): summary`. The body says why.
- Scopes: `tokens`, `motion`, `ui`, `workspace`, `shared`, `overlay`, `landing`, `changelog`, `server`, `deps`, `ci`, `agents`. Add a scope only when none fits, and list it here. `commitlint.config.mjs` reads this line: the commit-msg hook and CI refuse a header with no scope or one not listed here.
- Merge commits (`Merge <branch> (#<n>)`, `Merge … into …`, `Merge remote-tracking branch …`, `Merge pull request …`) and `Revert "…"` commits are exempt.

## Branches and releases

The redesign ships from a long-lived branch (`docs/adr/0002-redesign-ships-from-a-long-lived-branch.md`).

- `redesign` is the base of every ticket branch and every integration branch. Each ticket gets a branch `<type>/<issue#>-<slug>` (e.g. `feat/171-tokens`).
- `main` is frozen except for hotfixes; every hotfix is merged forward into `redesign`.
- `redesign` merges into `main` as **v1.0.0**. Release notes live in `content/releases/`, one file per release; the Changelog ticket moves 0.9.0 there and deletes `CHANGELOG.md`. No other release notes are written during the redesign; the 1.0.0 file is drafted at release.

Who merges what, verifying and closing tickets, the review and the retro of each phase: `docs/agents/delivery.md`.

## Other sessions

Another session may be working on this repository right now: a cloud session, a second orchestrator, the human. What you read at the start of your work can be out of date when you act on it (the human, 2026-11-12, the R0 retro). In R0, #270 landed on `redesign` from a cloud session in the middle of the phase and made the integration PR #267 conflict, and `ci-wait` printed green, since GitHub starts no `pull_request` run on a conflicting PR.

- Before you act on shared state, read it again: a branch's base, a remote branch, a worktree, the main checkout, the next migration number, staging's data, a ticket. Change only what you made.
- Two orchestrators never share an integration branch or a working directory: while one implements a spec, the other takes work outside it (the human, 2026-11-12, #281). A second session on the same machine works from its own clone or worktree, never the main checkout another session uses. Before taking a ticket, read its assignee and its branches, and assign it to yourself (`docs/agents/delivery.md` § Issues).
- A push that is rejected is never forced. The branch moved under you: find out who moved it.

## Agent skills

### Issue tracker

Issues live in GitHub Issues on `christried/winnies`, managed with the `gh` CLI. An idea that isn't grilled yet is an `Idea: …` issue (`needs-triage`), captured with `/capture-idea`, never a roadmap line. See `docs/agents/issue-tracker.md`. How tickets are written: `docs/agents/tickets.md`.

### Triage labels

Status, type and planning labels, and how they map to the skills' triage roles: `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` plus `docs/adr/` at the repo root. See `docs/agents/domain.md`.

### Roadmap

What is being built and what comes next: `docs/roadmap.md`. Ideas that aren't grilled yet are Idea issues (§ Issue tracker).

### Coding standards

What the review checks, on top of the glossary and the ADRs: `CODING_STANDARDS.md`.

### Subagents

Pass `model` and `effort: "high"` on every spawn: `sonnet` for the harder half of this repository's tasks and for reviewers, `haiku` for the easier half. See `docs/agents/subagents.md`. `/implement-spec-max` is `/implement-spec` with every subagent on `fable`, or on `opus` or `sonnet` at high effort, by how hard its task is.

### Cloud sessions

In a cloud container (`CLAUDE_CODE_REMOTE` is set), read `docs/agents/cloud.md` before the first command.

### Design hand-off

A design or asset the handoff doesn't cover is flagged, with a suggestion: Claude Design, or derive it from what exists. See `docs/agents/design-handoff.md`.

### Vendored skills

Matt Pocock's skills live in `.claude/skills/`, copied from the compies repository with its patches. Before updating or patching one, read `.claude/skills/README.md`.

### Standing rules

Record new standing rules in this file, `CODING_STANDARDS.md` or `docs/agents/`, never only in auto-memory: a rule in memory reaches one machine's sessions and no reviewer.

### Scripting

Script with `node`. A script of more than one line goes to a file (Write tool) and runs with `node <file>`: inline `node -e` breaks on an apostrophe, and a Bash heredoc on a backtick or a backslash.

In an agent worktree, the worktree guard refuses a Bash call it cannot verify stays inside: any call with a heredoc, a shell function, `export`, `source` or a `cd` out of the worktree, and a call that runs git with a `$VAR`, `$?`, `$(…)`, or a `( )` or `{ }` group. Spell git's arguments out and read a result in the next call. (Before R0: 59 refused calls in 41 subagents, 36 of them a `$` expansion.)
