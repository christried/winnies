import { describe, expect, it } from "vitest";
import { motionAttribute, parseMotionCookie } from "./motion";

describe("parseMotionCookie", () => {
  it("reads a boolean or the strings true and false", () => {
    for (const raw of [true, "true"])
      expect(parseMotionCookie(raw)).toBe(true);
    for (const raw of [false, "false"])
      expect(parseMotionCookie(raw)).toBe(false);
  });

  it("leaves everything else unparseable so the account decides", () => {
    for (const raw of [
      undefined,
      null,
      "",
      "1",
      1,
      0,
      "yes",
      "TRUE",
      "reduce",
    ])
      expect(parseMotionCookie(raw)).toBeUndefined();
  });
});

describe("motionAttribute", () => {
  it("is reduce when on and no attribute when off", () => {
    expect(motionAttribute(true)).toBe("reduce");
    expect(motionAttribute(false)).toBeUndefined();
  });
});
