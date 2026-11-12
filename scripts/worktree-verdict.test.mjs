import { describe, expect, it } from "vitest";
import { agentId, decide, removalFailure, unmatchedNames } from "./worktree-verdict.mjs";

// Git's first stderr line for a worktree it cannot remove because a process holds a file in it, captured on Windows
// (git 2.54, #292); the path is shortened.
const GIT_IN_USE_LINE = "error: failed to delete 'C:/repo/.claude/worktrees/agent-held': Permission denied";
const SESSION_RUNS = "its session runs (claude agent agent-a1b2 (pid 35232)); name it once its agent has reported";
const NOT_NAMED = "not named; name it once its ticket is verified, or use --unlocked at the end of a phase";

/** A clean, unlocked, unnamed worktree: each case states only what differs. */
function tree(overrides = {}) {
  return {
    name: "agent-a1b2",
    named: false,
    lock: null,
    uncommitted: 0,
    head: "abcdef1234567890",
    unpushed: false,
    processes: [],
    ...overrides,
  };
}
const running = { text: "claude agent agent-a1b2 (pid 35232)", running: true };
const ended = { text: "claude agent agent-a1b2 (pid 35232)", running: false };

// scripts/worktree-clean.mjs gathers git and process facts as data and acts on this verdict (spec #219, A6).
describe("scripts/worktree-verdict.mjs decide", () => {
  it("removes a worktree that is named, even while its session runs", () => {
    expect(decide(tree({ named: true, lock: running }), { unlocked: false })).toEqual({ action: "remove", reason: "named" });
  });

  it("keeps a worktree whose session runs until it is named", () => {
    expect(decide(tree({ lock: running }), { unlocked: false })).toEqual({ action: "keep", reason: SESSION_RUNS });
  });

  it("removes a worktree whose session has ended", () => {
    expect(decide(tree({ lock: ended }), { unlocked: false })).toEqual({
      action: "remove",
      reason: "its session has ended (claude agent agent-a1b2 (pid 35232))",
    });
  });

  it("keeps a finished agent's unlocked worktree until it is named", () => {
    expect(decide(tree(), { unlocked: false })).toEqual({ action: "keep", reason: NOT_NAMED });
  });

  it("removes an unlocked worktree when --unlocked was given", () => {
    expect(decide(tree(), { unlocked: true })).toEqual({ action: "remove", reason: "not locked, and --unlocked was given" });
  });

  it("never lets --unlocked touch a worktree whose session runs", () => {
    expect(decide(tree({ lock: running }), { unlocked: true })).toEqual({ action: "keep", reason: SESSION_RUNS });
  });

  it("gives the ended session as the reason under --unlocked, not the flag", () => {
    expect(decide(tree({ lock: ended }), { unlocked: true })).toEqual({
      action: "remove",
      reason: "its session has ended (claude agent agent-a1b2 (pid 35232))",
    });
  });

  it("removes a named worktree that is not locked", () => {
    expect(decide(tree({ named: true }), { unlocked: false })).toEqual({ action: "remove", reason: "named" });
  });

  it("gives naming as the reason when a named worktree's session has also ended", () => {
    expect(decide(tree({ named: true, lock: ended }), { unlocked: false })).toEqual({ action: "remove", reason: "named" });
  });
});

