# Design deviations

Where the app's copy of a handoff file differs from the handoff's own, on purpose. The handoff stays the design's source of truth (ADR-0001), and `scripts/handoff-sync.test.mjs` fails on any difference between the two, except inside a block in the token file's copy that starts with `/* winnies:deviation #<issue> start */` and ends with `/* winnies:deviation #<issue> end */`. One entry per deviation, newest last: the date, the issue, what changed, why, and what the handoff would need to take it in, so the block can go.

The rule is `CODING_STANDARDS.md` § Design; this file is the log it points to.

## 2026-11-12 · #268 · Composites resolve under their Dialect

**What changed.** A block at the very end of `app/assets/css/winnies-tokens.css` declares again, under the Dialects, the tokens that hold `var()` and read a token a Dialect changes. Showcase gets `--shadow-raised`, `--shadow-raised-lg`, `--shadow-raised-hover` and `--shadow-popover`, with the light value and, under dark, the dark value. Broadcast gets `--btn-text`. Each has the same value text as in its theme block.

**Why.** A custom property holding `var()` is resolved on the element that declares it, and its children inherit the finished value. The handoff declares the composites on `<html>` (`:root` and `[data-theme="dark"]`) and the Dialect on `<body>`, so the lips Showcase sets (`--lip-lg: 12px`, `--lip-xl: 16px`) and the `--text-base` Broadcast sets never reached them: Showcase's clay shadows kept the Workspace's 8px and 12px lips, and Broadcast's buttons kept 17px text. Found in review of #261.

**What the handoff needs to take it in.** Declare the same composites under `[data-dialect="showcase"]` and `[data-dialect="broadcast"]`, and under `[data-theme="dark"] [data-dialect="showcase"]` (and the same element), as the block does. Then the block and this entry go.
