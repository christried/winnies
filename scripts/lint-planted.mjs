// Lints a planted snippet with this repository's own ESLint config, for the tests of the lint rules (#360, #361, #363):
// a snippet is linted as if it lived at a path, so the config picks its rules by that path, and the test asks whether one
// rule reports it. The body lives here once, in a module that is no test and no story, so no test repeats it (#362).
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ESLint } from "eslint";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** @type {ESLint | undefined} */
let eslint;

/**
 * The error for an ESLint that could not load its config: it names the fix, and never lets a test pass.
 * @param {string} filePath The planted path the test asked about.
 * @param {unknown} error What ESLint threw.
 * @returns {Error} The error to throw, with the original as its cause.
 */
function configError(filePath, error) {
  return new Error(
    `ESLint could not load its config to lint ${filePath}: ${error instanceof Error
      ? error.message
      : String(error)}\n`
      + "If .nuxt/eslint.config.mjs is missing, run `pnpm install` (its postinstall, `nuxt prepare`, writes it).",
    { cause: error },
  );
}

/**
 * Lints a text through this repository's own ESLint config, as if a file at `filePath` held it, and returns the messages
 * of one rule.
 * @param {string} text The planted snippet.
 * @param {string} filePath Where the snippet pretends to live, relative to the repository root with forward slashes
 * (`stories/ui/planted.stories.ts`). The file need not exist; only the path matters, because the config picks its rules
 * by path.
 * @param {string} ruleId The rule whose messages to return (`no-restricted-syntax`). Every other rule is dropped: a
 * planted snippet is not formatted, so the stylistic rules always have something to say.
 * @returns {Promise<import("eslint").Linter.LintMessage[]>} The rule's messages (`message`, `line`, `severity`), empty
 * when the rule is silent.
 */
export async function lintPlanted(text, filePath, ruleId) {
  // One ESLint instance per module instance: its config loads once, on the first call.
  eslint ??= new ESLint({ cwd: REPO_ROOT });
  const absolute = path.resolve(REPO_ROOT, filePath);

  let ignored;
  try {
    ignored = await eslint.isPathIgnored(absolute);
  }
  catch (error) {
    throw configError(filePath, error);
  }
  // Thrown, never answered with "no messages": a rule that is silent on an ignored path would pass for the wrong reason.
  if (ignored) {
    throw new Error(`${filePath} is ignored by eslint.config.mjs, so a snippet planted there is never linted`);
  }

  let results;
  try {
    results = await eslint.lintText(text, { filePath: absolute });
  }
  catch (error) {
    throw configError(filePath, error);
  }

  const messages = results[0].messages;
  // A snippet that does not parse reports no rule at all: say so, instead of returning an empty list.
  const fatal = messages.find(message => message.fatal);
  if (fatal) {
    throw new Error(`The snippet planted at ${filePath} does not parse (line ${fatal.line}): ${fatal.message}`);
  }
  return messages.filter(message => message.ruleId === ruleId);
}
