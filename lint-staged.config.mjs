// What lint-staged runs on a commit (.husky/pre-commit). The decision, and why, are in scripts/lint-staged-eslint.mjs.
import { eslintCommands, eslintIgnoreCheck } from "./scripts/lint-staged-eslint.mjs";

// One instance for the whole commit: lint-staged calls the function again for every chunk of an oversize list.
const isIgnored = eslintIgnoreCheck();

export default {
  // "*" still sees every staged file (lint-staged matches it with dot: true); ESLint decides which are linted.
  "*": files => eslintCommands(files, isIgnored),
};
