// Removes the agent worktrees under .claude/worktrees/ that are done, with their local branches (from compies, its retro 0.8). Every
// session improvised this step: `git worktree remove` refuses a worktree the harness has locked, the auto-mode
// classifier blocks `remove -f -f`, and a removal that broke off left folders without a `.git` behind.
//
//   node scripts/worktree-clean.mjs [--unlocked] [--dry-run] [<agent id> …]    (run it in the background: a worktree
//   with node_modules takes minutes; run it from the main checkout)
//
// A worktree goes when it is named on the command line (`agent-a1b2…` or `a1b2…`, an agent that has reported and whose
// ticket is verified), or locked by a Claude process that no longer runs (a session that has ended), or not locked and
// `--unlocked` was given (the end of a phase). Any other worktree stays, with the reason: a locked one whose session
// runs stays until it is named, the flag never touches it. A worktree that goes is kept all the same, with the reason,
// while it has uncommitted changes, a commit no remote branch contains, or a process running in it (a dev server).
// `--dry-run` prints what it would do and changes nothing. A folder git no longer lists as a worktree is deleted. One
// line per folder. Exit 0 when every folder that could not be deleted was kept as in use by another process; 1 when a
// removal failed for any other reason; 2 on a usage error. In use means EPERM or EBUSY from Node, or git's
// "failed to delete" line ending in "Permission denied" (the folder held) or "Invalid argument" (a file in it held).
// The decision is scripts/worktree-verdict.mjs; this file gathers the data and acts on it.
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import process from "node:process";
import { firstLine, git, parseFlags } from "./cli-helpers.mjs";
import { agentId, decide, removalFailure, unmatchedNames } from "./worktree-verdict.mjs";

// Before any git call: a flag this script does not know must stop it, not be read as a real run.
const parsed = parseFlags({
  options: {
    "unlocked": { type: "boolean", default: false },
    "dry-run": { type: "boolean", default: false },
  },
  allowPositionals: true,
  usage: "usage: node scripts/worktree-clean.mjs [--unlocked] [--dry-run] [<agent id> …]",
});
const unlocked = parsed.values.unlocked;
const dryRun = parsed.values["dry-run"];
const names = parsed.positionals;

const root = git("rev-parse", "--show-toplevel");
const home = join(root, ".claude", "worktrees");
/** Forward slashes, lower case: Windows writes one path several ways. */
const same = path => resolve(path).replaceAll("\\", "/").toLowerCase();

const named = new Set(names.map(agentId));

/** Whether a process with this id runs (a signal 0 only asks). */
function running(pid) {
  try {
    process.kill(pid, 0);
    return true;
  }
  catch (error) {
    return error.code === "EPERM";
  }
}

/** Every process with its command line, to find the ones that run inside a worktree. */
function processes() {
  const listing = process.platform === "win32"
    ? execFileSync("powershell", ["-NoProfile", "-Command", "Get-CimInstance Win32_Process | ForEach-Object { \"$($_.ProcessId) $($_.CommandLine)\" }"], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 })
    : execFileSync("ps", ["-eo", "pid=,args="], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  return listing.split(/\r?\n/).map(line => /^\s*(\d+) (.*)$/.exec(line)).filter(Boolean).map(([, pid, command]) => ({
    pid: Number(pid),
    command: command.replaceAll("\\", "/").toLowerCase(),
  }));
}

/** The worktrees git lists under .claude/worktrees/, from `git worktree list --porcelain`. */
function worktrees() {
  return git("worktree", "list", "--porcelain").split(/\n{2,}/).map((block) => {
    const field = name => block.split("\n").find(line => line === name || line.startsWith(`${name} `))?.slice(name.length + 1);
    return {
      path: field("worktree"),
      head: field("HEAD"),
      branch: field("branch")?.replace("refs/heads/", ""),
      // The lock's reason as git prints it, "" for a bare `locked` line, undefined when not locked; describe() turns it
      // into the `lock` decide() takes.
      lockReason: field("locked"),
    };
  }).filter(tree => tree.path && same(tree.path).startsWith(`${same(home)}/`));
}

