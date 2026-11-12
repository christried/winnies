import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { conclude, expectedWorkflows, latestRuns, missingWorkflows, redRuns, rerunDecision, verdict } from "./ci-verdict.mjs";

const WORKFLOW = new URL("../.github/workflows/attribution.yml", import.meta.url);

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

  // One definition of passed, shared with deploy-verdict.mjs: a skipped run did not fail.
  it("calls a skipped or neutral run green", () => {
    expect(verdict({ conclusion: "skipped" }, 0)).toBe("green");
    expect(verdict({ conclusion: "neutral" }, 1)).toBe("green");
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

describe("scripts/ci-verdict.mjs missingWorkflows with a PR", () => {
  const pushOnly = [ciPush, attrPush];

  it("names a workflow whose pull_request run does not exist yet, though its push run does", () => {
    expect(missingWorkflows(pushOnly, BOTH, { pullRequest: true })).toEqual(BOTH);
  });

  it("names only the workflow whose pull_request run is missing", () => {
    const runs = [
      ...pushOnly,
      run(5, "CI", "pull_request", "queued", null),
    ];
    expect(missingWorkflows(runs, BOTH, { pullRequest: true })).toEqual(["Attribution"]);
  });

  it("names nothing when each expected workflow has a pull_request run, started or not", () => {
    const runs = [
      ciPush,
      run(5, "CI", "pull_request", "queued", null),
      run(6, "Attribution", "pull_request", "in_progress", null),
    ];
    expect(missingWorkflows(runs, BOTH, { pullRequest: true })).toEqual([]);
  });
});

describe("scripts/ci-verdict.mjs expectedWorkflows", () => {
  const OLD_FORM = "on:\n  pull_request:\n    types: [opened]\n  push:\n    branches: [main, redesign]\n";

  it("expects Attribution when its workflow runs on a push to every branch", () => {
    expect(expectedWorkflows("name: Attribution\non:\n  pull_request:\n  push:\n    branches: [\"**\"]\n")).toEqual(BOTH);
  });

  it("expects CI only when the workflow runs on pushes to named branches, as the old form did", () => {
    expect(expectedWorkflows(OLD_FORM)).toEqual(["CI"]);
  });

  it("expects CI only for a block list of named branches", () => {
    expect(expectedWorkflows("on:\n  push:\n    branches:\n      - main\n      # and\n      - redesign\n")).toEqual(["CI"]);
  });

  it("expects CI only when the workflow does not exist at the commit", () => {
    expect(expectedWorkflows(null)).toEqual(["CI"]);
  });

  // Each of these once returned ["CI"], so a red or missing Attribution run could end in green (#285 review, P1).
  it.each([
    ["a glob and an exclusion", "on:\n  push:\n    branches: [\"**\", \"!x\"]\n"],
    ["a block list with a glob", "on:\n  push:\n    branches:\n      - \"**\"\n      - \"!x\"\n"],
    ["a flow mapping", "on:\n  push: { branches: [\"**\"] }\n"],
    ["a bare push in a list", "on: [push]\n"],
    ["a push with no filter", "on:\n  push:\n  pull_request:\n"],
    ["branches-ignore", "on:\n  push:\n    branches-ignore: [wip]\n"],
    [
      "a CRLF copy of the real file",
      readFileSync(WORKFLOW, "utf8").replaceAll("\n", "\r\n"),
    ],
  ])("expects Attribution for %s: when unsure it waits, and a missing run fails loudly", (_name, yml) => {
    expect(expectedWorkflows(yml)).toEqual(BOTH);
  });

  it("expects CI only for a CRLF copy of the old form", () => {
    expect(expectedWorkflows(OLD_FORM.replaceAll("\n", "\r\n"))).toEqual(["CI"]);
  });

  it("expects Attribution from the repository's own attribution.yml, so a reformat of it fails here", () => {
    expect(expectedWorkflows(readFileSync(WORKFLOW, "utf8"))).toEqual(BOTH);
  });
});

describe("scripts/ci-verdict.mjs redRuns", () => {
  it("lists the completed runs that did not pass, and no run still going", () => {
    const red = run(1, "CI", "push", "completed", "failure");
    expect(redRuns([
      red,
      attrPush,
      run(3, "Attribution", "pull_request", "in_progress", null),
    ])).toEqual([red]);
  });

  it("does not list a skipped run", () => {
    expect(redRuns([
      run(1, "CI", "push", "completed", "skipped"),
    ])).toEqual([]);
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
      runs: [
        ciPush,
        attrPush,
        run(5, "CI", "pull_request", "completed", "success"),
        run(6, "Attribution", "pull_request", "completed", "success"),
      ],
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

  const prRuns = [
    ciPush,
    attrPush,
    run(5, "CI", "pull_request", "completed", "success"),
    run(6, "Attribution", "pull_request", "completed", "success"),
  ];

  it("says green for a clean PR with both runs green, push and pull_request", () => {
    expect(conclude({
      runs: prRuns,
      pr: pr("clean"),
      expected: BOTH,
    })).toBe("green");
  });

  it("says green for a draft PR, a behind PR or a blocked PR: only a conflict fails", () => {
    for (const state of ["draft", "behind", "blocked"]) {
      expect(conclude({
        runs: prRuns,
        pr: pr(state),
        expected: BOTH,
      })).toBe("green");
    }
  });

  it("waits while an open PR has push runs only: its pull_request runs may not exist yet", () => {
    expect(conclude({
      runs: [ciPush, attrPush],
      pr: pr("clean"),
      expected: BOTH,
    })).toBe("waiting");
  });

  it("waits while one of the open PR's two workflows has no pull_request run yet", () => {
    expect(conclude({
      runs: prRuns.slice(0, 3),
      pr: pr("clean"),
      expected: BOTH,
    })).toBe("waiting");
  });

  it("says red for a red pull_request run of a PR whose push runs are green", () => {
    expect(conclude({
      runs: [
        ...prRuns.slice(0, 3),
        run(6, "Attribution", "pull_request", "completed", "failure"),
      ],
      pr: pr("clean"),
      expected: BOTH,
    })).toBe("red");
  });

  it("says green for a skipped run", () => {
    expect(conclude({
      runs: [
        ciPush,
        run(2, "Attribution", "push", "completed", "skipped"),
      ],
      pr: null,
      expected: BOTH,
    })).toBe("green");
  });

  it("says green with CI alone when only CI is expected", () => {
    expect(conclude({
      runs: [ciPush],
      pr: null,
      expected: ["CI"],
    })).toBe("green");
  });
});
