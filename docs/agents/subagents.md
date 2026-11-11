# Subagents

The orchestrating session plans, briefs, supervises and decides; subagents implement and review. These rules win over any skill or hand-off note that names another model.

They come from the compies repository, where each one answers a retro finding; "(compies …)" names it. A Winnies `/retro` changes them as this project learns its own.

**Why:** the human wants the cheaper model on every task a precise brief can carry, with the orchestrator controlling everything that lands.

## Model per subagent

Pass `model` and `effort: "high"` on every Agent call. `CLAUDE_CODE_SUBAGENT_MODEL=haiku` in `.claude/settings.json` only catches a spawn that leaves the model out.

Rate each task by the hardest thing it asks, the way `/implement-spec-max` § Model tiers does, against the work this repository realistically has. The harder half of that work runs on Sonnet, the easier half on Haiku, both at high effort (the human, 2026-11-10):

- **`sonnet`**: a task with a risk a green test run can hide (that section's Fable tier), or a feature whose decisions the brief can't all settle in advance. Also both `code-review` sub-agents and the three phase reviewers, since a review reasons about correctness.
- **`haiku`**: a task the brief settles, including work built to a reference (a frame, a motion spec), and the review report merger.
- A ticket's brief drafter, implementer and merge job run on the ticket's model. Rate the ticket from its text and the spec before the drafter, and again from the brief: a brief that names a risk raises it.
- In doubt between the two, take Sonnet.
- Under `/implement-spec-max` every subagent runs on the tier its task rates in that skill's § Model tiers instead. The rest of this document applies there unchanged.

Reviewers and brief drafters run with `isolation: "worktree"`: a reviewer told to stay read-only still checked out a detached head in the main checkout (compies 0.5.1). Merge jobs work in the main checkout.

A review answers from the diff, the code and CI's logs. A question only a build or a repro can answer becomes its own ticket, worked with `diagnosing-bugs`: the reviewer names it and stops there. (Before R0: the Quality reviewer, asked for "a hypothesis you checked", rebuilt the repo in WSL for 25 minutes and installed 37 packages as root; the other two reviewers took six.)

## Briefs

One brief per ticket: files to change, data shapes, migration, tests at which seam with which cases, edge cases, what not to touch and an acceptance checklist. The more precise the brief, the more of the work Haiku can take.

A brief drafter writes it, on the ticket's model. Its prompt names the ticket, the integration branch and this section; it reads the ticket, its spec and the code, writes the brief to a file in the orchestrator's scratchpad, and returns the path and its open questions. (compies 0.7: the orchestrator wrote every brief from the code itself, and that reading filled its context in each of five sessions.)

A brief opens with a section headed "For the orchestrator", at most 2 KB: the decisions the drafter took, its open questions, the files that carry risk, and where the brief departs from the ticket. The drafter checks the brief against this list itself and says so in that section, in one line. The orchestrator reads that section and the acceptance checklist as a spot check of the drafter's own, settles the questions in the section by writing each answer under it, and reads further only where the section points. (Safety net: the orchestrator read every brief whole, 7 of 11 over the 25 KB aim, and its context filled after four or five tickets, from 79k tokens at the start to 280k, 151k and 260k.)

A brief aims under 25 KB; a drafter whose brief would run longer proposes a split into parts that touch no common file. A brief for a ticket whose predecessor is not merged yet is drafted after that merge.

- A data shape names every new field with its type and where it hangs.
- Name the existing module the ticket extends; a ticket that builds a second copy of a page, flow or component says why.
- Name the ADRs the change must respect (`docs/adr/`).
- A ticket where something moves names its moment in `docs/design_handoff_winnies/04-motion-and-sound.md` and the engine recipe (ADR-0003).
- A ticket that draws something names its frames (IDs from `01-screen-index.md`) and every **Design/asset needed** flag the spec raised (`docs/agents/design-handoff.md`).
- A ticket that changes pinned behaviour names the Safety net test it updates (`CODING_STANDARDS.md` § Behaviour).
- A ticket that draws a list or a count names its edges: 0, 1 and 2 items, the limit (50 Challenges), and the longest text a field allows.
- A brief points at the README's Tests section for running the tests and does not describe the test environment (database, `.env.test`, Podman, browsers); it names the seams and cases. (Safety net: every agent in a worktree rebuilt the test setup by hand; the worktree guard refused 42 commands in 19 of 24 subagents.)

Around the brief goes the frame, `docs/agents/implementer-frame.md`. A merge job gets `docs/agents/merger.md`. Run at most three implementers at a time and one merge job at a time; more overloads the machine (compies 1.4).

## Supervision

Review every implementer's work against its brief and the ticket's acceptance criteria before it merges, and against the integration tip: a merge resolution can bring back code another ticket just removed. Read the diffstat first, then the files the brief marks risky; open the full diff only for a seam the brief doesn't name. Merge it only once CI is green on the head it reported: `node scripts/ci-wait.mjs <sha> --until-done` with `run_in_background` says so, or why not.

The orchestrator merges a clean branch itself: when the head contains the integration tip and `git merge-tree --write-tree <integration branch> <head>` reports no conflict, `git merge --no-ff -m "Merge <branch> (#<n>)"` and push. A head that lacks the newest integration tip is merged the same way, without sending it back, when `git merge-tree` is clean and the commits it lacks touch none of its files (`git diff --name-only <head>...origin/<integration branch>` and `git diff --name-only origin/<integration branch>...<head>` share no path); CI on the merged tip is green before the next merge (`node scripts/ci-wait.mjs <merge sha> --until-done`). Otherwise the implementer's fix list is "merge the new tip" (Winnies, 2026-11-10: two sessions merged by two rules; one cost 17 minutes and a CI run). A merge job is for a conflict. Answer a report only with a fix list, and accept it by merging, without a reply: a message wakes a finished agent to send its report again (compies 0.8).

An implementer's report that names a helper a second test file needs becomes a line in the next brief of the batch that moves it into the shared module (`CODING_STANDARDS.md` § Tests). When no later ticket of the batch touches those files, the fix list goes to that implementer before the merge instead (the Safety net review: three reports named copied helpers, their briefs forbade shared files, and #206 and #207 cost about 700k subagent tokens).

A ticket that changes a page isn't done on tests alone: look at it at 390 and 1440 px wide, light and dark, with the edge cases its brief names, and compare it with its frame in `docs/design_handoff_winnies/`. The look is taken on staging once the ticket is merged and deployed (`docs/agents/delivery.md` § Issues), with `node scripts/shots.mjs` (1440 and 390 px, as a dev Owner, `--seed` for the dummy set's edge cases); the helper shoots light with reduced motion, so the comment names what it did not check. The check's result is a comment on the ticket's issue (`docs/agents/delivery.md` § Issues); the integration PR's Evidence, written once at the end, draws on those comments.

**Context limit.** Before every new implementer, run `node scripts/context-usage.mjs`. It reads this main session's context from its transcript; subagents don't count. At 300k tokens or more, start no new implementer: let the running ones report, review and merge them, then write a handoff for the next session and stop (`handoff` is user-invoked, so read `.claude/skills/handoff/SKILL.md` and follow it). The handoff carries:

- the spec, the integration branch, its PR, and each ticket's state: merged, in flight (branch, worktree), ready, or blocked (by what);
- every subagent still running, by its ticket and the description it was spawned with: only the session that spawned an agent can resume it;
- the brief of every ticket not yet merged, copied next to the handoff;
- every decision the human made in chat, first posted on its issue, then pointed to;
- the friction worth a `/retro`.

End by telling the human the handoff's path, to start the next session with `/implement-spec` and that path. Run `/clear` between a `/retro` and an `/implement-spec`.