/** One worktree described as data for decide(): read-only git and process calls, whether or not it is wanted gone. */
function describe(tree, name, all) {
  const pid = Number(/\(pid (\d+)\)/.exec(tree.lockReason ?? "")?.[1]);
  return {
    name,
    named: named.has(agentId(name)),
    // A lock without a pid was set by hand: it counts as running, so only naming removes the worktree.
    lock: tree.lockReason === undefined
      ? null
      : { text: tree.lockReason, running: !(pid > 0) || running(pid) },
    uncommitted: git("-C", tree.path, "status", "--porcelain").split("\n").filter(Boolean).length,
    head: tree.head,
    unpushed: git("branch", "-r", "--contains", tree.head) === "",
    processes: all.filter(item => item.command.includes(`${same(tree.path)}/`)).map(item => item.pid),
  };
}

/** Folders a removal found in use, so the leftover-folder pass at the end does not print them a second time. */
const inUse = new Set();
let failed = 0;

/** Prints how a removal that threw ended: kept as in use, or failed (which turns the exit code to 1). */
function report(name, failure) {
  if (failure.action === "failed")
    failed++;
  console.log(`${failure.action} ${name}: ${failure.reason}`);
}

/**
 * Locks an in-use worktree again, as the harness had it, once the unlock before the removal is done. Git has often
 * dropped the worktree by then, leaving an empty folder (the leftover-folder pass at the end handles it); nothing is left to lock.
 */
function lockAgain(tree, name) {
  if (!worktrees().some(item => same(item.path) === same(tree.path)))
    return;
  try {
    // A bare `locked` line in the listing is a lock without a reason.
    const reason = tree.lockReason === ""
      ? []
      : ["--reason", tree.lockReason];
    git("worktree", "lock", ...reason, tree.path);
  }
  catch (error) {
    report(name, { action: "failed", reason: `could not lock it again: ${firstLine(error)}` });
  }
}

git("fetch", "--quiet", "--prune", "origin");
// A prune changes state, so a dry run leaves it.
if (!dryRun)
  git("worktree", "prune");
const all = processes();
const listedTrees = worktrees();
for (const tree of listedTrees) {
  const name = tree.path.split("/").pop();
  const verdict = decide(describe(tree, name, all), { unlocked });
  if (verdict.action === "keep") {
    console.log(`kept ${name}: ${verdict.reason}`);
    continue;
  }
  if (dryRun) {
    console.log(`would remove ${name} (${verdict.reason})`);
    continue;
  }
  try {
    if (tree.lockReason !== undefined)
      git("worktree", "unlock", tree.path);
    git("worktree", "remove", tree.path);
  }
  catch (error) {
    // Windows refuses to delete a file a process still holds; what is left is a folder for the next run.
    const failure = removalFailure({
      code: error.code,
      message: firstLine(error),
    });
    if (failure.action === "kept") {
      if (tree.lockReason !== undefined)
        lockAgain(tree, name);
      inUse.add(name);
    }
    report(name, failure);
    continue;
  }
  // The harness's own branch and the agent's, once their tips are safe on origin (checked above for the worktree's HEAD).
  const branches = [`worktree-${name}`, tree.branch].filter(branch => branch && git("branch", "--list", branch) !== "");
  for (const branch of new Set(branches)) {
    if (git("branch", "-r", "--contains", git("rev-parse", branch)) !== "")
      git("branch", "-D", branch);
  }
  console.log(`removed ${name}${branches.length > 0
    ? ` and ${[
      ...new Set(branches),
    ].join(", ")}`
    : ""} (${verdict.reason})`);
}

// A typo in a name must not read as "nothing to do".
for (const arg of unmatchedNames(names, listedTrees.map(tree => tree.path.split("/").pop())))
  console.log(`no worktree named ${arg}`);

// What a broken-off removal leaves: a folder without `.git`, which git no longer knows.
const listed = new Set(worktrees().map(tree => same(tree.path)));
for (const name of existsSync(home)
  ? readdirSync(home)
  : []) {
  const path = join(home, name);
  if (listed.has(same(path)) || inUse.has(name))
    continue;
  if (existsSync(join(path, ".git"))) {
    console.log(`kept ${name}: it has a .git, but git lists no such worktree; look at it`);
    continue;
  }
  if (dryRun) {
    console.log(`would delete ${name}: no longer a worktree`);
    continue;
  }
  try {
    rmSync(path, { recursive: true, force: true, maxRetries: 3 });
  }
  catch (error) {
    // A process still holds the empty folder (a shell that was started in it): the next run tries again.
    report(name, removalFailure({ code: error.code, message: error.message.split("\n")[0] }));
    continue;
  }
  console.log(`deleted ${name}: no longer a worktree`);
}

if (failed > 0)
  process.exitCode = 1;
