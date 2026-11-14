import { describe, expect, it } from "vitest";
import { MATERIAL_ICON_NAMES } from "./material-icons";
import { resolveTheme, stepIndex, THEME_OPTIONS } from "./theme-switch";

describe("resolveTheme", () => {
  it.each([
    ["light", "light", "light"],
    ["light", "dark", "light"],
    ["dark", "light", "dark"],
    ["dark", "dark", "dark"],
    ["system", "light", "light"],
    ["system", "dark", "dark"],
  ] as const)("%s with a %s system is %s", (preference, system, expected) => {
    expect(resolveTheme(preference, system)).toBe(expected);
  });
});

describe("stepIndex", () => {
  // The radios wrap at both ends, and a move is relative to the focused radio.
  it.each([
    ["ArrowRight", 0, 1],
    ["ArrowRight", 1, 2],
    ["ArrowRight", 2, 0],
    ["ArrowDown", 0, 1],
    ["ArrowDown", 1, 2],
    ["ArrowDown", 2, 0],
    ["ArrowLeft", 0, 2],
    ["ArrowLeft", 1, 0],
    ["ArrowLeft", 2, 1],
    ["ArrowUp", 0, 2],
    ["ArrowUp", 1, 0],
    ["ArrowUp", 2, 1],
  ])("%s from %i goes to %i", (key, from, to) => {
    expect(stepIndex(from, key, 3)).toBe(to);
  });

  // Enter and Space are the button's own click; Home and End are not handled.
  it.each(["Home", "End", "Enter", " ", "a"])("%j is not a step", (key) => {
    expect(stepIndex(1, key, 3)).toBeNull();
  });
});

describe("tHEME_OPTIONS", () => {
  it("lists Light, Dark and Match system, in that order, with the handoff's icons", () => {
    expect(THEME_OPTIONS.map(o => [o.value, o.icon, o.label])).toEqual([
      ["light", "light_mode", "Light"],
      ["dark", "dark_mode", "Dark"],
      ["system", "contrast", "Match system"],
    ]);
  });

  it("only uses icons the app ships", () => {
    for (const { icon } of THEME_OPTIONS)
      expect(MATERIAL_ICON_NAMES).toContain(icon);
  });
});
