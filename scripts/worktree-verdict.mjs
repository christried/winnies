// The decision of scripts/worktree-clean.mjs, apart from the git and process calls it gathers its data with, as
// ci-verdict.mjs is apart from ci-wait.mjs. A worktree is described as data; the verdict says whether it goes, and why.
//
//   1. Wanted gone: named on the command line, or locked by a Claude process that no longer runs, or not locked and
//      `--unlocked` was given. Several reasons: the first of those, in that order.
//   2. Not wanted gone: kept, as "its session runs" (locked) or "not named" (not locked).
//   3. Wanted gone, but something in it would be lost: kept, whichever way it got there. Uncommitted changes, then a
//      commit no remote branch contains, then a process running in it: the first one is the reason.
//   4. Otherwise removed.

/**
 * @typedef {object} Worktree  one agent worktree, described as data
 * @property {string} name        folder name under .claude/worktrees/, e.g. "agent-a1b2c3"
 * @property {boolean} named      its agent id (name with "agent-" stripped) is on the command line
 * @property {null | { text: string, running: boolean }} lock
 *   null: not locked. text: the lock reason as git prints it ("claude agent agent-a1b2 (pid 35232)").
 *   running: the process the lock names still runs. A lock whose text has no "(pid N)" counts as running
 *   (someone locked it by hand; only naming removes it), so the shell sets running = true then.
 * @property {number} uncommitted  `git status --porcelain` line count, 0 when clean
 * @property {string} head         full SHA of its HEAD
 * @property {boolean} unpushed    no remote branch contains head
 * @property {number[]} processes  ids of processes whose command line is inside the worktree, [] when none
 *
 * @typedef {object} Options
 * @property {boolean} unlocked   the flag --unlocked
 *
 * @typedef {object} Verdict
 * @property {"remove" | "keep"} action  whether the worktree goes or stays
 * @property {string} reason      always set: why it goes, or why it stays
 */

/**
 * @param {Worktree} tree
 * @param {Options} options
 * @returns {Verdict}  the verdict, with its reason
 */
export function decide(tree, options) {
  const removal = removalReason(tree, options);
  if (removal === null) {
    return {
      action: "keep",
      reason: tree.lock
        ? `its session runs (${tree.lock.text}); name it once its agent has reported`
        : "not named; name it once its ticket is verified, or use --unlocked at the end of a phase",
    };
  }
  const loss = keepReason(tree);
  return loss === null
    ? { action: "remove", reason: removal }
    : { action: "keep", reason: loss };
}

/** Why the worktree is wanted gone, or null when nobody wants it gone. */
function removalReason(tree, options) {
  if (tree.named)
    return "named";
  if (tree.lock && !tree.lock.running)
    return `its session has ended (${tree.lock.text})`;
  if (!tree.lock && options.unlocked)
    return "not locked, and --unlocked was given";
  return null;
}

/** Why a worktree wanted gone stays anyway, or null when nothing in it would be lost. */
function keepReason(tree) {
  if (tree.uncommitted > 0) {
    return `${tree.uncommitted} uncommitted change${tree.uncommitted === 1
      ? ""
      : "s"}`;
  }
  if (tree.unpushed)
    return `${tree.head.slice(0, 7)} is on no remote branch`;
  if (tree.processes.length > 0)
    return `processes run in it (${tree.processes.join(", ")})`;
  return null;
}

/**
 * The ends of git's first stderr line for a worktree it cannot remove because a process holds it, on Windows: the folder
 * as a process's working directory ("Permission denied"), a file inside it held open ("Invalid argument"). Both captured
 * on git 2.54 (#292).
 */
export const GIT_IN_USE = ["Permission denied", "Invalid argument"];

/**
 * Whether a removal that threw is a folder another process holds (kept, the next run tries again) or a real failure.
 * Only EPERM and EBUSY from Node's fs, and git's own in-use line, count as held; any other code is a failure.
 *
 * @param {object} error
 * @param {string | undefined} error.code  Node's errno on a thrown fs error ("EPERM"); undefined for git's failure (it exits 128 and sets none)
 * @param {string} error.message           the first line of git's stderr, or of the Node error's message
 * @returns {{ action: "kept" | "failed", reason: string }}  failed: reason is the message
 */
export function removalFailure({ code, message }) {
  const heldByGit = message.includes("failed to delete") && GIT_IN_USE.some(ending => message.endsWith(ending));
  return code === "EPERM" || code === "EBUSY" || heldByGit
    ? { action: "kept", reason: "in use by another process" }
    : { action: "failed", reason: message };
}

/** "agent-a1b2" -> "a1b2"; "a1b2" -> "a1b2". */
export function agentId(nameOrArg) {
  return nameOrArg.replace(/^agent-/, "");
}

/** The command-line names that match no worktree: a typo should not pass as "nothing to do". */
export function unmatchedNames(args, treeNames) {
  const ids = new Set(treeNames.map(agentId));
  return args.filter(arg => !ids.has(agentId(arg)));
}
