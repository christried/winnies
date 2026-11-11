import type { DummyWinnie } from "./dummy-winnies";
import { describe, expect, it } from "vitest";
import { MAX_CHALLENGES_PER_WINNIE } from "../../shared/constants";
import { winnieNameSchema } from "../../shared/schemas/winnie";
import { isWinnieComplete } from "../../shared/utils/winnie-completion";
import { insertChallengeSchema } from "../db/schema";
import { DUMMY_WINNIES } from "./dummy-winnies";

type WinnieState = "Complete" | "Running" | "Paused" | "Not started";

// Complete is the app's own rule. Running, Paused and Not started are local until R0 adds the Winnie-state
// derivation to the app; that one replaces them.
function winnieState(w: DummyWinnie): WinnieState {
  if (isWinnieComplete(w.challenges))
    return "Complete";
  if (w.runningForSeconds !== null)
    return "Running";
  return w.totalAccumulatedSeconds > 0
    ? "Paused"
    : "Not started";
}

const allChallenges = DUMMY_WINNIES.flatMap(w => w.challenges);

/** The one Winnie of a state: the first test shows there is exactly one, so none of these is undefined */
function winnieIn(state: WinnieState): DummyWinnie {
  return DUMMY_WINNIES.find(w => winnieState(w) === state)!;
}

describe("the dummy set", () => {
  it("holds every Winnie state exactly once", () => {
    expect(DUMMY_WINNIES.map(winnieState).sort()).toEqual([
      "Complete",
      "Not started",
      "Paused",
      "Running",
    ]);
  });

  it("holds one Winnie at the Challenge cap, none above it and one with none", () => {
    const sizes = DUMMY_WINNIES.map(w => w.challenges.length);
    expect(sizes.filter(n => n === MAX_CHALLENGES_PER_WINNIE)).toHaveLength(1);
    expect(sizes.filter(n => n > MAX_CHALLENGES_PER_WINNIE)).toHaveLength(0);
    expect(sizes.filter(n => n === 0)).toHaveLength(1);
  });

  it("keeps every name, game and Win Condition inside its cap, and puts one of each exactly on it", () => {
    for (const w of DUMMY_WINNIES) {
      expect(winnieNameSchema.safeParse(w.name).success, w.name).toBe(true);
    }
    for (const c of allChallenges) {
      expect(insertChallengeSchema.pick({ game: true, spec: true, target: true }).safeParse(c).success, c.game).toBe(true);
    }

    const challengeFields = insertChallengeSchema.pick({ game: true, spec: true });
    expect(DUMMY_WINNIES.some(w => winnieNameSchema.safeParse(`${w.name}x`).success === false)).toBe(true);
    expect(allChallenges.some(c => !challengeFields.safeParse({ game: `${c.game}x` }).success)).toBe(true);
    expect(allChallenges.some(c => !challengeFields.safeParse({ game: c.game, spec: `${c.spec}x` }).success)).toBe(true);
  });

  it("covers Won, Pinned, Won and Pinned, Counters below and at Target, and Win Conditions with and without", () => {
    expect(allChallenges.some(c => c.status === "won")).toBe(true);
    expect(allChallenges.some(c => c.pinned)).toBe(true);
    expect(allChallenges.some(c => c.status === "won" && c.pinned)).toBe(true);
    expect(allChallenges.some(c => c.target > 0 && c.count < c.target)).toBe(true);
    expect(allChallenges.some(c => c.target > 0 && c.count === c.target)).toBe(true);
    expect(allChallenges.some(c => c.spec !== "")).toBe(true);
    expect(allChallenges.some(c => c.spec === "")).toBe(true);
  });

  it("is dated more than a day back, so a reset leaves the Owner a full Quota", () => {
    for (const w of DUMMY_WINNIES) {
      expect(w.createdHoursAgo, w.name).toBeGreaterThan(24);
    }
  });

  it("lists the Winnies oldest last, the way the Workspace sorts them", () => {
    const ages = DUMMY_WINNIES.map(w => w.createdHoursAgo);
    expect(ages).toEqual([...ages].sort((a, b) => a - b));
    expect(new Set(ages).size).toBe(ages.length);
  });

  it("has no timer running on the Complete Winnie", () => {
    const complete = winnieIn("Complete");
    expect(complete.runningForSeconds).toBeNull();
    expect(complete.challenges.length).toBeGreaterThan(0);
    expect(complete.challenges.every(c => c.runningForSeconds === null)).toBe(true);
  });

  it("leaves the Not started Winnie untouched by time", () => {
    const notStarted = winnieIn("Not started");
    expect(notStarted.totalAccumulatedSeconds).toBe(0);
    expect(notStarted.runningForSeconds).toBeNull();
    expect(notStarted.challenges.every(c => c.status === "todo" && c.accumulatedSeconds === 0 && c.runningForSeconds === null)).toBe(true);
  });

  describe.each(DUMMY_WINNIES.map(w => [w.name, w] as const))("%s holds only rows the app could have written", (_name, w) => {
    it("keeps Won Challenges stopped and Counters consistent", () => {
      for (const c of w.challenges) {
        const label = c.game;
        if (c.status === "won") {
          expect(c.runningForSeconds, label).toBeNull();
          if (c.target > 0)
            expect(c.count, label).toBe(c.target);
        }
        if (c.target > 0 && c.count >= c.target)
          expect(c.status, label).toBe("won");
        expect(c.count, label).toBeLessThanOrEqual(c.target);
        if (c.target === 0)
          expect(c.count, label).toBe(0);
      }
    });

    it("runs a Challenge timer only while the Total Timer runs, and not from before it", () => {
      for (const c of w.challenges) {
        if (c.runningForSeconds === null)
          continue;
        expect(w.runningForSeconds, c.game).not.toBeNull();
        expect(c.runningForSeconds, c.game).toBeLessThanOrEqual(w.runningForSeconds!);
      }
    });

    it("leaves every todo Challenge untouched by time", () => {
      for (const c of w.challenges.filter(c => c.status === "todo")) {
        expect(c.accumulatedSeconds, c.game).toBe(0);
        expect(c.runningForSeconds, c.game).toBeNull();
      }
    });

    it("counts at least as much on the Total Timer as on its Challenges together", () => {
      const sum = w.challenges.reduce((total, c) => total + c.accumulatedSeconds, 0);
      expect(w.totalAccumulatedSeconds).toBeGreaterThanOrEqual(sum);
    });
  });
});
