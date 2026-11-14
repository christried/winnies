// The decision of scripts/branch-prune.mjs, apart from the git and gh calls it gathers its data with, as
// worktree-verdict.mjs is apart from worktree-clean.mjs. A remote branch is described as data; the verdict says whether
// it is deleted, and why. First rule that matches wins:
//
//   1. `main` and `redesign`: kept.
//   2. An open PR has it as its head: kept.
//   3. An open PR has it as its base: kept.
//   4. Its tip is in neither `redesign` nor `main`: kept (not merged; a squash merge lands here too).
//   5. Its tip is on the first-parent history of `redesign` or `main`: kept. A branch another session has just cut from
//      `redesign` and not yet committed to looks merged, and so does one merged by fast-forward; a `--no-ff` merged
//      branch's tip is a merge's second parent, so it is off that line. The two cannot be told apart from the tip, so
//      both stay: this repository merges with `--no-ff`, so a fast-forwarded branch is the rare one, and a human may
//      delete it.
//   6. Otherwise deleted.
//
// asksAbout is the one question the verdict does not answer: which of the kept branches is one to ask about. It is rule 4
// reached, that is, a branch not merged into redesign or main that no open PR has as head or as base, and whose tip no
// open PR's head contains (a branch handed over without a PR is invisible; one inside an open PR is seen through it; an
// unmerged branch is the human's to delete). It is built on decide, so the two cannot disagree about a branch.

/**
 * @typedef {object} Branch  one remote branch, described as data
 * @property {string} name           without "origin/", e.g. "chore/281-x"
 * @property {string} tip            full sha
 * @property {string[]} mergedInto   of "redesign", "main": the ones whose history contains the tip (git merge-base --is-ancestor)
 * @property {boolean} onFirstParentLine  tip is on the first-parent history of origin/redesign or origin/main
 * @property {number[]} openPrs      numbers of open PRs whose head ref is this name (any repository)
 * @property {number[]} baseOfOpenPrs numbers of open PRs whose base is this name
 * @property {number[]} containedInOpenPrs  numbers of open PRs whose head branch on origin has this tip in its history (equal to it, or a descendant); read by asksAbout only, decide ignores it
 *
 * @typedef {{ action: "delete" | "keep", reason: string }} Verdict
 */

const PROTECTED = new Set(["main", "redesign"]);
const NOT_MERGED = "not merged into redesign or main";

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
    return { action: "keep", reason: NOT_MERGED };
  if (branch.onFirstParentLine) {
    return {
      action: "keep",
      reason: "its tip is on redesign or main itself: it has no commit of its own (another session may have just cut it) or was merged without a merge commit (fast-forward)",
    };
  }
  return { action: "delete", reason: `merged into ${branch.mergedInto.join(" and ")}` };
}

/**
 * Whether a branch is one to ask about: kept because it is not merged, with no open PR as head or as base, and no open
 * PR's head containing its tip. `main` and `redesign` are not; neither is a branch merged into either, or one whose tip is
 * on their first-parent line.
 *
 * @param {Branch} branch
 * @returns {boolean}  true when the branch is one to ask about
 */
export function asksAbout(branch) {
  return decide(branch).reason === NOT_MERGED && branch.containedInOpenPrs.length === 0;
}

/**
 * The open PRs whose head branch holds a tip, for `Branch.containedInOpenPrs`. The script asks git which remote branches
 * contain the tip; this reads the PRs off that list, so the data is built by a pure function and no GitHub read is added.
 *
 * @param {string[]} containing  names, without "origin/", of the remote branches whose history contains the tip (the branch itself among them)
 * @param {{ number: number, head: string }[]} pulls  every open PR
 * @returns {number[]}  PR numbers, in the order of `pulls`
 */
export function openPrsHolding(containing, pulls) {
  return pulls.filter(pull => containing.includes(pull.head)).map(pull => pull.number);
}

const HOUR = 3600;
const DAY = 24 * HOUR;

/**
 * How long ago a commit was made, for the list of branches to ask about: "less than an hour", "1 hour", "5 hours", "2 days".
 * Hours up to 47, days from 48 hours on, rounded down; a commit time after `now` (clock skew) counts as just now.
 *
 * @param {number} committedAt  the commit's time, in seconds since the epoch
 * @param {number} now  the same, now
 * @returns {string}  the age, e.g. "5 hours"
 */
export function formatAge(committedAt, now) {
  const seconds = Math.max(0, now - committedAt);
  if (seconds < HOUR)
    return "less than an hour";
  if (seconds < 2 * DAY) {
    const hours = Math.floor(seconds / HOUR);
    return hours === 1
      ? "1 hour"
      : `${hours} hours`;
  }
  return `${Math.floor(seconds / DAY)} days`;
}
