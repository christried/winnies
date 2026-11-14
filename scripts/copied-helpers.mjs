// The top-level functions that are in two files under stories/ and tests/, and where each belongs instead.
// Pure: sources in, problems out, so copied-helpers.test.mjs runs the same function over the real files and over planted
// text. Test tooling, not app code.

import { parseSync } from "oxc-parser";

/**
 * The longest expression, whitespace removed, a function may be and still not count as a helper. Today's tree has the
 * one-line spy every component story declares (`args as Spied`, 11 characters, each file casting to its own `Spied`), and
 * the shortest function that is a real copy has 27: 20 sits in that gap, so a copy is not let through by a number
 * chosen higher than the tree needs.
 */
export const EXEMPT_LENGTH = 20;

const SUPPORT_MODULE = /\/support\//;
const API_HELPERS = "tests/api/helpers.ts";

/**
 * Where a helper that is in these files belongs, first match wins: a support module one of them already is, or else the
 * shared folder that fits where they all live.
 * @param {string[]} paths the group's files, relative to the root with forward slashes
 * @returns {{ module: string, already: boolean }} the module or folder to import from, and whether it is a file of the
 *   group (the helper is already there)
 */
export function helperHome(paths) {
  const support = paths.find(path => SUPPORT_MODULE.test(path) || path === API_HELPERS);
  if (support) {
    return { module: support, already: true };
  }
  const under = folder => paths.every(path => path.startsWith(folder));
  if (under("stories/")) {
    return { module: "stories/support/", already: false };
  }
  if (under("tests/api/")) {
    return { module: API_HELPERS, already: false };
  }
  if (under("tests/e2e/")) {
    return { module: "tests/e2e/support/", already: false };
  }
  if (under("tests/")) {
    return { module: "tests/support/", already: false };
  }
  // The stories run in a browser and the tests in node: a helper both import has to run in both.
  return { module: "stories/support/ or tests/support/", already: false };
}

const FUNCTION_INITS = new Set(["ArrowFunctionExpression", "FunctionExpression"]);
function withoutPositions(key, value) {
  return key === "start" || key === "end"
    ? undefined
    : value;
}

/**
 * The top-level functions of one file: a function declaration, and a const, let or var whose value is an arrow or a
 * function expression, exported or not. A function inside another, a method, an anonymous default export and an
 * overload without a body are not found.
 * @param {string} path the file's path, for the parser (its extension gives the language) and for the error
 * @param {string} source the file's text
 * @returns {{ name: string, fingerprint: string, expression: string | null }[]} each function's name, what identifies it
 *   (parameters, body, async, generator, without positions, so whitespace and comments do not count) and its one
 *   expression, whitespace removed, or null when its body is more than that
 */
function functionsOf(path, source) {
  const { program, errors } = parseSync(path, source, { preserveParens: false });
  if (errors.length > 0) {
    throw new Error(`${path} does not parse: ${errors[0].message}`);
  }
  const found = [];
  const add = (name, fn) => {
    const body = fn.body;
    const lone = body.type === "BlockStatement" && body.body.length === 1 && body.body[0].type === "ReturnStatement"
      ? body.body[0].argument
      : null;
    const expression = body.type === "BlockStatement"
      ? lone
      : body;
    found.push({
      name,
      fingerprint: JSON.stringify({
        params: fn.params,
        body,
        async: fn.async,
        generator: fn.generator,
      }, withoutPositions),
      expression: expression
        ? source.slice(expression.start, expression.end).replaceAll(/\s+/g, "")
        : null,
    });
  };
  for (const statement of program.body) {
    const declaration = statement.type === "ExportNamedDeclaration" || statement.type === "ExportDefaultDeclaration"
      ? statement.declaration
      : statement;
    if (declaration?.type === "FunctionDeclaration" && declaration.id) {
      add(declaration.id.name, declaration);
    }
    else if (declaration?.type === "VariableDeclaration") {
      for (const declarator of declaration.declarations) {
        if (declarator.id.type === "Identifier" && declarator.init && FUNCTION_INITS.has(declarator.init.type)) {
          add(declarator.id.name, declarator.init);
        }
      }
    }
  }
  return found;
}

/**
 * "A, B and C": the paths as prose.
 * @param {string[]} paths the paths
 * @returns {string} the paths joined for a sentence
 */
function listed(paths) {
  return paths.length === 1
    ? paths[0]
    : `${paths.slice(0, -1).join(", ")} and ${paths.at(-1)}`;
}

/**
 * The helpers copied into a second file, one problem for each. A group is the top-level functions with the same
 * parameters and body (the name and the return type do not count, so the same body under two names is a copy) in two or
 * more different files; two equal functions in one file are not a group. A group whose functions are one expression of
 * at most EXEMPT_LENGTH characters is not a helper and passes.
 * @param {{ path: string, source: string }[]} files every file to read, the path relative to the root with forward slashes
 * @returns {string[]} one problem for each group, naming its files and where the helper belongs, in the order the groups
 *   are first met
 */
export function copiedHelpers(files) {
  const groups = new Map();
  for (const { path, source } of files) {
    for (const fn of functionsOf(path, source)) {
      const group = groups.get(fn.fingerprint) ?? [];
      group.push({ ...fn, path });
      groups.set(fn.fingerprint, group);
    }
  }
  const problems = [];
  for (const group of groups.values()) {
    const paths = [
      ...new Set(group.map(fn => fn.path)),
    ].toSorted();
    const short = group.every(fn => fn.expression !== null && fn.expression.length <= EXEMPT_LENGTH);
    if (paths.length < 2 || short) {
      continue;
    }
    const names = [
      ...new Set(group.map(fn => `\`${fn.name}\``)),
    ].join(" / ");
    const { module, already } = helperHome(paths);
    const where = already
      ? `It is already in ${module}: import it from there`
      : `Define it once in ${module} and import it in ${paths.length === 2
        ? "both"
        : paths.length === 3
          ? "all three"
          : `all ${paths.length}`}`;
    problems.push(`copied helper ${names}: the same parameters and body are in ${listed(paths)}. ${where}: a copy never merges (CODING_STANDARDS.md § Tests).`);
  }
  return problems;
}
