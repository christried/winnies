# Design deviations

Where the app's copy of a handoff file differs from the handoff's own, on purpose. The handoff stays the design's source of truth (ADR-0001), and `scripts/handoff-sync.test.mjs` fails on any difference between the two, except inside a block in the token file's copy that starts with `/* winnies:deviation #<issue> start */` and ends with `/* winnies:deviation #<issue> end */`. One entry per deviation, newest last: the date, the issue, what changed, why, and what the handoff would need to take it in, so the block can go.

An entry about the engine, or any change that is not a token block, has no block to name: its text says "an engine change, not a token block", and `scripts/handoff-deviations.mjs` then does not ask for the block (#337). It is still an entry in the shape above, with its issue number in the heading.

The rule is `CODING_STANDARDS.md` § Design; this file is the log it points to.

An entry whose text says "the same value text as in its theme block" makes `scripts/handoff-deviations.mjs` check that every value in its block equals the theme block's, so rewording that sentence switches the check off.

## 2026-11-12 · #268 · Composites resolve under their Dialect

**What changed.** A block at the very end of `app/assets/css/winnies-tokens.css` declares again, under the Dialects, the tokens that hold `var()` and read a token a Dialect changes. Showcase gets `--shadow-raised`, `--shadow-raised-lg`, `--shadow-raised-hover` and `--shadow-popover`, with the light value and, under dark, the dark value. Broadcast gets `--btn-text`. Each has the same value text as in its theme block.

**Why.** A custom property holding `var()` is resolved on the element that declares it, and its children inherit the finished value. The handoff declares the composites on `<html>` (`:root` and `[data-theme="dark"]`) and the Dialect on `<body>`, so the lips Showcase sets (`--lip-lg: 12px`, `--lip-xl: 16px`) and the `--text-base` Broadcast sets never reached them: Showcase's clay shadows kept the Workspace's 8px and 12px lips, and Broadcast's buttons kept 17px text. Found in review of #261.

**What the handoff needs to take it in.** Declare the same composites under `[data-dialect="showcase"]` and `[data-dialect="broadcast"]`, and under `[data-theme="dark"] [data-dialect="showcase"]` (and the same element), as the block does. Then the block and this entry go.

## 2026-11-13 · #337 · A rollover's tick counts its stagger into the 95% clamp

**What changed.** In `app/utils/motion/engine.ts`, `m.tick`'s minute and hour rollover gives each digit slot the duration `min(clamped duration, 0.95 × interval − its stagger delay)`, never below 1 ms. The stagger (`min(i × 50, 30% of the interval)`), the keyframes, the easing and the backwards fill are the handoff's. At the product's 1000 ms interval the hour rollover's six slots now last 950, 900, 850, 800, 750 and 700 ms (the reference: 950 ms each), and the minute rollover's last slot lasts 700 ms (the reference: 720 ms). A second tick, the minute rollover's other five slots and every rollover on a slower interval are unchanged. On a fast clock (the Ticks story's 250 ms) the later slots get shorter in the same way. This is an engine change, not a token block, so no block in a token file carries it.

**Why.** The reference's `tick` clamps the duration alone, to 95% of the interval, and adds the stagger delay on top. A slot's rollover can then end after the next beat has ticked the same digit: at 250 ms the last digit's rollover ends at 312.5 ms and the next beat ticks it at 250 ms, and at 1000 ms the full hour's last digit (250 ms of delay plus 950 ms) ends at 1200 ms while the next second ticks it at 1000 ms, so once an hour its hop is cut off mid-way. Two tick animations on one digit are what the 95% clamp is there to prevent (`04-motion-and-sound.md`, rule 5). Found by the Ticks story's play function in a real browser (#305).

**What the handoff needs to take it in.** In `tick` (`reference/motion/winnies-motion.js`), set each rollover slot's `duration` to `Math.max(1, Math.min(dur, iv * 0.95 - delay))`, with `delay` taken out into a constant, and describe in `04-motion-and-sound.md` that the hour rollover's last digits move for a shorter time than `--dur-hour`, and the minute rollover's last digit for 20 ms less than `--dur-minute`, at a 1000 ms interval. Then this entry goes.
