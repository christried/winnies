// Keeps agents out of the repository's record: no commit, tag, PR or issue text may credit an agent, and no commit may
// be authored or committed by one (CLAUDE.md § Attribution). Four callers share the patterns below:
//
//   node scripts/attribution.mjs message <file>   .husky/commit-msg: the commit message about to be recorded
//   node scripts/attribution.mjs identity         .husky/pre-commit: the author and committer git would record
//   node scripts/attribution.mjs push             .husky/pre-push: every commit about to leave this machine (stdin)
//   node scripts/attribution.mjs range <a>..<b>   CI: every commit of a PR or a push
//   node scripts/attribution.mjs text <file>      CI: a PR's title and body
//   node scripts/attribution.mjs tool             Claude Code PreToolUse hook: a shell command or a GitHub connector call before it runs (stdin)
//
// Exit 0: clean. Exit 1: a finding, one line each. `tool` always exits 0 and answers in JSON, as hooks do.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const AGENT_NAMES = "claude|anthropic|codex|openai|copilot|cursoragent|cursor agent|devin|gemini|aider|windsurf";

// Any co-author trailer: an allowlist of people would be one more thing an agent's name could slip into.
const CO_AUTHOR_RULE = [/^[ \t>*-]*co-authored-by\s*:/im, "a Co-Authored-By trailer"];

/**
 * What no commit message, merge commit or PR title may contain, each with the words the finding is reported in.
 * A PR body, an issue or a comment may name the agent that wrote it, so only `CO_AUTHOR_RULE` holds there (#277).
 */
const TEXT_RULES = [
  CO_AUTHOR_RULE,
  [/^[ \t>*-]*(?:claude-session|generated-by|assisted-by|ai-assisted-by)\s*:/im, "an agent trailer"],
  [
    new RegExp(`(?:generated|written|created|authored|made)\\s+(?:with|by)\\s+[[*_]*(?:${AGENT_NAMES})`, "i"),
    "a \"generated with\" line",
  ],
  [/noreply@anthropic\.com/i, "an Anthropic no-reply address"],
  [/claude\.ai\/code|claude\.com\/claude-code/i, "a Claude Code link"],
  [/\u{1F916}/u, "the robot emoji that marks agent output"],
];

const IDENTITY_RULE = new RegExp(`\\b(?:${AGENT_NAMES})\\b|@anthropic\\.com|@openai\\.com`, "i");

/**
 * The attribution a text carries.
 *
 * @param text A commit message, a PR title and body, or a comment.
 * @returns One finding per broken rule; empty when the text is clean.
 */
export function findAttribution(text) {
  return TEXT_RULES.filter(([pattern]) => pattern.test(text)).map(([, finding]) => finding);
}

/**
 * The co-authorship a PR body, an issue or a comment claims. Naming the agent that wrote it is allowed there (#277).
 *
 * @param text A PR body, an issue or a comment.
 * @returns The finding when the text carries a co-author trailer; empty otherwise.
 */
function findCoAuthorship(text) {
  return CO_AUTHOR_RULE[0].test(text)
    ? [CO_AUTHOR_RULE[1]]
    : [];
}

/**
 * Whether a git identity belongs to an agent.
 *
 * @param identity A name and an email address as git prints them, e.g. `Chris <chris@example.com>`.
 * @returns True when the name or the address names an agent or its vendor.
 */
export function isAgentIdentity(identity) {
  return IDENTITY_RULE.test(identity);
}

/**
 * What a shell command would do against the rule, judged before it runs.
 *
 * Only commands that write to git history or to GitHub are judged, so reading or searching for these words stays possible.
 *
 * @param command The command line of a Bash or PowerShell tool call.
 * @returns One finding per problem; empty when the command may run.
 */
export function findInCommand(command) {
  const writesHistory = /\bgit\b[^\n|;&]+\b(?:commit|merge|tag|notes|rebase|cherry-pick|revert|am|push|config)\b/.test(command);
  const writesGitHub = /\bgh\b[^\n|;&]+\b(?:pr|issue|release|api|repo|gist)\b/.test(command);
  if (!writesHistory && !writesGitHub)
    return [];
  // A trailer inside `-m "…"` or a heredoc does not start its line in the command, so the line anchors go.
  // A command that only writes to GitHub writes a body or a comment, where only a co-author is refused (#277).
  const findings = (writesHistory
    ? TEXT_RULES
    : [CO_AUTHOR_RULE])
    .map(([pattern, finding]) => [
      new RegExp(pattern.source.replace("^[ \\t>*-]*", ""), pattern.flags.replace("m", "")),
      finding,
    ])
    .filter(([pattern]) => pattern.test(command))
    .map(([, finding]) => finding);
  if (writesHistory) {
    // On git's own line only: a commit message in a heredoc may talk about the flag.
    if (/\bgit\b[^\n|;&]*\s--no-verify\b|\bcommit\b[^\n|;&]*\s-[a-mo-z]*n[a-z]*\b/.test(command))
      findings.push("--no-verify, which skips the attribution hooks");
    if (/\bHUSKY=0\b|core\.hooksPath/i.test(command))
      findings.push("a switch that turns the git hooks off");
    if (new RegExp(`--author[= ]["']?[^"'\\n]*(?:${AGENT_NAMES})|user\\.(?:name|email)\\s["']?[^"'\\n]*(?:${AGENT_NAMES})|GIT_(?:AUTHOR|COMMITTER)_(?:NAME|EMAIL)=["']?[^"'\\s]*(?:${AGENT_NAMES})`, "i").test(command))
      findings.push("an agent as author or committer");
  }
  return findings;
}

