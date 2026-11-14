import { describe, expect, it } from "vitest";
import { deploysFrom, deployVerdict, failedDeploymentLine, MERGE_LAG_MS, newestCheckRuns, openLine, prVerdict, SECOND_READ, settledVerdict } from "./deploy-verdict.mjs";

const T = Date.parse("2026-11-11T11:32:54Z");
// Check run ids grow with each run, so a run built later is a later attempt: the cases keep their meaning, and `green`,
// built first, holds the lowest ids.
let nextId = 1;
// A check run and a PR as GitHub's REST API returns them: `commits/<sha>/check-runs?filter=all` and `pulls/<n>`.
function run(name, conclusion = "success", completed_at = "2026-11-11T11:32:54Z", id = nextId++) {
  return {
    id,
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

describe("which attempt of a check counts", () => {
  it("keeps the runs that are no other run's earlier attempt, in their input order", () => {
    const first = run("visual", "failure", undefined, 50);
    const second = run("visual", null, null, 51);
    const other = run("check", "success", undefined, 40);
    expect(newestCheckRuns([first, other, second])).toEqual([other, second]);
    expect(newestCheckRuns([second, other, first])).toEqual([second, other]);
    expect(newestCheckRuns([])).toEqual([]);
  });

  it("reads the push run and the pull_request run of one commit as one check: the newest id wins", () => {
    const push = run("e2e", "failure", undefined, 70);
    const pullRequest = run("e2e", "success", undefined, 71);
    expect(newestCheckRuns([push, pullRequest])).toEqual([pullRequest]);
  });
});

describe("a check that runs again", () => {
  const failed = run("visual", "failure", undefined, 50);
  const again = run("visual", null, null, 51);

  it("is waiting, never red and never the agent's to merge", () => {
    for (const runs of [
      [...green, failed, again],
      [...green, again, failed],
    ]) {
      expect(prVerdict(open(), runs, T + 60 * MERGE_LAG_MS)).toEqual({
        verdict: "wait",
        why: "rerunning",
        checks: ["visual"],
      });
    }
  });

  it("is not a re-run when it is the check's first run", () => {
    expect(prVerdict(open(), [
      ...green,
      run("visual", null, null),
    ], T + MERGE_LAG_MS)).toEqual({
      verdict: "wait",
      why: "other",
    });
  });

  it("is the agent's to merge when the re-run passed, and red when it failed again", () => {
    expect(prVerdict(open(), [
      ...green,
      run("e2e", "failure", undefined, 60),
      run("e2e", "success", undefined, 61),
    ], T + MERGE_LAG_MS).verdict).toBe("merge-yourself");
    expect(prVerdict(open(), [
      ...green,
      run("e2e", "success", undefined, 60),
      run("e2e", "failure", undefined, 61),
    ], T)).toEqual({
      verdict: "red",
      checks: ["e2e"],
    });
  });

  it("leaves an old failure under a newer success unread, whatever the order of the list", () => {
    const runs = [
      run("e2e", "success", undefined, 61),
      run("e2e", "failure", undefined, 60),
    ];
    expect(prVerdict(open(), [
      ...green,
      ...runs,
    ], T).verdict).not.toBe("red");
  });
});

describe("a PR that GitHub reports blocked", () => {
  it("is waiting after every check passed, however long ago", () => {
    expect(prVerdict(open("blocked"), green, T + 60 * MERGE_LAG_MS)).toEqual({
      verdict: "wait",
      why: "blocked",
    });
  });

  it("is red when a check failed, and a check running again comes first", () => {
    expect(prVerdict(open("blocked"), [
      ...green,
      run("e2e", "failure"),
    ], T).verdict).toBe("red");
    expect(prVerdict(open("blocked"), [
      ...green,
      run("visual", "failure", undefined, 50),
      run("visual", null, null, 51),
    ], T + MERGE_LAG_MS)).toEqual({
      verdict: "wait",
      why: "rerunning",
      checks: ["visual"],
    });
  });

  it("is `other` while a check has no run yet, and for an unknown state or the two minutes of lag", () => {
    expect(prVerdict(open("blocked"), [], T + MERGE_LAG_MS)).toEqual({
      verdict: "wait",
      why: "other",
    });
    expect(prVerdict(open("unknown"), green, T + MERGE_LAG_MS)).toEqual({
      verdict: "wait",
      why: "other",
    });
    expect(prVerdict(open(), green, T + MERGE_LAG_MS - 1)).toEqual({
      verdict: "wait",
      why: "other",
    });
  });
});

describe("the line for a PR that has not merged yet", () => {
  it("names the checks that run again", () => {
    expect(openLine(7, {
      verdict: "wait",
      why: "rerunning",
      checks: ["e2e", "visual"],
    }))
      .toBe("#7 has not merged yet: e2e, visual running again: run this again.");
  });

  it("says GitHub still reports the PR blocked, and where to look", () => {
    expect(openLine(7, { verdict: "wait", why: "blocked" }))
      .toBe("#7 has not merged yet: its checks passed, but GitHub still reports it blocked (a check with no run yet, or a review): run this again, and open the PR to see what blocks it.");
  });

  it("keeps the line it had for the other reasons", () => {
    expect(openLine(7, { verdict: "wait", why: "other" }))
      .toBe("#7 has not merged yet (its checks run, or auto-merge lags): run this again.");
  });
});

describe("the second read before a verdict that sends the agent to act", () => {
  /** @returns a `readOnce` that returns the reads in turn, and the counts of reads and pauses */
  function reads(...answers) {
    const counts = { reads: 0, pauses: 0 };
    return {
      counts,
      readOnce: () => answers[counts.reads++],
      pause: async () => {
        counts.pauses++;
      },
    };
  }
  const behind = prVerdict(open("behind"), green, T + MERGE_LAG_MS);
  const mergeYourself = prVerdict(open(), green, T + MERGE_LAG_MS);

  it("names the two verdicts", () => {
    expect([...SECOND_READ].sort()).toEqual(["behind", "merge-yourself"]);
  });

  it("reports a PR that merged between the two reads as merged, not behind", async () => {
    const merged = prVerdict({
      state: "closed",
      merged: true,
      mergeable_state: "unknown",
      merge_commit_sha: "a".repeat(40),
    }, green, T + MERGE_LAG_MS);
    const { readOnce, pause, counts } = reads(behind, merged);
    const standing = await settledVerdict(readOnce, pause);
    expect(standing.verdict).toBe("merged");
    expect(counts).toEqual({ reads: 2, pauses: 1 });
  });

  it("lets the second read stand: behind twice, or behind and then GitHub recomputing", async () => {
    const twice = reads(behind, behind);
    expect((await settledVerdict(twice.readOnce, twice.pause)).verdict).toBe("behind");
    expect(twice.counts).toEqual({ reads: 2, pauses: 1 });
    const recomputing = reads(behind, prVerdict(open("unknown"), green, T + MERGE_LAG_MS));
    expect((await settledVerdict(recomputing.readOnce, recomputing.pause)).verdict).toBe("wait");
    expect(recomputing.counts).toEqual({ reads: 2, pauses: 1 });
  });

  it("lets a re-run between the reads turn `merge yourself` into waiting", async () => {
    const rerun = prVerdict(open(), [
      ...green,
      run("e2e", "success", undefined, 80),
      run("e2e", null, null, 81),
    ], T + MERGE_LAG_MS);
    const { readOnce, pause, counts } = reads(mergeYourself, rerun);
    const standing = await settledVerdict(readOnce, pause);
    expect(standing).toEqual({
      verdict: "wait",
      why: "rerunning",
      checks: ["e2e"],
    });
    expect(counts).toEqual({ reads: 2, pauses: 1 });
    const steady = reads(mergeYourself, mergeYourself);
    expect((await settledVerdict(steady.readOnce, steady.pause)).verdict).toBe("merge-yourself");
    expect(steady.counts).toEqual({ reads: 2, pauses: 1 });
  });

  it.each([
    [
      "red",
      prVerdict(open(), [
        ...green,
        run("e2e", "failure"),
      ], T),
    ],
    [
      "conflict",
      prVerdict(open("dirty"), green, T),
    ],
    [
      "draft",
      prVerdict({
        ...open(),
        draft: true,
      }, green, T),
    ],
    [
      "closed",
      prVerdict({
        ...open(),
        state: "closed",
      }, green, T),
    ],
    [
      "merged",
      prVerdict({
        ...open(),
        state: "closed",
        merged: true,
      }, green, T),
    ],
    [
      "wait",
      prVerdict(open("blocked"), green, T),
    ],
  ])("returns %s from one read", async (verdict, answer) => {
    const { readOnce, pause, counts } = reads(answer);
    const standing = await settledVerdict(readOnce, pause);
    expect(standing.verdict).toBe(verdict);
    expect(counts).toEqual({ reads: 1, pauses: 0 });
  });
});

describe("what to do about a failed deployment", () => {
  const sha = `58cebf8${"0".repeat(33)}`;
  const url = "https://vercel.com/christrieds-projects/winnies/HxqfbS9Fk7rZnuJeHpFo8mArtykZ";

  it("prints the three steps, as the text delivery.md § Issues describes", () => {
    expect(failedDeploymentLine({
      base: "redesign",
      sha,
      url,
      deployment: "HxqfbS9Fk7rZnuJeHpFo8mArtykZ",
    })).toBe([
      `merged into redesign at 58cebf8, but its deployment failed and the previous one keeps serving, so the ticket is not verified: ${url}`,
      "1. Read the build log: the Vercel connector's `list_deployment_events` with idOrUrl HxqfbS9Fk7rZnuJeHpFo8mArtykZ and builds 1.",
      "2. Make a ticket for the failure, and leave a note on the spec of any other orchestrator who merges into redesign: their merges fail to deploy until it is fixed.",
      "3. If the log shows \"Cannot find module\" after \"Already up to date\", the build cache is stale (#342): redeploy the commit without it with the connector's `create_deployment`, forceNew \"1\" and requestBody {\"name\":\"winnies\",\"deploymentId\":\"dpl_HxqfbS9Fk7rZnuJeHpFo8mArtykZ\"}.",
    ].join("\n"));
  });

  it("does not double the dpl_ prefix of an id that has one", () => {
    const line = failedDeploymentLine({
      base: "redesign",
      sha,
      url,
      deployment: "dpl_Apqhi8VFrjdjpjsvY5n7p1H47koE",
    });
    expect(line).toContain("\"deploymentId\":\"dpl_Apqhi8VFrjdjpjsvY5n7p1H47koE\"");
    expect(line).not.toContain("dpl_dpl_");
  });

  it("still gives four lines when Vercel's status had no URL", () => {
    const lines = failedDeploymentLine({ base: "redesign", sha }).split("\n");
    expect(lines).toHaveLength(4);
    expect(lines[0].endsWith("not verified.")).toBe(true);
    expect(lines[1]).toContain("idOrUrl <the deployment's id> and");
    expect(lines.join("\n")).not.toContain("undefined");
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
