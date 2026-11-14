import { describe, expect, it } from "vitest";
import { asksAbout, decide, formatAge, openPrsHolding } from "./branch-verdict.mjs";

// Both causes of a tip on the line are named: reading only "no commit of its own" would send a human after a branch
// that a fast-forward merge left, which is not in use (#290 review).
const NO_OWN_COMMIT = "its tip is on redesign or main itself: it has no commit of its own (another session may have just cut it) or was merged without a merge commit (fast-forward)";

/** A merged `--no-ff` branch with nothing else going on: each case states only what differs. */
function branch(overrides = {}) {
  return {
    name: "chore/281-x",
    tip: "abcdef1234567890abcdef1234567890abcdef12",
    mergedInto: ["redesign"],
    onFirstParentLine: false,
    openPrs: [],
    baseOfOpenPrs: [],
    ...overrides,
  };
}

// scripts/branch-prune.mjs gathers git and PR facts as data and acts on this verdict (spec #290, A6).
describe("scripts/branch-verdict.mjs decide", () => {
  it.each(["main", "redesign"])("keeps %s, even when its tip is merged", (name) => {
    expect(decide(branch({
      name,
      mergedInto: ["redesign", "main"],
    }))).toEqual({ action: "keep", reason: "a protected branch" });
  });

  it("keeps a branch with an open PR, merged or not", () => {
    expect(decide(branch({
      openPrs: [12],
    }))).toEqual({ action: "keep", reason: "open PR #12" });
    expect(decide(branch({
      mergedInto: [],
      openPrs: [12],
    }))).toEqual({ action: "keep", reason: "open PR #12" });
  });

  it("names every open PR of a branch", () => {
    expect(decide(branch({
      openPrs: [12, 14],
    }))).toEqual({ action: "keep", reason: "open PRs #12, #14" });
  });

  it("keeps a merged branch that is the base of an open PR", () => {
    expect(decide(branch({
      baseOfOpenPrs: [12],
    }))).toEqual({ action: "keep", reason: "base of open PR #12" });
    expect(decide(branch({
      baseOfOpenPrs: [12, 14],
    }))).toEqual({ action: "keep", reason: "base of open PRs #12, #14" });
  });

  it("keeps a branch that is not merged", () => {
    expect(decide(branch({ mergedInto: [] }))).toEqual({ action: "keep", reason: "not merged into redesign or main" });
  });

  it("deletes a branch merged with --no-ff into redesign", () => {
    expect(decide(branch())).toEqual({ action: "delete", reason: "merged into redesign" });
  });

  it("deletes a branch merged only into main", () => {
    expect(decide(branch({
      mergedInto: ["main"],
    }))).toEqual({ action: "delete", reason: "merged into main" });
  });

  it("deletes a branch merged into both", () => {
    expect(decide(branch({
      mergedInto: ["redesign", "main"],
    }))).toEqual({ action: "delete", reason: "merged into redesign and main" });
  });

  it("keeps a branch whose tip is on the first-parent line: it has no commit of its own, or was fast-forwarded", () => {
    expect(decide(branch({ onFirstParentLine: true }))).toEqual({ action: "keep", reason: NO_OWN_COMMIT });
    expect(decide(branch({
      mergedInto: ["redesign", "main"],
      onFirstParentLine: true,
    }))).toEqual({ action: "keep", reason: NO_OWN_COMMIT });
  });

  it("lets an open PR beat the no-commit-of-its-own rule", () => {
    expect(decide(branch({
      onFirstParentLine: true,
      openPrs: [12],
    }))).toEqual({ action: "keep", reason: "open PR #12" });
  });

  it("lets an open PR as head beat one as base", () => {
    expect(decide(branch({
      openPrs: [12],
      baseOfOpenPrs: [14],
    }))).toEqual({ action: "keep", reason: "open PR #12" });
  });
});

// The list of branches to ask about (#370): the same data as the verdict, one more question. An unmerged branch nobody has a
// PR for, with open PRs elsewhere, is the case each row below varies.
/** An unmerged branch with no PR and in no open PR's head: the one to ask about. */
function unhandedOver(overrides = {}) {
  return branch({
    mergedInto: [],
    containedInOpenPrs: [],
    ...overrides,
  });
}

describe("scripts/branch-verdict.mjs asksAbout", () => {
  it("asks about a branch that is not merged, has no open PR and is in no open PR's head", () => {
    expect(asksAbout(unhandedOver())).toBe(true);
  });

  it("does not ask about an unmerged branch with an open PR as head", () => {
    expect(asksAbout(unhandedOver({
      openPrs: [12],
    }))).toBe(false);
  });

  it("does not ask about an unmerged branch that is only the base of an open PR", () => {
    expect(asksAbout(unhandedOver({
      baseOfOpenPrs: [12],
    }))).toBe(false);
  });

  it("does not ask about a branch whose tip is on redesign", () => {
    expect(asksAbout(unhandedOver({
      mergedInto: ["redesign"],
      onFirstParentLine: true,
    }))).toBe(false);
    expect(asksAbout(unhandedOver({
      mergedInto: ["redesign", "main"],
      onFirstParentLine: true,
    }))).toBe(false);
  });

  it("does not ask about an unmerged branch whose tip is reachable from the head of an open PR", () => {
    expect(asksAbout(unhandedOver({
      containedInOpenPrs: [359],
    }))).toBe(false);
    expect(asksAbout(unhandedOver({
      containedInOpenPrs: [359, 360],
    }))).toBe(false);
  });

  it("does not ask about a branch that is merged and would be deleted", () => {
    expect(asksAbout(unhandedOver({
      mergedInto: ["redesign"],
    }))).toBe(false);
  });

  it.each(["main", "redesign"])("does not ask about %s", (name) => {
    expect(asksAbout(unhandedOver({ name }))).toBe(false);
  });
});

// Which open PRs hold a tip: the script lists the remote branches that contain it with one git call, and this reads the
// PRs off that list. `containing` always holds the branch itself.
describe("scripts/branch-verdict.mjs openPrsHolding", () => {
  const pulls = [
    {
      number: 359,
      head: "spec/359-before-r3",
    },
    {
      number: 380,
      head: "feat/380-x",
    },
  ];

  it("names the open PR whose head contains the tip", () => {
    expect(openPrsHolding(["chore/360-x", "spec/359-before-r3"], pulls)).toEqual([359]);
  });

  it("names every open PR whose head contains the tip", () => {
    expect(openPrsHolding(["chore/360-x", "spec/359-before-r3", "feat/380-x"], pulls)).toEqual([359, 380]);
  });

  it("names none when PRs are open and no head contains the tip", () => {
    expect(openPrsHolding(["test/361-x"], pulls)).toEqual([]);
  });

  it("names none when no PR is open", () => {
    expect(openPrsHolding(["test/361-x"], [])).toEqual([]);
  });
});

describe("scripts/branch-verdict.mjs formatAge", () => {
  const now = 1_800_000_000;

  it.each([
    ["no time at all", 0, "less than an hour"],
    ["just under an hour", 3599, "less than an hour"],
    ["an hour", 3600, "1 hour"],
    ["just under two hours", 7199, "1 hour"],
    ["five hours", 5 * 3600, "5 hours"],
    ["just under two days", (2 * 86400) - 1, "47 hours"],
    ["two days", 2 * 86400, "2 days"],
    ["three days and a bit", (3 * 86400) + 5, "3 days"],
    ["a commit time after now", -100, "less than an hour"],
  ])("says %s as %s", (_name, secondsAgo, expected) => {
    expect(formatAge(now - secondsAgo, now)).toBe(expected);
  });
});
