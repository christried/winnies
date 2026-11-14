// Waits for a PR to merge and for the Vercel deployment of its merge commit, and says where it stands (the retro of
// Before R0, #253). Each session hand-rolled this wait before: `sleep 200` loops over `gh pr checks`, a scratch
// script for the merge and another for the Vercel status.
//
//   node scripts/deploy-wait.mjs <pr> [--until-done]
//
// Exit 0: merged, and the deployment of the merge commit is Ready (or the base does not deploy, by vercel.json).
// Exit 1: a check failed, the PR is a draft, in conflict, behind its base or closed, or the deployment failed; the
// line says what to do, and for a failed deployment it is three steps. Exit 2: still waiting after 2.5 minutes, so run
// it again; the line says whether a check runs again or GitHub still reports the PR blocked. Exit 3: green, up to date,
// not blocked and still open two minutes after its last check, so the agent merges it (docs/agents/delivery.md §
// Branches and merges).
// It goes by the newest attempt of each check (`filter=all` lists them all): a check that runs again is waiting, not red
// and not green. A PR moves, two merges can land at once, so it reads the PR a second time, five seconds later, before it
// says "behind" or exits 3, and the second read stands.
// `--until-done` is for a call that already runs in the background: it waits up to 25 minutes, as in ci-wait.mjs.
// It only reads: it merges nothing and changes nothing on GitHub. The decisions are scripts/deploy-verdict.mjs.
// Every read is `gh api` on a REST route, never `gh pr view`: that one asks GraphQL, which a cloud session is
// refused (docs/agents/cloud.md).
import { execFileSync } from "node:child_process";
import process from "node:process";
import { parseArgs } from "node:util";
import { ghErrorLine } from "./cli-helpers.mjs";
import { deploysFrom, deployVerdict, failedDeploymentLine, openLine, prVerdict, settledVerdict } from "./deploy-verdict.mjs";

const USAGE = "usage: node scripts/deploy-wait.mjs <pr> [--until-done]";
const POLL_MS = 15_000;
// The pause between the two reads before "behind" and exit 3: long enough for a merge that was landing to land.
const CONFIRM_MS = 5_000;

let parsed;
try {
  parsed = parseArgs({
    args: process.argv.slice(2),
    allowPositionals: true,
    strict: true,
    options: {
      "until-done": { type: "boolean", default: false },
    },
  });
}
catch (error) {
  // Node adds a hint about `--` to the first sentence.
  console.log(`${error.message.split(/\.\s|\n/)[0].replace(/\.$/, "")}.\n${USAGE}`);
  process.exit(1);
}
const pr = parsed.positionals[0];
if (parsed.positionals.length !== 1 || !/^\d+$/.test(pr)) {
  console.log(`One PR number, please.\n${USAGE}`);
  process.exit(1);
}
const CALL_MS = parsed.values["until-done"]
  ? 25 * 60_000
  : 150_000;

function gh(...args) {
  return execFileSync("gh", args, {
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  });
}
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
function done(code, line) {
  console.log(line);
  process.exit(code);
}
// A failed gh call ends the script in one line (no PR of that number, gh signed out, an error page from GitHub), not
// with a stack trace and never with the page.
function read(what, ...args) {
  try {
    return JSON.parse(gh(...args));
  }
  catch (error) {
    return done(1, `${what} failed: ${ghErrorLine(error)}`);
  }
}

/** vercel.json at the merge commit, or null when the commit has none. */
function vercelConfig(sha) {
  try {
    return JSON.parse(gh("api", "-H", "Accept: application/vnd.github.raw", `repos/{owner}/{repo}/contents/vercel.json?ref=${sha}`));
  }
  catch (error) {
    if (/HTTP 404/.test(String(error.stderr)))
      return null;
    return done(1, `reading vercel.json at ${sha.slice(0, 7)} failed: ${ghErrorLine(error)}`);
  }
}

const started = Date.now();
const timeLeft = () => Date.now() - started < CALL_MS;
console.log(`waiting for #${pr} to merge and deploy …`);

/** One read of the PR and of every attempt of its checks, decided; the PR comes with it, as the standing read's is the one used after. */
function readOnce() {
  const pull = read(`reading #${pr}`, "api", `repos/{owner}/{repo}/pulls/${pr}`);
  // One page, as before: every attempt of each check, in the tens in this repository, far below 100. Rows beyond the
  // first 100 are not read.
  const runs = read(`reading the checks of #${pr}`, "api", `repos/{owner}/{repo}/commits/${pull.head.sha}/check-runs?per_page=100&filter=all`, "--jq", ".check_runs");
  return {
    ...prVerdict(pull, runs, Date.now()),
    pull,
  };
}

let pull;
for (;;) {
  const now = await settledVerdict(readOnce, () => sleep(CONFIRM_MS));
  pull = now.pull;
  const { verdict, checks } = now;
  const base = pull.base.ref;
  if (verdict === "merged")
    break;
  if (verdict === "closed")
    done(1, `#${pr} was closed without a merge.`);
  if (verdict === "draft")
    done(1, `#${pr} is a draft and never merges by itself: \`gh pr ready ${pr}\` once it is.`);
  if (verdict === "red")
    done(1, `#${pr} is red (${checks.join(", ")}): \`node scripts/ci-wait.mjs ${pull.head.sha}\` shows the failing output.`);
  if (verdict === "conflict")
    done(1, `#${pr} conflicts with ${base}: merge ${base} into its branch.`);
  if (verdict === "behind")
    done(1, `#${pr} is behind ${base}, so auto-merge waits: merge ${base} into its branch and push.`);
  if (verdict === "merge-yourself") {
    done(3, base === "main"
      ? `#${pr} is green and up to date: merging into main is the human's, so hand them \`! gh pr merge ${pr} --merge\`.`
      : `#${pr} is green, up to date and still open two minutes after its last check: merge it yourself, \`gh pr merge ${pr} --merge\` (docs/agents/delivery.md § Branches and merges).`);
  }
  if (!timeLeft())
    done(2, openLine(pr, now));
  await sleep(POLL_MS);
}

const sha = pull.merge_commit_sha;
const short = sha.slice(0, 7);
const base = pull.base.ref;
if (!deploysFrom(vercelConfig(sha), base))
  done(0, `merged into ${base} at ${short}; ${base} does not deploy (vercel.json), so there is nothing to wait for.`);

for (;;) {
  const statuses = read(`the commit status of ${short}`, "api", `repos/{owner}/{repo}/commits/${sha}/status`, "--jq", ".statuses");
  const { verdict, url, deployment } = deployVerdict(statuses);
  if (verdict === "ready")
    done(0, `merged into ${base} at ${short}, and its deployment is Ready: ${url}`);
  if (verdict === "failed")
    done(1, failedDeploymentLine({ base, sha, url, deployment }));
  if (!timeLeft())
    done(2, `merged into ${base} at ${short}; Vercel is still building it: run this again.`);
  await sleep(POLL_MS);
}
