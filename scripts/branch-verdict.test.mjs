import { describe, expect, it } from "vitest";
import { decide } from "./branch-verdict.mjs";

const NO_OWN_COMMIT = "no commit of its own: its tip is on redesign or main itself, so another session may have just cut it";

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

  it("keeps a branch whose tip is on the first-parent line: it has no commit of its own", () => {
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
