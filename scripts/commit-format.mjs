// Lints the messages of a commit range against commitlint.config.mjs, in one process (CLAUDE.md § Commits). The Attribution job calls it; the commit-msg hook runs the commitlint CLI on the one message.
//
//   node scripts/commit-format.mjs <a>..<b>
import { execFileSync } from "node:child_process";
import process from "node:process";
import { fileURLToPath } from "node:url";
import lint from "@commitlint/lint";
import load from "@commitlint/load";

// The commits up to here predate the rule, and the range skips them (CLAUDE.md § Commits): R0's history, and #285's
// 76e996b `ci(attribution): …`, whose scope is not listed and which is already pushed. Rewriting pushed commits is out
// of the scope of #290. A constant, not a branch name: it must stay put. It stays for good, because a range that holds
// those commits, such as redesign's merge into main at 1.0.0 (when main gets this check with the workflow), would fail
// on them. It moves later only to skip another pushed commit that breaks the rule, with the reason added here; never
// earlier.
export const ENFORCED_AFTER = "ab052c4f45ca530e4057fdcbb9e2deb782abc5ab";

/**
 * The arguments for `git log` that select the commits the rule applies to.
 *
 * @param range A revision range such as `a..b`.
 * @param enforcedAfter A commit; it and its ancestors are left out.
 * @returns The arguments for `git log`.
 */
export function selectArguments(range, enforcedAfter) {
  return [range, `^${enforcedAfter}`];
}

/**
 * The commits of `git log --format=%H%x00%B%x01`.
 *
 * @param text The output of `git log`.
 * @returns Each commit's SHA and full message.
 */
export function parseLog(text) {
  return text.split("\x01").map(entry => entry.replace(/^\n/, "")).filter(Boolean).map((entry) => {
    const [sha, message] = entry.split("\x00");
    return {
      sha,
      message: message.trim(),
    };
  });
}

let configuration;

/**
 * Lints one message against the repository's commitlint configuration.
 *
 * @param message The commit message.
 * @returns Whether it is valid, its errors as `{ name, message }`, and the help text the configuration prints under a failure.
 */
export async function lintMessage(message) {
  configuration ??= await load({}, {
    cwd: fileURLToPath(new URL("..", import.meta.url)),
  });
  const { valid, errors } = await lint(message, configuration.rules, {
    parserOpts: configuration.parserPreset?.parserOpts,
    // Without the plugins, lint throws "Found rules without implementation: scope-listed".
    plugins: configuration.plugins,
    defaultIgnores: configuration.defaultIgnores,
    ignores: configuration.ignores,
    helpUrl: configuration.helpUrl,
  });
  return { valid, errors, helpUrl: configuration.helpUrl };
}

async function main(args) {
  const [range] = args;
  if (!range || args.length > 1) {
    console.error("usage: node scripts/commit-format.mjs <a>..<b>");
    return 2;
  }
  const log = execFileSync("git", [
    "log",
    "--format=%H%x00%B%x01",
    ...selectArguments(range, ENFORCED_AFTER),
  ], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  let helpUrl = "";
  let failed = false;
  for (const { sha, message } of parseLog(log)) {
    const result = await lintMessage(message);
    if (result.valid)
      continue;
    failed = true;
    helpUrl = result.helpUrl;
    console.error(`${sha.slice(0, 7)}: ${message.split("\n")[0]}`);
    for (const error of result.errors) console.error(`  ${error.name}: ${error.message}`);
  }
  if (failed)
    console.error(helpUrl);
  return failed ? 1 : 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1])
  process.exit(await main(process.argv.slice(2)));
