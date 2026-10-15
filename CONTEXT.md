# Winnies

Winnies tracks gaming challenge runs: a streamer builds a list of challenges, times each one and the run as a whole, and shows progress to an audience live.

## Language

### The run

**Winnie**:
A named list of Challenges that a Streamer runs as one effort. It has one Total Timer and is Complete when every Challenge is Won.
_Avoid_: run, list, session

**Challenge**:
One game plus an optional Win Condition that has to be won inside a Winnie. It has its own Challenge Timer and an optional Counter.
_Avoid_: task, entry, item

**Win Condition**:
Free text that says what winning a Challenge's game means (e.g. "no hits").
_Avoid_: spec (the code name), rule

**Won**:
A Challenge state the Owner sets explicitly, or that a Counter sets on reaching its Target. Un-winning reverses it.
_Avoid_: done, finished, completed (reserved for the Winnie)

**Complete**:
A Winnie with at least one Challenge, all of them Won. All timers stop.
_Avoid_: won (reserved for Challenges), finished

**Total Timer**:
The Winnie-wide stopwatch. Starting any Challenge Timer starts it; pausing it pauses every Challenge Timer.

**Challenge Timer**:
A Challenge's own stopwatch, accumulating time across starts and pauses.

**Counter**:
An optional per-Challenge tally with a **Target**; reaching the Target wins the Challenge.
_Avoid_: progress, score

**Pinned**:
A Challenge the Owner keeps at the top of the list, above unpinned open Challenges.

**Game Mode**:
A ruleset a Winnie is created with, changing how Challenges are won, lost or reset (e.g. Confirmation, Gauntlet, Timeboxed). Planned; today every Winnie is Standard.

### People

**Owner**:
The signed-in user who created a Winnie. Only the Owner can change it.

**Streamer**:
An Owner running a Winnie in front of an audience, typically with the Overlay on stream. Same account as an Owner; the term names the context, not a role.

**Viewer**:
Anyone watching a Winnie through its Share Link, signed in or not. Read-only.
_Avoid_: guest, visitor (except on the Landing page)

### Surfaces

**Workspace**:
The Owner's signed-in view at `/`, where Winnies are created, run and edited.
_Avoid_: dashboard, app page

**Share Link**:
The permanent public URL of one Winnie. It cannot be rotated or revoked.

**Shared View**:
The read-only live page a Share Link opens.

**Overlay**:
The compact, auto-paging view of a Winnie made to sit in an OBS browser source over gameplay.
_Avoid_: widget, stream view

**Landing**:
What a signed-out visitor sees at `/`, and the only place to sign in. A signed-in Owner never sees it: `/` is their Workspace. Planned (#124).

## Relationships

- An **Owner** has many **Winnies**; a **Winnie** has many **Challenges** (at most 50).
- A **Winnie** has exactly one **Share Link**, which opens both its **Shared View** and its **Overlay**.
- A **Winnie** is **Complete** exactly when every one of its **Challenges** is **Won**.

## Flagged ambiguities

- "Completed" was used for both Challenges and Winnies. Resolved: Challenges are **Won**, Winnies are **Complete**.
- "Spec" (code) and "Win Condition" (UI) are the same field. Resolved: **Win Condition** is canonical.
