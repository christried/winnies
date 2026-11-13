import type { MaterialIconName } from "./material-icons";

/** What the play toggle shows for a state: its word, glyph and colour, and whether it can be pressed. */
export interface PlayToggleView {
  label: "Start" | "Pause" | "Won";
  icon: Extract<MaterialIconName, "play_arrow" | "pause">;
  variant: "default" | "primary";
  /** Whether the timer shows as running: false for a Won Challenge, whatever `running` says. */
  running: boolean;
  /** A Won Challenge cannot start. */
  locked: boolean;
}

// The words are 06-copy.md's `row.labels`, the component's own copy: the toggle has no text, so the word is its name.
const NOT_RUNNING: PlayToggleView = {
  label: "Start",
  icon: "play_arrow",
  variant: "default",
  running: false,
  locked: false,
};
const RUNNING: PlayToggleView = {
  label: "Pause",
  icon: "pause",
  variant: "primary",
  running: true,
  locked: false,
};
// A Won Challenge keeps the play glyph (the prototype's Won row draws it dimmed) and is named for what it is.
const WON: PlayToggleView = {
  label: "Won",
  icon: "play_arrow",
  variant: "default",
  running: false,
  locked: true,
};

/**
 * The play toggle's look for the Challenge's state. A Won Challenge wins over a running timer: it shows as Won, never
 * running, and cannot be pressed.
 *
 * @param running whether the Challenge's timer runs
 * @param won whether the Challenge is Won
 * @returns the label, icon, variant, whether it shows as running, and whether it is locked
 */
export function playToggleView(running: boolean, won: boolean): PlayToggleView {
  if (won)
    return WON;
  return running
    ? RUNNING
    : NOT_RUNNING;
}
