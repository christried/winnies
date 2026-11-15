import { describe, expect, it } from "vitest";
import { isCloudContainer } from "./environment.mjs";

describe("scripts/environment.mjs isCloudContainer", () => {
  it("is true when CLAUDE_CODE_REMOTE is a non-empty string", () => {
    expect(isCloudContainer({ CLAUDE_CODE_REMOTE: "true" })).toBe(true);
  });

  it.each([
    ["unset", {}],
    [
      "empty",
      { CLAUDE_CODE_REMOTE: "" },
    ],
  ])("is false when CLAUDE_CODE_REMOTE is %s", (_case, env) => {
    expect(isCloudContainer(env)).toBe(false);
  });
});
