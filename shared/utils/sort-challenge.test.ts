import type { SortableChallenge } from "./sort-challenge";
import { describe, expect, it } from "vitest";
import { sortChallenges } from "./sort-challenge";

// A challenge carrying an id to identify its position after the test case ran
interface TestChallenge extends SortableChallenge {
  id: string;
}

// Turns the sorted result into a list of ids
function mapToIds(challenges: TestChallenge[]): string[] {
  return challenges.map(challenge => challenge.id);
}

describe("sortChallenges", () => {
  it("puts pinned first, then open, then won", () => {
    const challenges: TestChallenge[] = [
      { id: "won", pinned: false, status: "won", position: 0 },
      { id: "open", pinned: false, status: "todo", position: 0 },
      { id: "pinned", pinned: true, status: "todo", position: 0 },
    ];

    expect(mapToIds(sortChallenges(challenges))).toEqual(["pinned", "open", "won"]);
  });

  it("orders by position inside a block", () => {
    const challenges: TestChallenge[] = [
      { id: "third", pinned: false, status: "todo", position: 3 },
      { id: "first", pinned: false, status: "todo", position: 1 },
      { id: "second", pinned: false, status: "todo", position: 2 },
    ];

    expect(mapToIds(sortChallenges(challenges))).toEqual(["first", "second", "third"]);
  });

  it("treats an active challenge as open rather than won", () => {
    const challenges: TestChallenge[] = [
      { id: "won", pinned: false, status: "won", position: 0 },
      { id: "active", pinned: false, status: "active", position: 1 },
    ];

    expect(mapToIds(sortChallenges(challenges))).toEqual(["active", "won"]);
  });

  it("keeps a won challenge inside the pinned block, at the bottom of it", () => {
    const challenges: TestChallenge[] = [
      { id: "pinned-won", pinned: true, status: "won", position: 0 },
      { id: "pinned-open", pinned: true, status: "todo", position: 1 },
      { id: "open", pinned: false, status: "todo", position: 0 },
    ];

    expect(mapToIds(sortChallenges(challenges))).toEqual([
      "pinned-open",
      "pinned-won",
      "open",
    ]);
  });

  it("handles an empty list without throwing", () => {
    expect(sortChallenges([])).toEqual([]);
  });

  it("does not modify the array it was given", () => {
    const challenges: TestChallenge[] = [
      { id: "won", pinned: false, status: "won", position: 0 },
      { id: "open", pinned: false, status: "todo", position: 0 },
    ];

    sortChallenges(challenges);

    expect(mapToIds(challenges)).toEqual(["won", "open"]);
  });

  it("returns the challenges it was given, fields and all", () => {
    const challenges = [
      { id: "a", game: "Counter-Strike 2", pinned: false, status: "todo", position: 0 },
    ] satisfies (TestChallenge & { game: string })[];

    const [firstChallenge] = sortChallenges(challenges);

    expect(firstChallenge).toMatchObject({ id: "a", game: "Counter-Strike 2" });
  });
});
