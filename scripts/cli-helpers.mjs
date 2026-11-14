// What branch-prune.mjs and worktree-clean.mjs, the two scripts that delete things, both do before and around their git
// calls: refuse a flag they do not know, run git, and name the line of a failure that says what went wrong. In one place
// so the two cannot drift apart (#290 review). It also holds the line a failed `gh` call becomes (ghErrorLine), for the
// two scripts that wait on GitHub.
import { execFileSync } from "node:child_process";
import process from "node:process";
import { parseArgs } from "node:util";

/**
 * Runs git and returns its trimmed output.
 *
 * @param {...string} args  git's arguments, one array element each: no shell is involved
 * @returns {string}  stdout, trimmed
 */
export function git(...args) {
  return execFileSync("git", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 64 * 1024 * 1024,
  }).trim();
}

/**
 * The line of a failed call that says what went wrong: git prints a `To <url>` or a hint line before a refusal, so a line
 * that starts with `!`, `error:` or `fatal:` wins over the first.
 *
 * @param {{ stderr?: unknown, message?: string }} error  what a failed `execFileSync` threw
 * @returns {string}  one line
 */
export function firstLine(error) {
  const lines = String(error.stderr ?? error.message).trim().split("\n").map(line => line.trim());
  return lines.find(line => /^(?:!|error:|fatal:)/.test(line)) ?? lines[0];
}

/**
 * The line a failed `gh` call becomes, for deploy-wait.mjs and ci-wait.mjs. A 502 from GitHub can answer with a whole HTML
 * page, which must never reach an agent's context: a page costs one line, a status with it when `gh` printed one.
 *
 * @param {{ stderr?: unknown, message?: string }} error  what a failed `execFileSync("gh", …)` or the `JSON.parse` of its output threw
 * @returns {string}  one line, no markup, at most 160 characters
 */
export function ghErrorLine(error) {
  // An answer cut off or not JSON: what was read is no use, whatever it was.
  if (error instanceof SyntaxError)
    return "GitHub's answer was cut off or is not JSON";
  const text = String(error.stderr || error.message);
  if (/<\s*(?:!doctype|html|head|body|title)\b/i.test(text)) {
    const status = /HTTP (\d{3})\b/.exec(text);
    return status
      ? `GitHub answered with an error page (HTTP ${status[1]})`
      : "GitHub answered with an error page";
  }
  const line = (text.split("\n").find(candidate => candidate.trim() !== "") ?? "")
    .replace(/^\s*gh: /, "")
    .replace(/\s+/g, " ")
    .trim();
  return line.length > 160
    ? `${line.slice(0, 159)}…`
    : line;
}

/**
 * What a script says about a flag it does not know: the error's first sentence, then the usage line. Node adds a hint
 * about `--` to the first sentence, which means nothing here.
 *
 * @param {Error} error  what `parseArgs` threw
 * @param {string} usage  the script's usage line
 * @returns {string}  the message, two lines
 */
export function flagError(error, usage) {
  return `${error.message.split(/\.\s|\n/)[0].replace(/\.$/, "")}.\n${usage}`;
}

/**
 * Reads the command line before any git call, so that a flag the script does not know stops it instead of being read as
 * a real run. Exits 2 with the usage on stderr when it does.
 *
 * @param {object} input
 * @param {Record<string, { type: "boolean", default?: boolean }>} input.options  the flags, as `parseArgs` takes them
 * @param {boolean} input.allowPositionals  whether names may follow the flags
 * @param {string} input.usage  the usage line
 * @returns {{ values: Record<string, boolean | undefined>, positionals: string[] }}  the flags and the names
 */
export function parseFlags({ options, allowPositionals, usage }) {
  try {
    return parseArgs({
      args: process.argv.slice(2),
      allowPositionals,
      strict: true,
      options,
    });
  }
  catch (error) {
    console.error(flagError(error, usage));
    return process.exit(2);
  }
}
