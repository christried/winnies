import { describe, expect, it } from "vitest";
import { deploysFrom, deployVerdict, MERGE_LAG_MS, prVerdict } from "./deploy-verdict.mjs";

const T = Date.parse("2026-11-11T11:32:54Z");
// A check run and a PR as GitHub's REST API returns them: `commits/<sha>/check-runs` and `pulls/<n>`.
function run(name, conclusion = "success", completed_at = "2026-11-11T11:32:54Z") {
  return {
    name,
    status: conclusion === null
      ? "in_progress"
      : "completed",
    conclusion,
    completed_at: conclusion === null
      ? null
      : completed_at,
  };
}
const green = [
  run("attribution"),
  run("check"),
  run("api-tests"),
  run("e2e"),
];
function open(mergeable_state = "clean") {
  return {
    state: "open",
    merged: false,
    draft: false,
    mergeable_state,
  };
}

describe("where a PR stands", () => {
  it("is merged or closed whatever its checks say", () => {
    // A merged PR is `closed` too, and its `mergeable_state` is `unknown`.
    expect(prVerdict({
      ...open("unknown"),
      state: "closed",
      merged: true,
    }, [
      run("e2e", "failure"),
    ], T).verdict).toBe("merged");
    expect(prVerdict({
      ...open(),
      state: "closed",
    }, green, T).verdict).toBe("closed");
  });

  it("is a draft, which never merges by itself", () => {
    expect(prVerdict({
      ...open(),
      draft: true,
    }, green, T + MERGE_LAG_MS).verdict).toBe("draft");
  });

  it("is red when a check failed, naming each failed check once", () => {
    const runs = [
      ...green,
      run("e2e", "failure"),
      run("e2e", "cancelled"),
      run("api-tests", "timed_out"),
    ];
    expect(prVerdict(open(), runs, T)).toEqual({
      verdict: "red",
      checks: ["e2e", "api-tests"],
    });
  });

  it("is not red for a skipped or neutral check", () => {
    expect(prVerdict(open(), [
      ...green,
      run("lint", "skipped"),
      run("x", "neutral"),
    ], T).verdict).toBe("wait");
  });

  it("is in conflict or behind its base", () => {
    expect(prVerdict(open("dirty"), green, T).verdict).toBe("conflict");
    expect(prVerdict(open("behind"), green, T + MERGE_LAG_MS).verdict).toBe("behind");
  });

  it("waits while a check runs, or for two minutes after the last one finished", () => {
    expect(prVerdict(open(), [
      ...green,
      run("e2e", null),
    ], T + MERGE_LAG_MS).verdict).toBe("wait");
    expect(prVerdict(open(), green, T + MERGE_LAG_MS - 1).verdict).toBe("wait");
    expect(prVerdict(open(), [], T + MERGE_LAG_MS).verdict).toBe("wait");
  });

  it("is the agent's to merge when it is green, up to date and still open two minutes after its last check", () => {
    const runs = [
      run("check", "success", "2026-11-11T11:30:00Z"),
      ...green,
    ];
    expect(prVerdict(open(), runs, T + MERGE_LAG_MS).verdict).toBe("merge-yourself");
  });

  it("waits while GitHub still works out whether the PR can merge", () => {
    expect(prVerdict(open("unknown"), green, T + MERGE_LAG_MS).verdict).toBe("wait");
    expect(prVerdict(open("blocked"), green, T + MERGE_LAG_MS).verdict).toBe("wait");
  });
});

describe("whether a branch deploys", () => {
  const config = {
    git: {
      deploymentEnabled: { "**": false, "main": true, "redesign": true },
    },
  };

  it("follows the branch's own entry, then `**`", () => {
    expect(deploysFrom(config, "redesign")).toBe(true);
    expect(deploysFrom(config, "main")).toBe(true);
    expect(deploysFrom(config, "spec/219-before-r0-b")).toBe(false);
  });

  it("deploys every branch without vercel.json or without a rule, as Vercel does", () => {
    expect(deploysFrom(null, "main")).toBe(true);
    expect(deploysFrom({}, "spec/1-x")).toBe(true);
    expect(deploysFrom({
      git: { deploymentEnabled: false },
    }, "main")).toBe(false);
  });
});

describe("where a deployment stands", () => {
  const url = "https://vercel.com/christrieds-projects/winnies/HxqfbS9Fk7rZnuJeHpFo8mArtykZ";

  it("is Ready on success, with the deployment id the Vercel connector takes", () => {
    expect(deployVerdict([
      { context: "check", state: "success" },
      { context: "Vercel", state: "success", target_url: url },
    ]))
      .toEqual({ verdict: "ready", url, deployment: "HxqfbS9Fk7rZnuJeHpFo8mArtykZ" });
  });

  it("failed on failure or error", () => {
    expect(deployVerdict([
      { context: "Vercel", state: "failure", target_url: url },
    ]).verdict).toBe("failed");
    expect(deployVerdict([
      { context: "Vercel", state: "error", target_url: url },
    ]).verdict).toBe("failed");
  });

  it("waits while Vercel builds, or before its status appears", () => {
    expect(deployVerdict([
      { context: "Vercel", state: "pending", target_url: url },
    ]).verdict).toBe("wait");
    expect(deployVerdict([]).verdict).toBe("wait");
  });
});
