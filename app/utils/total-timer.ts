import type { TickBeat, TickKind } from "./motion/types";
// The pure side of `UiTotalTimer` (#320): what the digits say, which slots changed, which beat that is, and what a
// screen reader hears. The component only renders it and calls `m.tick`. Nothing here reads a clock or the DOM.

/** Where a timer sits: the Winnie's Total Timer, the Overlay's, or a Challenge Timer in a row. */
export type TimerVariant = "workspace" | "overlay" | "row";

/** What a timer shows: `complete` is a Winnie's (a Won Challenge's row timer is `complete` too). */
export type TimerState = "notStarted" | "paused" | "running" | "complete";

/** One character of the time, in its own fixed-width slot. */
export interface TimerSlot {
  char: string;
  /** Counted from the right: 0 is the seconds' units, 1 its tens, 2 the colon, 3 and 4 the minutes. */
  pos: number;
  /** A colon: it never hops and is always muted. */
  sep: boolean;
}

function whole(seconds: number): number {
  return Number.isFinite(seconds)
    ? Math.max(0, Math.floor(seconds))
    : 0;
}

/**
 * The time as text. A Total Timer is `MM:SS` under an hour and `H:MM:SS` from one; a Challenge Timer is `00:00` until
 * it is first started and then always `H:MM:SS`, so a row never changes width (handoff 02-tokens.md, 08 A8).
 *
 * @param seconds elapsed seconds; fractions floor, and negative or non-finite is 0
 * @param variant where the timer sits
 * @param notStarted a Challenge Timer that was never started; it wins over a non-zero `seconds`
 * @returns `14:32:07`, `59:59`, `0:52:40`, `00:00`
 */
export function formatTimerText(seconds: number, variant: TimerVariant, notStarted: boolean): string {
  if (variant === "row" && notStarted)
    return "00:00";
  const s = whole(seconds);
  const hours = Math.floor(s / 3600);
  const mm = String(Math.floor(s / 60) % 60).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  if (variant === "row" || hours > 0)
    return `${hours}:${mm}:${ss}`;
  return `${mm}:${ss}`;
}

/**
 * The text as fixed slots, in reading order.
 *
 * @param text what `formatTimerText` gave
 * @returns a slot per character
 */
export function timerSlots(text: string): TimerSlot[] {
  return [...text].map((char, i) => ({ char, pos: text.length - 1 - i, sep: char === ":" }));
}

/**
 * The digit slots whose character differs from the previous text's at the same position. Positions count from the
 * right, so the seconds' slot stays the seconds' slot when the text grows from `59:59` to `1:00:00`.
 *
 * @param prev the text drawn before, or null on the first render, which never ticks
 * @param next the text to draw
 * @returns the `pos` of each changed digit, ascending; colons are never in it, so a separator never hops
 */
export function changedTimerSlots(prev: string | null, next: string): number[] {
  if (prev === null)
    return [];
  const before = new Map(timerSlots(prev).map(s => [s.pos, s.char]));
  return timerSlots(next)
    .filter(s => !s.sep && before.get(s.pos) !== s.char)
    .map(s => s.pos)
    .sort((a, b) => a - b);
}

/**
 * Which beat the changed digits make. It comes from the digits and not from the surface clock's `beat`: the clock's
 * minute and hour are the wall clock's, and a timer's are its elapsed value's. `pos` 5 and 2 are the colons in both
 * formats, so the ranges hold for both.
 *
 * @param changed what `changedTimerSlots` gave
 * @returns `hour` for an hours digit (a slot that just appeared included), `min` for a minutes digit, otherwise
 * `sec`; null when nothing changed
 */
export function timerTickBeat(changed: readonly number[]): TickBeat | null {
  if (!changed.length)
    return null;
  if (changed.some(pos => pos >= 6))
    return "hour";
  if (changed.some(pos => pos === 3 || pos === 4))
    return "min";
  return "sec";
}

/**
 * The engine's tick kind for a timer.
 *
 * @param variant where the timer sits
 * @param inOverlay a row inside the Overlay takes T06 instead of T02; it changes nothing else
 * @returns `total` (T01), `ov-total` (T05), `row` (T02) or `ov-row` (T06)
 */
export function timerTickKind(variant: TimerVariant, inOverlay: boolean): TickKind {
  if (variant === "overlay")
    return "ov-total";
  if (variant === "row") {
    return inOverlay
      ? "ov-row"
      : "row";
  }
  return "total";
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1
    ? ""
    : "s"}`;
}

/**
 * What a screen reader hears: hours and minutes, never seconds, then the state. It is the same string for the whole
 * minute, so the visually hidden text changes once a minute and on a state change, not every second. Own build: the
 * handoff names the behaviour, not the words (07-accessibility.md; `06-copy.md` has none), so R3 confirms the copy.
 *
 * @param seconds elapsed seconds; negative or non-finite is 0
 * @param state what the timer shows
 * @param variant where it sits: a `complete` row is said as `won`
 * @returns `14 hours 32 minutes, running`, `0 minutes, not started`, `52 minutes, won`
 */
export function timerSpokenValue(seconds: number, state: TimerState, variant: TimerVariant): string {
  const s = whole(seconds);
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor(s / 60) % 60;
  const time = hours > 0
    ? `${plural(hours, "hour")} ${plural(minutes, "minute")}`
    : plural(minutes, "minute");
  const word: Record<TimerState, string> = {
    notStarted: "not started",
    paused: "paused",
    running: "running",
    complete: variant === "row"
      ? "won"
      : "complete",
  };
  return `${time}, ${word[state]}`;
}
