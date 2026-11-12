// What lint-staged runs on a commit's staged paths: `eslint --fix` on the ones ESLint lints, and nothing when there
// are none (#284). `lint-staged.config.mjs` wires it.
//
// The old `.lintstagedrc.json` ran `eslint --fix` on every staged path. lint-staged splits the paths into chunks
// (`--max-arg-length 4000`), and each chunk started an ESLint process that loaded the whole Nuxt config, even when
// ESLint ignored every path in it: 1476 handoff files took 15 minutes. Here ESLint is asked once, in this process,
// which paths it ignores, so the ignore list stays in `eslint.config.mjs` and is copied nowhere.
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ESLint } from "eslint";

// The flags the commit gate rests on: `--max-warnings 0` is what refuses a warning.
const ESLINT_COMMAND = [
  "eslint",
  "--fix",
  "--no-warn-ignored",
  "--max-warnings",
  "0",
];

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/**
 * The commands lint-staged runs for a list of staged paths.
 * @param {string[]} files Staged paths, as lint-staged hands them over (absolute).
 * @param {(file: string) => Promise<boolean>} isIgnored Whether ESLint skips a path.
 * @returns {Promise<string[]>} No command when ESLint lints none of the paths, else one `eslint --fix` command.
 */
export async function eslintCommands(files, isIgnored) {
  const answers = await Promise.all(files.map(file => isIgnored(file)));
  const linted = files.filter((_file, index) => !answers[index]);
  if (linted.length === 0) {
    return [];
  }
  // lint-staged splits the string with string-argv and spawns without a shell: the quotes keep a path with a space whole.
  return [
    [
      ...ESLINT_COMMAND,
      ...linted.map(file => `"${file}"`),
    ].join(" "),
  ];
}

/**
 * Asks ESLint, with this repository's config, whether it skips a path: one ESLint instance, one answer per path.
 * lint-staged calls its config function again for every halving of an oversize list, so everything is memoised: the
 * Nuxt config loads once per commit, not once per call.
 * @param {string} [cwd] The folder of `eslint.config.mjs`, never `process.cwd()`: a hook can run from anywhere.
 * @returns {(file: string) => Promise<boolean>} True for a path in `ignores` and for one no config object matches (a
 * `.png`), the two ESLint's own CLI skips.
 */
export function eslintIgnoreCheck(cwd = REPO_ROOT) {
  /** @type {ESLint | undefined} */
  let eslint;
  const answers = new Map();

  async function ask(file) {
    eslint ??= new ESLint({ cwd });
    try {
      return await eslint.isPathIgnored(file);
    }
    catch (error) {
      // Never an answer of "ignored": a lint config that cannot load must refuse the commit, not let unlinted code in.
      throw new Error(
        `ESLint could not load its config in ${cwd}: ${error instanceof Error
          ? error.message
          : String(error)}\n`
          + "If .nuxt/eslint.config.mjs is missing, run `pnpm install` (its postinstall, `nuxt prepare`, writes it).",
        { cause: error },
      );
    }
  }

  return (file) => {
    if (!answers.has(file)) {
      answers.set(file, ask(file));
    }
    return answers.get(file);
  };
}
