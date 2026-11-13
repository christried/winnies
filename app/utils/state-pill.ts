import type { MaterialIconName } from "./material-icons";

/** The nine states a pill can show, in the handoff's order (03-components.md `state-pill`). */
export const STATE_PILL_VARIANTS = [
  "running",
  "paused",
  "complete",
  "won",
  "pinned",
  "gone",
  "error",
  "offline",
  "loading",
] as const;

/** One of the nine states. */
export type StatePillVariant = (typeof STATE_PILL_VARIANTS)[number];

// The icon and the built-in word of each state, so one never reads by colour alone (07-accessibility.md, Non-colour
// cues). The words are 06-copy.md's (A4 and section B) and the status card's; "Gone" and "Error" are the human's copy
// decision (#321), as the handoff has none for them. "Loading…" carries the real ellipsis.
export const STATE_PILLS: Record<StatePillVariant, { icon: MaterialIconName; word: string }> = {
  running: { icon: "timer", word: "Running" },
  paused: { icon: "pause", word: "Paused" },
  complete: { icon: "emoji_events", word: "Complete" },
  won: { icon: "check_circle", word: "Won" },
  pinned: { icon: "push_pin", word: "Pinned" },
  gone: { icon: "link_off", word: "Gone" },
  error: { icon: "error", word: "Error" },
  offline: { icon: "cloud_off", word: "Offline" },
  loading: { icon: "progress_activity", word: "Loading…" },
};
