import type { CompletableChallenge } from "./winnie-completion";
import { describe, expect, it } from "vitest";
import { isWinnieComplete } from "./winnie-completion";

describe("isWinnieComplete", () => {
  it("never completes a Winnie that has no Challenges", () => {
    const challenges: CompletableChallenge[] = [];
    expect(isWinnieComplete(challenges)).toBe(false);
  });

  it("completes as soon as all Challenges are completed", () => {
    const challenges: CompletableChallenge[]
      = [{ status: "won" }, { status: "won" }, { status: "won" }];
    expect(isWinnieComplete(challenges)).toBe(true);
  });

  it("completes as soon as THE single Challenge in the Winnie is completed", () => {
    const challenges: CompletableChallenge[]
      = [{ status: "won" }];
    expect(isWinnieComplete(challenges)).toBe(true);
  });

  it("never completes as long as any Challenge is todo", () => {
    const challenges: CompletableChallenge[]
      = [{ status: "won" }, { status: "todo" }, { status: "won" }];
    expect(isWinnieComplete(challenges)).toBe(false);
  });

  it("never completes as long as any Challenge is active", () => {
    const challenges: CompletableChallenge[]
      = [{ status: "won" }, { status: "active" }, { status: "won" }];
    expect(isWinnieComplete(challenges)).toBe(false);
  });
});
