import { describe, expect, it } from "vitest";
import { MATERIAL_ICON_NAMES } from "./material-icons";
import { playToggleView } from "./play-toggle";

// The words are the handoff's (06-copy.md `row.labels`: Start / Pause / Won), the icons and the variant are 03-components.md's
// `play-toggle`. A Won Challenge shows as not running and cannot start, whatever `running` says. The literals below are
// written out, not read from the function, so the test can disagree with it.
const EXPECTED = [
  [
    false,
    false,
    {
      label: "Start",
      icon: "play_arrow",
      variant: "default",
      running: false,
      locked: false,
    },
  ],
  [
    true,
    false,
    {
      label: "Pause",
      icon: "pause",
      variant: "primary",
      running: true,
      locked: false,
    },
  ],
  [
    false,
    true,
    {
      label: "Won",
      icon: "play_arrow",
      variant: "default",
      running: false,
      locked: true,
    },
  ],
  [
    true,
    true,
    {
      label: "Won",
      icon: "play_arrow",
      variant: "default",
      running: false,
      locked: true,
    },
  ],
] as const;

describe("play toggle view", () => {
  it.each(EXPECTED)("running %s, won %s", (running, won, view) => {
    expect(playToggleView(running, won)).toEqual(view);
  });

  it("only uses icons that ship", () => {
    for (const [running, won] of EXPECTED)
      expect(MATERIAL_ICON_NAMES).toContain(playToggleView(running, won).icon);
  });

  it("lets a Won Challenge win over a running timer", () => {
    expect(playToggleView(true, true)).toEqual(playToggleView(false, true));
  });
});
