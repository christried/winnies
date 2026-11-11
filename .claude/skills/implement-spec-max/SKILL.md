---
name: implement-spec-max
description: "Implement the result of /to-spec and /to-tickets in code, with every subagent on Fable 5.2, Opus 5.5 or Sonnet 5.5 by how hard its task is."
disable-model-invocation: true
---

You have been provided a spec. This spec should have tickets associated with it, describing how to implement the spec.

The issue tracker should have been provided to you. If not, tell the user to run `/setup-matt-pocock-skills`.

The goal is the entire spec implemented on a single **integration branch**, with every ticket resolved the way the issue tracker closes work.

The tickets are not a list of steps. They are a **task graph** with blocking relationships between them. This means there is always a **frontier** of tickets which are ready to be grabbed.

Communication to and from subagents should be sparse. Communicate primarily through **context pointers**: to the spec, tickets, research notes, and previous commits. Don't duplicate information already available via pointers.

**Implementer subagents** should be run in the background where possible for maximum concurrency.

**WINNIES (max):** this is `/implement-spec` with one change: every subagent spawned under it runs on the **tier** its task rates in § Model tiers: Fable 5.2, Opus 5.5 at high effort, or Sonnet 5.5 at high effort. That covers every Agent call this skill makes, directly or through a skill or doc it invokes: exploration subagents, brief drafters, implementers, merge jobs, the `code-review` Standards and Spec sub-agents, the three phase reviewers and the report merger of `docs/agents/delivery.md` § Review, walk-through, retro, and browser-check subagents. § Model tiers replaces `docs/agents/subagents.md` § Model per subagent and the model named in `docs/agents/merger.md`, `docs/agents/delivery.md` and the `code-review` patch; everything else in those documents still applies: isolation, the concurrency limits, and the 300k context limit with its handoff. A handoff written under this skill names the tier of each ticket not yet merged and tells the next session to continue with `/implement-spec-max`, not `/implement-spec`.

**WINNIES:** before the first spawn, read `docs/agents/subagents.md` (the model per subagent, one brief per ticket, reading every diff before it merges) and `docs/agents/delivery.md` (who merges what, verifying and closing tickets). No commit, merge or PR of the run carries attribution (`CLAUDE.md` § Attribution).

## Steps

1. Read the spec and tickets to understand the task graph.

   **WINNIES:** read the spec and the frontier tickets; read a later ticket when it opens (`docs/agents/subagents.md` § Supervision). In compies 0.9, all seven tickets up front cost 15k tokens before the first spawn.

2. (optional) Use an **exploration subagent** to conduct any exploration required by the tickets - relevant codebase files or external documentation. Ensure the exploration subagent can save files - it should save its markdown notes in a directory outside the repo, accessible by all future subagents. This lets **implementer subagents** focus on implementation rather than exploration.

