import { describe, expect, it } from "vitest";
import { counterState, numberValue } from "./text-input";

describe("counterState", () => {
  // Frame 13c: 39 / 30 turns Cherry. At the limit is still fine: only one above counts as over.
  it.each([
    ["", 30, "0 / 30", false],
    ["a", 30, "1 / 30", false],
    [
      "a".repeat(29),
      30,
      "29 / 30",
      false,
    ],
    [
      "a".repeat(30),
      30,
      "30 / 30",
      false,
    ],
    [
      "a".repeat(31),
      30,
      "31 / 30",
      true,
    ],
    [
      "a".repeat(39),
      30,
      "39 / 30",
      true,
    ],
    [
      "a".repeat(40),
      40,
      "40 / 40",
      false,
    ],
    [
      "a".repeat(41),
      40,
      "41 / 40",
      true,
    ],
    [
      "a".repeat(80),
      80,
      "80 / 80",
      false,
    ],
    [
      "a".repeat(81),
      80,
      "81 / 80",
      true,
    ],
  ])("%j against %i reads %s, over %s", (value, limit, text, over) => {
    expect(counterState(value, limit)).toEqual({ text, over });
  });

  // zod's `.max` counts UTF-16 code units, so the counter must agree with the validation message.
  it("counts an emoji as two, as zod does", () => {
    expect(counterState("\u{1F600}", 30)).toEqual({ text: "2 / 30", over: false });
    expect(counterState("\u{1F600}".repeat(16), 30)).toEqual({ text: "32 / 30", over: true });
  });
});

describe("numberValue", () => {
  it.each([
    ["", ""],
    ["0", 0],
    ["12", 12],
    ["9999", 9999],
    ["-1", -1],
    ["abc", ""],
  ])("%j gives %j", (raw, expected) => {
    expect(numberValue(raw)).toBe(expected);
  });
});
