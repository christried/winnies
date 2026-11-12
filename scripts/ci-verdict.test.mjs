import { describe, expect, it } from "vitest";
import { conclude, expectedWorkflows, latestRuns, missingWorkflows, rerunDecision, verdict } from "./ci-verdict.mjs";

// scripts/ci-wait.mjs reports a run GitHub never gave a job as a start failure and re-runs it once (from compies, its #388).
describe("scripts/ci-verdict.mjs", () => {
  it("calls a successful run green", () => {
    expect(verdict({ conclusion: "success" }, 3)).toBe("green");
  });

  it("calls a successful run green even with zero jobs", () => {
    expect(verdict({ conclusion: "success" }, 0)).toBe("green");
  });

  it("calls a failed run with zero jobs a start failure", () => {
    expect(verdict({ conclusion: "failure" }, 0)).toBe("start-failure");
  });

  it("calls a cancelled run with zero jobs red: someone cancelled it, so a re-run would undo that", () => {
    expect(verdict({ conclusion: "cancelled" }, 0)).toBe("red");
  });

  it("calls a failed run with jobs red", () => {
    expect(verdict({ conclusion: "failure" }, 3)).toBe("red");
  });
});

describe("scripts/ci-verdict.mjs rerunDecision", () => {
  it("re-runs a first-attempt start failure", () => {
    expect(rerunDecision({ conclusion: "failure", attempt: 1 }, 0, false)).toBe("rerun");
  });

  it("reports a start failure of a second attempt as twice, as an earlier call re-ran it", () => {
    expect(rerunDecision({ conclusion: "failure", attempt: 2 }, 0, false)).toBe("twice");
  });

  it("reports a start failure this call re-ran as twice, while the list still shows attempt 1", () => {
    expect(rerunDecision({ conclusion: "failure", attempt: 1 }, 0, true)).toBe("twice");
  });

  it("never re-runs a run that has jobs, whatever its attempt", () => {
    expect(rerunDecision({ conclusion: "failure", attempt: 2 }, 3, false)).toBe("red");
    expect(rerunDecision({ conclusion: "success", attempt: 2 }, 3, false)).toBe("green");
  });
});

function run(databaseId, workflowName, event, status, conclusion) {
  return {
    databaseId,
    workflowName,
    event,
    status,
    conclusion,
  };
}
const ciPush = run(1, "CI", "push", "completed", "success");
const attrPush = run(2, "Attribution", "push", "completed", "success");
const BOTH = ["CI", "Attribution"];

describe("scripts/ci-verdict.mjs latestRuns", () => {
  it("keeps the newest run per workflow and event: an edited PR title runs Attribution again", () => {
    const old = run(3, "Attribution", "pull_request", "completed", "failure");
    const fresh = run(9, "Attribution", "pull_request", "completed", "success");
    expect(latestRuns([old, ciPush, fresh]).sort((a, b) => a.databaseId - b.databaseId)).toEqual([ciPush, fresh]);
  });

  it("keeps a push run and a pull_request run of one workflow apart", () => {
    const pull = run(5, "CI", "pull_request", "completed", "success");
    expect(latestRuns([ciPush, pull])).toHaveLength(2);
  });
});

describe("scripts/ci-verdict.mjs missingWorkflows", () => {
  it("names an expected workflow that has no run yet", () => {
    expect(missingWorkflows([ciPush], BOTH)).toEqual(["Attribution"]);
  });

  it("names nothing when every expected workflow has a run, started or not", () => {
    expect(missingWorkflows([
      ciPush,
      run(2, "Attribution", "push", "queued", null),
    ], BOTH)).toEqual([]);
  });
});

describe("scripts/ci-verdict.mjs expectedWorkflows", () => {
  const withPush = "name: Attribution\non:\n  pull_request:\n  push:\n    branches: [\"**\"]\n";

  it("expects Attribution when its workflow runs on a push to every branch", () => {
    expect(expectedWorkflows(withPush)).toEqual(BOTH);
  });

  it("expects CI only when the workflow runs on pushes to named branches", () => {
    expect(expectedWorkflows("on:\n  push:\n    branches: [main, redesign]\n")).toEqual(["CI"]);
  });

  it("expects CI only when the workflow does not exist at the commit", () => {
    expect(expectedWorkflows(null)).toEqual(["CI"]);
  });
});

describe("scripts/ci-verdict.mjs conclude", () => {
  const pr = mergeableState => ({ number: 267, mergeable_state: mergeableState });

  it("says conflict for a conflicting PR whose push runs are both green (#267)", () => {
    expect(conclude({
      runs: [ciPush, attrPush],
      pr: pr("dirty"),
      expected: BOTH,
    })).toBe("conflict");
  });

  it("says conflict for a conflicting PR while CI is still running", () => {
    expect(conclude({
      runs: [
        run(1, "CI", "push", "in_progress", null),
      ],
      pr: pr("dirty"),
      expected: BOTH,
    })).toBe("conflict");
  });

  it("waits while GitHub has not worked out whether the PR merges, though every run is green", () => {
    expect(conclude({
      runs: [ciPush, attrPush],
      pr: pr("unknown"),
      expected: BOTH,
    })).toBe("waiting");
  });

  it("waits when CI is green and Attribution has not started", () => {
    expect(conclude({
      runs: [ciPush],
      pr: null,
      expected: BOTH,
    })).toBe("waiting");
  });

  it("waits while a run is not completed", () => {
    expect(conclude({
      runs: [
        ciPush,
        run(2, "Attribution", "push", "in_progress", null),
      ],
      pr: null,
      expected: BOTH,
    })).toBe("waiting");
  });

  it("says red for a red Attribution run", () => {
    expect(conclude({
      runs: [
        ciPush,
        run(2, "Attribution", "push", "completed", "failure"),
      ],
      pr: null,
      expected: BOTH,
    })).toBe("red");
  });

  it("says red for a cancelled run", () => {
    expect(conclude({
      runs: [
        run(1, "CI", "push", "completed", "cancelled"),
        attrPush,
      ],
      pr: null,
      expected: BOTH,
    })).toBe("red");
  });

  it("says green when a newer Attribution run superseded an old red one", () => {
    const old = run(3, "Attribution", "pull_request", "completed", "failure");
    const fresh = run(9, "Attribution", "pull_request", "completed", "success");
    expect(conclude({
      runs: latestRuns([ciPush, attrPush, old, fresh]),
      pr: null,
      expected: BOTH,
    })).toBe("green");
  });

  it("says green when there is no PR and both runs are green", () => {
    expect(conclude({
      runs: [ciPush, attrPush],
      pr: null,
      expected: BOTH,
    })).toBe("green");
  });

  it("says green for a clean PR with both runs green", () => {
    expect(conclude({
      runs: [ciPush, attrPush],
      pr: pr("clean"),
      expected: BOTH,
    })).toBe("green");
  });

  it("says green for a draft PR, a behind PR or a blocked PR: only a conflict fails", () => {
    for (const state of ["draft", "behind", "blocked"]) {
      expect(conclude({
        runs: [ciPush, attrPush],
        pr: pr(state),
        expected: BOTH,
      })).toBe("green");
    }
  });

  it("says green with CI alone when only CI is expected", () => {
    expect(conclude({
      runs: [ciPush],
      pr: null,
      expected: ["CI"],
    })).toBe("green");
  });
});
