import { describe, expect, it } from "vitest";
import { MATERIAL_ICON_NAMES } from "./material-icons";
import { STATE_PILL_VARIANTS, STATE_PILLS } from "./state-pill";

// The icons and words are the handoff's (03-components.md `state-pill`, 06-copy.md A4, 07-accessibility.md
// § Non-colour cues). `gone` and `error` have no word there: "Gone" and "Error" are the human's decision (#321).
// The literals below are written out, not read from the table, so the test can disagree with it.
const EXPECTED = [
  ["running", "timer", "Running"],
  ["paused", "pause", "Paused"],
  ["complete", "emoji_events", "Complete"],
  ["won", "check_circle", "Won"],
  ["pinned", "push_pin", "Pinned"],
  ["gone", "link_off", "Gone"],
  ["error", "error", "Error"],
  ["offline", "cloud_off", "Offline"],
  ["loading", "progress_activity", "Loading…"],
] as const;

describe("state pill table", () => {
  it("has the nine variants, in the handoff's order", () => {
    expect([...STATE_PILL_VARIANTS]).toEqual(EXPECTED.map(([variant]) => variant));
  });

  it.each(EXPECTED)("%s has the icon %s and the word %s", (variant, icon, word) => {
    expect(STATE_PILLS[variant]).toEqual({ icon, word });
  });

  it("only uses icons that ship", () => {
    for (const variant of STATE_PILL_VARIANTS)
      expect(MATERIAL_ICON_NAMES).toContain(STATE_PILLS[variant].icon);
  });

  // A pill never reads by colour alone: the nine are told apart by their icon and by their word.
  it("gives every variant its own icon and its own word", () => {
    const entries = STATE_PILL_VARIANTS.map(variant => STATE_PILLS[variant]);
    expect(new Set(entries.map(e => e.icon)).size).toBe(9);
    expect(new Set(entries.map(e => e.word)).size).toBe(9);
  });

  it("ends the loading word with the real ellipsis, not three dots", () => {
    expect(STATE_PILLS.loading.word.endsWith("…")).toBe(true);
    expect(STATE_PILLS.loading.word).not.toContain("...");
  });
});
