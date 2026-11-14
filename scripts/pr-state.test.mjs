import { describe, expect, it } from "vitest";
import { headPrOf, mergeState } from "./pr-state.mjs";

// ci-wait and deploy-wait must agree on what "in conflict" means, so both read it here.
describe("scripts/pr-state.mjs mergeState", () => {
  it.each([
    ["dirty", "conflict"],
    ["clean", "clean"],
    ["behind", "behind"],
    ["blocked", "blocked"],
    ["unstable", "ok"],
    ["has_hooks", "ok"],
    ["draft", "ok"],
    ["unknown", "unknown"],
  ])("reads mergeable_state %s as %s", (state, expected) => {
    expect(mergeState({ mergeable_state: state })).toBe(expected);
  });

  it("reads an absent mergeable_state as unknown: GitHub has not computed it", () => {
    expect(mergeState({})).toBe("unknown");
  });
});

const SHA = "a".repeat(40);
const OTHER = "b".repeat(40);
function pr(number, state, sha) {
  return {
    number,
    state,
    head: { sha },
    base: { ref: "redesign" },
  };
}

describe("scripts/pr-state.mjs headPrOf", () => {
  it("finds nothing when the commit is in no PR", () => {
    expect(headPrOf([], SHA)).toBeNull();
  });

  it("finds the open PR whose head is the commit", () => {
    const open = pr(7, "open", SHA);
    expect(headPrOf([open], SHA)).toBe(open);
  });

  it("ignores a closed or merged PR: the list holds those too", () => {
    expect(headPrOf([
      pr(7, "closed", SHA),
    ], SHA)).toBeNull();
  });

  it("ignores an open PR whose head is another commit: the commit is an older one of that PR", () => {
    expect(headPrOf([
      pr(7, "open", OTHER),
    ], SHA)).toBeNull();
  });

  it("picks the open head PR out of several", () => {
    const open = pr(9, "open", SHA);
    expect(headPrOf([
      pr(7, "closed", SHA),
      open,
    ], SHA)).toBe(open);
    expect(headPrOf([
      pr(7, "open", OTHER),
      open,
    ], SHA)).toBe(open);
  });
});
