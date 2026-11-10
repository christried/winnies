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
A Challenge state the Owner sets explicitly, or that a Counter sets on reaching its Target. Un-winning reverses it and puts a Counter one below its Target, so a Counter at its Target always means Won.
_Avoid_: done, finished, completed (reserved for the Winnie)

**Complete**:
A Winnie with at least one Challenge, all of them Won. All timers stop. Only the first time a Winnie becomes Complete is celebrated; becoming Complete again after an un-win is not.
_Avoid_: won (reserved for Challenges), finished

**Winnie state**:
Where a Winnie stands, read off its Total Timer: **Not started** (the Total Timer has never run), **Running** (it runs), **Paused** (it has run and is stopped) or **Complete** (which beats the other three). Un-winning a Challenge of a Complete Winnie makes it Paused.
_Avoid_: idle (it blurs Not started and Paused)

**Total Timer**:
The Winnie-wide stopwatch. Starting the Winnie or any Challenge Timer starts it. It keeps running while no Challenge Timer runs; only pausing the Winnie or the Winnie becoming Complete stops it. Pausing the Winnie pauses every Challenge Timer and remembers which were running, so starting the Winnie again resumes exactly those.

**Challenge Timer**:
A Challenge's own stopwatch, accumulating time across starts and pauses.

**Counter**:
An optional per-Challenge tally with a **Target**; reaching the Target wins the Challenge.
_Avoid_: progress, score

**Pinned**:
A Challenge the Owner keeps at the top of the list, above unpinned open Challenges. Once Won it sorts with the other Won Challenges and stays Pinned, so un-winning brings it back to the top.

**Game Mode**:
A ruleset a Winnie is created with, changing how Challenges are won, lost or reset (e.g. Confirmation, Gauntlet, Timeboxed). Planned; today every Winnie is Standard.

**Quota**:
How many Winnies and how many Challenges an Owner may create in any rolling 24 hours. It counts creations, so deleting gives nothing back.
_Avoid_: limit (that's the cap on a field or on a Winnie's Challenges), daily cap

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

### Character

**Winniebert**:
The Winnies mascot, a white mochi whose face shows how the Winnie is going. Appears on the Workspace, the Landing and the Changelog; never on the Shared View or the Overlay.
_Avoid_: Nini (the design handoff's name for it), mascot as a name

## Relationships

- An **Owner** has many **Winnies**; a **Winnie** has many **Challenges** (at most 50).
- An **Owner**'s **Quota** covers both the **Winnies** and the **Challenges** they create, across all their Winnies.
- A **Winnie** has exactly one **Share Link**, which opens both its **Shared View** and its **Overlay**.
- A **Winnie** is **Complete** exactly when every one of its **Challenges** is **Won**.

## Flagged ambiguities

- "Completed" was used for both Challenges and Winnies. Resolved: Challenges are **Won**, Winnies are **Complete**.
- "Spec" (code) and "Win Condition" (UI) are the same field. Resolved: **Win Condition** is canonical.
- The design handoff calls the mascot "Nini". Resolved: it is **Winniebert**.