3. Create the integration branch. If the issue tracker closes work through PRs, or the user asks for one, open a draft PR after the first merge in step 5 (a branch with no commits ahead of main can't open one), marked as closing the spec and tickets.

   **WINNIES:** branch it from `redesign`, or from `main` while `redesign` doesn't exist yet, as `spec/<issue#>-<slug>`, and open its PR into that base (ADR-0002). `Closes #n` closes an issue only on a merge into `main`; on `redesign`, step 8 closes each ticket by hand (`docs/agents/delivery.md` § Issues). The draft PR's body is a stub, one sentence and the `Closes` lines, and stays one until step 8: per-ticket records live on the issues, and a body rewritten after each merge was still stale at the Safety net's Spec review.

4. Use **implementer subagents** to implement each ticket, each in its own worktree on its own branch. Each implementer subagent:
   - confirms its worktree is based on the integration branch before starting, and resets onto it if not;
   - calls the Skill tool with `tdd` to build the ticket;
   - merges the integration branch tip into its own branch before reporting done

5. Once an **implementer subagent** completes, merge its work to the integration branch with a **merger subagent**.

   **WINNIES:** merge it yourself when the head contains the integration tip and `git merge-tree` is clean, once CI is green on the head; a merger subagent (`docs/agents/merger.md`) only for a conflict (`docs/agents/subagents.md` § Supervision).

6. If this changes the **frontier** of available tickets, kick off more **implementer subagents** to work on the new tickets. This allows for maximum concurrency.

   **WINNIES:** before every new implementer (steps 4, 6 and 7) check the context limit (`docs/agents/subagents.md` § Supervision); at the limit, hand off instead.

7. Once all tickets are complete, call the Skill tool with `code-review` on the integration branch. Fix all issues raised by the code review in a single **implementer subagent**.

   **WINNIES:** when the spec is a whole phase of the roadmap, run the review of `docs/agents/delivery.md` § Review, walk-through, retro here instead of `code-review`: it reviews the integration branch once.

8. If a draft PR exists, mark it ready for review. Otherwise, resolve each ticket the way the issue tracker closes work, and report the integration branch.

   **WINNIES:** write the PR's body once, with the `pr` skill, from the issues' records and against the final tip (after step 7's fixes), keep its `Closes` lines, then mark it ready. A PR into `redesign` merges once CI is green; a PR into `main` waits for the human. Then verify each ticket and close it (`docs/agents/delivery.md`).

9. Clean up all **implementer subagent** worktrees.

   **WINNIES:** with `scripts/worktree-clean.mjs` (`docs/agents/delivery.md` § Branch hygiene).

## Model tiers

Every spawn runs on one of three tiers.

| Tier | Agent call |
|---|---|
| **Fable** | `model: "fable"`, no `effort` (it runs at its default) |
| **Opus** | `model: "opus"`, `effort: "high"` |
| **Sonnet** | `model: "sonnet"`, `effort: "high"` |

Rate a task by the hardest thing it asks. Between two tiers, take the higher one. The anchors below are kinds of work: Winnies has no agent-built tickets to point at yet, and its first `/retro` replaces them with real ones.

- **Fable**: the task holds a risk a green test run can hide.
  - Ownership and access: what another Owner or a signed-out Viewer may read or change, and the Share Link (#195, stories 32 to 36).
  - Timers against server time: the Total Timer and the Challenge Timers read against `serverNow`, pausing and resuming a Winnie, Complete stopping every timer (`GLOSSARY.md`).
  - Domain rules whose edge cases interlock: Won and un-winning with a Counter at its Target, Complete celebrated once, the Quota.
  - A data migration, or a change to sign-in.
  - The motion engine itself and the one clock per surface (ADR-0003).
  - A ticket zero (the first slice of a phase: a harness, the token entry), or a concern moving to a new home across many modules.
  - A bug whose cause is still unknown.
- **Opus**: a feature or refactor along known seams that needs judgement but holds none of the Fable risks.
  - A component or a surface built to its frames, with its own states and edge cases.
  - Motion built as engine recipes to `docs/design_handoff_winnies/04-motion-and-sound.md`.
  - Drag and keyboard reordering.
  - A review follow-up that merges or splits components.
- **Sonnet**: the brief settles every decision, and the work carries it out.
  - Copy, layout or styling to a frame.
  - Tests of behaviour that exists, once their harness is in.
  - Extracting one component or constant.
  - Docs and scripts for agents.

Who runs on which tier:

- A ticket's **brief drafter, implementer and merge job** run on the ticket's tier. Rate the ticket from its text and the spec before the drafter, and again from the brief: a brief that names a Fable risk raises it. The fix implementer of step 7 is rated by its hardest fix.
- **`code-review`**: the Spec sub-agent on the tier of the hardest ticket on the branch, Opus at least; the Standards sub-agent on Opus.
- **Phase review**: the Spec reviewer and `thermo-nuclear-code-quality-review` on Fable, the Standards reviewer on Opus, the report merger on Sonnet.
- **Browser check**: Sonnet for layout; Opus for motion or a check with two accounts (an Owner and a Viewer).
- **Exploration**: Sonnet; Opus when its question touches a Fable risk.