/** The fields the GitHub connector's tools write to GitHub: an issue, a comment, a PR, a review, a merge commit. */
const CONNECTOR_TEXT = [
  // These end up in a commit: a merge commit, a file commit, and a PR title, which the merge commit takes as its
  // message. A `body` (an issue, a comment, a PR, a review) is judged by `findCoAuthorship` alone (#277).
  "title",
  "commit_title",
  "commit_message",
  "message",
];

/**
 * What a tool call would do against the rule, judged before it runs.
 *
 * A cloud session writes to GitHub through the GitHub connector, not through `gh` (docs/agents/cloud.md), so its
 * text never passes a shell command.
 *
 * @param {string} name   The tool's name: `Bash`, `PowerShell`, or a connector tool such as `mcp__github__issue_write`.
 * @param {Record<string, unknown>} input  The tool's input.
 * @returns {string[]} One finding per problem; empty when the call may run.
 */
export function findInToolCall(name, input = {}) {
  if (typeof input.command === "string")
    return findInCommand(input.command);
  if (!/^mcp__.*github/i.test(name ?? ""))
    return [];
  const commitText = CONNECTOR_TEXT.map(field => input[field]).filter(text => typeof text === "string").join("\n");
  const findings = findAttribution(commitText);
  if (typeof input.body === "string")
    findings.push(...findCoAuthorship(input.body).filter(finding => !findings.includes(finding)));
  return findings;
}

const git = (...args) => execFileSync("git", args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });

/**
 * The findings of every commit a `git log` selection names: its message, its author and its committer.
 *
 * @param selection Arguments for `git log`, e.g. `["main..HEAD"]`.
 * @returns One line per finding, starting with the commit's short SHA.
 */
function findInCommits(selection) {
  const log = git("log", "--format=%h%x00%an <%ae>%x00%cn <%ce>%x00%B%x01", ...selection);
  return log.split("\x01").map(entry => entry.replace(/^\n/, "")).filter(Boolean).flatMap((entry) => {
    const [sha, author, committer, message] = entry.split("\x00");
    return [
      ...findAttribution(message).map(finding => `${sha}: the message has ${finding}`),
      ...(isAgentIdentity(author)
        ? [`${sha}: the author is an agent (${author})`]
        : []),
      ...(isAgentIdentity(committer)
        ? [`${sha}: the committer is an agent (${committer})`]
        : []),
    ];
  });
}

/**
 * The commits a push would publish, from what git writes to a pre-push hook's stdin.
 *
 * @param stdin Lines of `<local ref> <local sha> <remote ref> <remote sha>`.
 * @returns One `git log` selection per pushed ref; a deleted ref has none.
 */
export function pushSelections(stdin) {
  const none = /^0+$/;
  return stdin.split("\n").map(line => line.trim().split(/\s+/)).filter(parts => parts.length === 4).flatMap(([, local, , remote]) => {
    if (none.test(local))
      return [];
    // A new branch has no remote side: everything no remote branch has yet.
    return [
      none.test(remote)
        ? [local, "--not", "--remotes"]
        : [`${remote}..${local}`],
    ];
  });
}

function main([mode, argument]) {
  if (mode === "tool") {
    const call = JSON.parse(readFileSync(0, "utf8"));
    const findings = findInToolCall(call.tool_name, call.tool_input);
    if (findings.length > 0) {
      console.log(JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: "deny",
          permissionDecisionReason: `No commit names an agent, and nothing claims one as co-author (CLAUDE.md § Attribution). This call has ${findings.join(", ")}. Remove it and run it again.`,
        },
      }));
    }
    return 0;
  }
  const findings = {
    message: () => findAttribution(readFileSync(argument, "utf8").split("\n").filter(line => !line.startsWith("#")).join("\n")).map(finding => `the commit message has ${finding}`),
    text: () => findAttribution(readFileSync(argument, "utf8")).map(finding => `the text has ${finding}`),
    // CI: a PR's body, which may name the agent that wrote it but not claim it as co-author (#277).
    body: () => findCoAuthorship(readFileSync(argument, "utf8")).map(finding => `the PR body has ${finding}`),
    identity: () => ["GIT_AUTHOR_IDENT", "GIT_COMMITTER_IDENT"].map(name => [
      name,
      git("var", name).replace(/ \d+ [+-]\d+\s*$/, ""),
    ]).filter(([, identity]) => isAgentIdentity(identity)).map(([name, identity]) => `${name} is an agent (${identity})`),
    range: () => findInCommits([argument]),
    push: () => pushSelections(readFileSync(0, "utf8")).flatMap(findInCommits),
  }[mode]?.();
  if (!findings) {
    console.error("usage: node scripts/attribution.mjs message <file> | identity | push | range <a>..<b> | text <file> | tool");
    return 2;
  }
  if (findings.length === 0)
    return 0;
  console.error("No commit names an agent or has one as author or committer, and nothing claims one as co-author (CLAUDE.md § Attribution).");
  for (const finding of findings) console.error(`  ${finding}`);
  return 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  process.exit(main(process.argv.slice(2)));
