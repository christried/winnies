import { describe, expect, it } from "vitest";
import { settle } from "./inline-edit";

describe("settle", () => {
  // The prototype's `saveRename`: Enter on a blank draft is answered by the caller's error, a blur on a blank draft
  // gives the edit up quietly.
  it.each([
    [
      "Kitty",
      "enter",
      { action: "save", value: "Kitty" },
    ],
    [
      "Kitty",
      "blur",
      { action: "save", value: "Kitty" },
    ],
    [
      "  Kitty  ",
      "enter",
      { action: "save", value: "Kitty" },
    ],
    [
      "  Kitty  ",
      "blur",
      { action: "save", value: "Kitty" },
    ],
    [
      "",
      "enter",
      { action: "save", value: "" },
    ],
    [
      "   ",
      "enter",
      { action: "save", value: "" },
    ],
    [
      "",
      "blur",
      { action: "cancel" },
    ],
    [
      "   ",
      "blur",
      { action: "cancel" },
    ],
    [
      "Extremely Long Winnie Name Run",
      "enter",
      { action: "save", value: "Extremely Long Winnie Name Run" },
    ],
    [
      "Extremely Long Winnie Name Run",
      "blur",
      { action: "save", value: "Extremely Long Winnie Name Run" },
    ],
    [
      "🐱 Kitty",
      "enter",
      { action: "save", value: "🐱 Kitty" },
    ],
    [
      "🐱",
      "blur",
      { action: "save", value: "🐱" },
    ],
  ] as const)("%j via %s", (draft, source, expected) => {
    expect(settle(draft, source)).toEqual(expected);
  });
});
