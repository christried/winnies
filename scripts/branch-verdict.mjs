// The decision of scripts/branch-prune.mjs, apart from the git and gh calls it gathers its data with, as
// worktree-verdict.mjs is apart from worktree-clean.mjs. A remote branch is described as data; the verdict says whether
// it is deleted, and why. First rule that matches wins:
//
//   1. `main` and `redesign`: kept.
//   2. An open PR has it as its head: kept.
//   3. An open PR has it as its base: kept.
//   4. Its tip is in neither `redesign` nor `main`: kept (not merged; a squash merge lands here too).
//   5. Its tip is on the first-parent history of `redesign` or `main`: kept. A branch another session has just cut from
//      `redesign` and not yet committed to looks merged; a `--no-ff` merged branch's tip is a merge's second parent,
//      so it is off that line.
//   6. Otherwise deleted.

/**
 * @typedef {object} Branch  one remote branch, described as data
 * @property {string} name           without "origin/", e.g. "chore/281-x"
 * @property {string} tip            full sha
 * @property {string[]} mergedInto   of "redesign", "main": the ones whose history contains the tip (git merge-base --is-ancestor)
 * @property {boolean} onFirstParentLine  tip is on the first-parent history of origin/redesign or origin/main
 * @property {number[]} openPrs      numbers of open PRs whose head ref is this name (any repository)
 * @property {number[]} baseOfOpenPrs numbers of open PRs whose base is this name
 *
 * @typedef {{ action: "delete" | "keep", reason: string }} Verdict
 */

const PROTECTED = new Set(["main", "redesign"]);

/** "open PR #12" or "open PRs #12, #14". */
function prs(label, numbers) {
  return `${label} PR${numbers.length === 1
    ? ""
    : "s"} ${numbers.map(number => `#${number}`).join(", ")}`;
}

/**
 * @param {Branch} branch
 * @returns {Verdict}  the verdict, with its reason
 */
export function decide(branch) {
  if (PROTECTED.has(branch.name))
    return { action: "keep", reason: "a protected branch" };
  if (branch.openPrs.length > 0) {
    return {
      action: "keep",
      reason: prs("open", branch.openPrs),
    };
  }
  if (branch.baseOfOpenPrs.length > 0) {
    return {
      action: "keep",
      reason: prs("base of open", branch.baseOfOpenPrs),
    };
  }
  if (branch.mergedInto.length === 0)
    return { action: "keep", reason: "not merged into redesign or main" };
  if (branch.onFirstParentLine) {
    return {
      action: "keep",
      reason: "no commit of its own: its tip is on redesign or main itself, so another session may have just cut it",
    };
  }
  return { action: "delete", reason: `merged into ${branch.mergedInto.join(" and ")}` };
}