describe("scripts/worktree-verdict.mjs decide, keep-reasons", () => {
  it("keeps a named worktree with one uncommitted change", () => {
    expect(decide(tree({ named: true, uncommitted: 1 }), { unlocked: false })).toEqual({ action: "keep", reason: "1 uncommitted change" });
  });

  it("keeps a named worktree with several uncommitted changes, in the plural", () => {
    expect(decide(tree({ named: true, uncommitted: 3 }), { unlocked: false })).toEqual({ action: "keep", reason: "3 uncommitted changes" });
  });

  it("keeps a named worktree whose commit no remote branch contains", () => {
    expect(decide(tree({ named: true, unpushed: true, head: "abcdef1234" }), { unlocked: false })).toEqual({
      action: "keep",
      reason: "abcdef1 is on no remote branch",
    });
  });

  it("keeps a named worktree with a process running in it", () => {
    expect(decide(tree({
      named: true,
      processes: [11, 22],
    }), { unlocked: false })).toEqual({
      action: "keep",
      reason: "processes run in it (11, 22)",
    });
  });

  it("names uncommitted changes first when a named worktree has every keep-reason", () => {
    const verdict = decide(tree({
      named: true,
      uncommitted: 2,
      unpushed: true,
      processes: [11],
    }), { unlocked: false });
    expect(verdict).toEqual({ action: "keep", reason: "2 uncommitted changes" });
  });

  it("names the unpushed commit before a process when nothing is uncommitted", () => {
    const verdict = decide(tree({
      named: true,
      unpushed: true,
      processes: [11],
    }), { unlocked: false });
    expect(verdict).toEqual({ action: "keep", reason: "abcdef1 is on no remote branch" });
  });

  it("keeps a worktree of an ended session that has an unpushed commit", () => {
    expect(decide(tree({ lock: ended, unpushed: true }), { unlocked: false })).toEqual({
      action: "keep",
      reason: "abcdef1 is on no remote branch",
    });
  });

  it("keeps an unlocked worktree with uncommitted changes under --unlocked", () => {
    expect(decide(tree({ uncommitted: 1 }), { unlocked: true })).toEqual({ action: "keep", reason: "1 uncommitted change" });
  });

  it("gives not-named, not a keep-reason, for a worktree nobody wants gone", () => {
    expect(decide(tree({ uncommitted: 1 }), { unlocked: false })).toEqual({ action: "keep", reason: NOT_NAMED });
  });
});

// A removal that fails because another process holds the folder is a kept folder, not an error (#292).
describe("scripts/worktree-verdict.mjs removalFailure", () => {
  it("keeps a folder whose removal Node refused with EPERM, as in use", () => {
    expect(removalFailure({ code: "EPERM", message: "EPERM, Permission denied: \\\\?\\C:\\repo\\.claude\\worktrees\\agent-a-orphan" })).toEqual({
      action: "kept",
      reason: "in use by another process",
    });
  });

  it("keeps a folder whose removal Node refused with EBUSY, as in use", () => {
    expect(removalFailure({ code: "EBUSY", message: "EBUSY: resource busy or locked, rmdir 'C:\\repo\\.claude\\worktrees\\agent-a-orphan'" })).toEqual({
      action: "kept",
      reason: "in use by another process",
    });
  });

  it("keeps a worktree git could not remove because a file in it is in use", () => {
    expect(removalFailure({ code: undefined, message: GIT_IN_USE_LINE })).toEqual({
      action: "kept",
      reason: "in use by another process",
    });
  });

  it("fails on ENOTEMPTY, with its message as the reason", () => {
    expect(removalFailure({ code: "ENOTEMPTY", message: "ENOTEMPTY: directory not empty, rmdir 'x'" })).toEqual({
      action: "failed",
      reason: "ENOTEMPTY: directory not empty, rmdir 'x'",
    });
  });

  it("fails on a git error that is not about a held file, with its line as the reason", () => {
    expect(removalFailure({ code: undefined, message: "fatal: 'x' contains modified or untracked files, use --force to delete it" })).toEqual({
      action: "failed",
      reason: "fatal: 'x' contains modified or untracked files, use --force to delete it",
    });
  });
});

describe("scripts/worktree-verdict.mjs agentId", () => {
  it("takes the agent id from a folder name or from the bare id", () => {
    expect(agentId("agent-a1b2")).toBe("a1b2");
    expect(agentId("a1b2")).toBe("a1b2");
  });
});

describe("scripts/worktree-verdict.mjs unmatchedNames", () => {
  it("returns the names that match no worktree, in either spelling", () => {
    expect(unmatchedNames(["a1b2", "agent-zz"], ["agent-a1b2", "agent-c3"])).toEqual(["agent-zz"]);
  });

  it("returns nothing when no name was given", () => {
    expect(unmatchedNames([], ["agent-a1b2"])).toEqual([]);
  });

  it("matches a name exactly, never by prefix", () => {
    expect(unmatchedNames(["a1"], ["agent-a1b2"])).toEqual(["a1"]);
  });
});
