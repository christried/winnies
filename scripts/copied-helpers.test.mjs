import { existsSync, readdirSync, readFileSync } from "node:fs";
import process from "node:process";
import { describe, expect, it } from "vitest";
import { copiedHelpers, EXEMPT_LENGTH, helperHome } from "./copied-helpers.mjs";

// "A copy never merges" (CODING_STANDARDS.md § Tests): a helper a second story or test file needs moves into the shared
// module in the PR that needs it twice. This test is what keeps that rule: it reads every file under stories/ and
// tests/ and fails when one top-level function, parameters and body, is in two files. The decisions are in
// copied-helpers.mjs (pure), so the cases below run them over planted sources and the last block runs them over the tree.

const ROOT = process.cwd();
const SCANNED = ["stories", "tests"];
const EXTENSIONS = /\.(?:ts|mts|mjs|js)$/;
const SKIPPED_FOLDERS = new Set(["__screenshots__", "node_modules"]);

/**
 * Every script file under a folder of the repository, as `{ path, source }`, the path relative to the root with forward
 * slashes and the list sorted.
 * @param {string} folder a folder relative to the root
 * @returns {{ path: string, source: string }[]} the files, sorted by path
 */
function filesUnder(folder) {
  if (!existsSync(`${ROOT}/${folder}`)) {
    return [];
  }
  return readdirSync(`${ROOT}/${folder}`, { withFileTypes: true })
    .flatMap((entry) => {
      const path = `${folder}/${entry.name}`;
      if (entry.isDirectory()) {
        return SKIPPED_FOLDERS.has(entry.name)
          ? []
          : filesUnder(path);
      }
      return EXTENSIONS.test(entry.name)
        ? [
            {
              path,
              source: readFileSync(`${ROOT}/${path}`, "utf8"),
            },
          ]
        : [];
    })
    .toSorted((a, b) => a.path.localeCompare(b.path));
}

const BLOCK = `function row(...body: VNode[]): VNode {
  const gap = 16;
  return h("div", { style: \`display:flex;gap:\${gap}px\` }, body);
}`;
const BLOCK_REFORMATTED = `function row(...body: VNode[]): VNode {
  // The same helper, written by someone with other habits.
  const gap = 16;

  return h("div", { style: \`display:flex;gap:\${gap}px\` }, body);
}`;
const EXPRESSION_20 = "a.b.c.d.e.f.g.h.i.jk";
const EXPRESSION_21 = "a.b.c.d.e.f.g.h.i.jkl";

/**
 * A planted file.
 * @param {string} path the path under the root
 * @param {string} source the file's text
 * @returns {{ path: string, source: string }} the pair copiedHelpers reads
 */
const file = (path, source) => ({ path, source });

describe("copiedHelpers", () => {
  it("fails one block body in two story files, however it is written, naming both files and the module", () => {
    const problems = copiedHelpers([
      file("stories/ui/a.stories.ts", BLOCK),
      file("stories/ui/b.stories.ts", BLOCK_REFORMATTED),
    ]);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("`row`");
    expect(problems[0]).toContain("stories/ui/a.stories.ts");
    expect(problems[0]).toContain("stories/ui/b.stories.ts");
    expect(problems[0]).toContain("stories/support/");
    expect(problems[0]).toContain("CODING_STANDARDS.md");
  });

  it("tells a group that already has a support module to import it from there", () => {
    const [problem] = copiedHelpers([
      file("stories/support/ui-kit.ts", BLOCK),
      file("stories/ui/a.stories.ts", BLOCK),
    ]);
    expect(problem).toContain("already in stories/support/ui-kit.ts");
    expect(problem).toContain("import it from there");
  });

  it("passes a one-line callback in two files", () => {
    expect(copiedHelpers([
      file("stories/ui/a.stories.ts", "const spied = (args: unknown) => args as Spied;"),
      file("stories/ui/b.stories.ts", "const spied = (args: unknown) => args as Spied;"),
    ])).toEqual([]);
  });

  it("passes the same name with two bodies", () => {
    expect(copiedHelpers([
      file("stories/ui/a.stories.ts", "function row(a: number) { const b = a + 1; return b * 2; }"),
      file("stories/ui/b.stories.ts", "function row(a: number) { const b = a + 2; return b * 3; }"),
    ])).toEqual([]);
  });

  it("fails the same body under two names, naming both names", () => {
    const body = "(token: string) => Number.parseFloat(resolved(token))";
    const problems = copiedHelpers([
      file("stories/ui/a.stories.ts", `const ms = ${body};`),
      file("stories/ui/b.stories.ts", `const seconds = ${body};`),
    ]);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("`ms` / `seconds`");
  });

  it("passes two equal bodies inside one file", () => {
    expect(copiedHelpers([
      file("stories/ui/a.stories.ts", `${BLOCK}\n${BLOCK.replace("row", "line")}`),
    ])).toEqual([]);
  });

  it("exempts an expression of 20 characters and fails one of 21", () => {
    expect(EXEMPT_LENGTH).toBe(20);
    expect(EXPRESSION_20.replaceAll(/\s+/g, "")).toHaveLength(EXEMPT_LENGTH);
    expect(EXPRESSION_21.replaceAll(/\s+/g, "")).toHaveLength(EXEMPT_LENGTH + 1);
    const plant = expression => [
      file("stories/ui/a.stories.ts", `const f = (a: number) => ${expression};`),
      file("stories/ui/b.stories.ts", `const f = (a: number) => ${expression};`),
    ];
    expect(copiedHelpers(plant(EXPRESSION_20))).toEqual([]);
    expect(copiedHelpers(plant(EXPRESSION_21))).toHaveLength(1);
  });

  it("counts whitespace out of the length and a lone return as its expression", () => {
    const spaced = EXPRESSION_20.replaceAll(".", " . ");
    const plant = body => [
      file("stories/ui/a.stories.ts", `function f(a: number) ${body}`),
      file("stories/ui/b.stories.ts", `function f(a: number) ${body}`),
    ];
    expect(copiedHelpers(plant(`{ return ${spaced}; }`))).toEqual([]);
    expect(copiedHelpers(plant(`{ return ${EXPRESSION_21}; }`))).toHaveLength(1);
    expect(copiedHelpers(plant(`{ const x = 1; return ${EXPRESSION_20}; }`))).toHaveLength(1);
  });

  it("passes the same body with another parameter type, and async against plain", () => {
    expect(copiedHelpers([
      file("stories/ui/a.stories.ts", BLOCK),
      file("stories/ui/b.stories.ts", BLOCK.replace("VNode[]", "Node[]")),
    ])).toEqual([]);
    expect(copiedHelpers([
      file("stories/ui/a.stories.ts", "function load(a: number) { const b = a + 1; return b * 2; }"),
      file("stories/ui/b.stories.ts", "async function load(a: number) { const b = a + 1; return b * 2; }"),
    ])).toEqual([]);
  });

  it("finds an exported function and an exported arrow, and not one declared inside another function", () => {
    const exported = copiedHelpers([
      file("stories/ui/a.stories.ts", `export ${BLOCK}`),
      file("stories/ui/b.stories.ts", `export const row = (...body: VNode[]): VNode => {\n  const gap = 16;\n  return h("div", { style: \`display:flex;gap:\${gap}px\` }, body);\n};`),
    ]);
    expect(exported).toHaveLength(1);
    // The outer functions differ, so only the equal function inside them could make a group.
    const nested = last => `function outer() {\n  ${BLOCK}\n  return ${last};\n}`;
    expect(copiedHelpers([
      file("stories/ui/a.stories.ts", nested("row()")),
      file("stories/ui/b.stories.ts", nested("row(1)")),
    ])).toEqual([]);
  });

  it("names one problem for three files", () => {
    const problems = copiedHelpers([
      file("stories/ui/a.stories.ts", BLOCK),
      file("stories/ui/b.stories.ts", BLOCK),
      file("stories/motion/c.stories.ts", BLOCK),
    ]);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("stories/motion/c.stories.ts, stories/ui/a.stories.ts and stories/ui/b.stories.ts");
    expect(problems[0]).toContain("all three");
  });

  it("throws, naming the file, on a file that does not parse", () => {
    expect(() => copiedHelpers([
      file("stories/ui/broken.stories.ts", "function ("),
    ])).toThrow("stories/ui/broken.stories.ts");
  });
});

describe("helperHome", () => {
  it("names the support module a group already has", () => {
    expect(helperHome(["stories/support/ui-kit.ts", "stories/ui/a.stories.ts"])).toEqual({ module: "stories/support/ui-kit.ts", already: true });
    expect(helperHome(["tests/api/helpers.ts", "tests/api/a.test.ts"]).module).toBe("tests/api/helpers.ts");
    expect(helperHome(["tests/e2e/support/page.ts", "tests/e2e/a.spec.ts"]).module).toBe("tests/e2e/support/page.ts");
  });

  it("sends two story files to stories/support/", () => {
    expect(helperHome(["stories/ui/a.stories.ts", "stories/motion/b.stories.ts"]).module).toBe("stories/support/");
  });

  it("sends two API tests to tests/api/helpers.ts", () => {
    const home = helperHome(["tests/api/a.test.ts", "tests/api/b.test.ts"]);
    expect(home.module).toBe("tests/api/helpers.ts");
  });

  it("sends two e2e files to tests/e2e/support/", () => {
    expect(helperHome(["tests/e2e/a.spec.ts", "tests/e2e/b.spec.ts"]).module).toBe("tests/e2e/support/");
  });

  it("sends tests of different suites to tests/support/", () => {
    expect(helperHome(["tests/api/a.test.ts", "tests/e2e/b.spec.ts"]).module).toBe("tests/support/");
  });

  it("sends stories and tests together to a support folder both can import", () => {
    const home = helperHome(["stories/ui/a.stories.ts", "tests/api/b.test.ts"]);
    expect(home.module).toBe("stories/support/ or tests/support/");
  });
});

describe("the real stories and tests", () => {
  const files = SCANNED.flatMap(filesUnder);

  it("reads the support modules, so a pass is not an empty walk", () => {
    const paths = files.map(({ path }) => path);
    expect(paths).toContain("stories/support/ui-kit.ts");
    expect(paths).toContain("tests/api/helpers.ts");
    expect(paths.filter(path => path.startsWith("stories/")).length).toBeGreaterThan(1);
    expect(paths.filter(path => path.startsWith("tests/e2e/")).length).toBeGreaterThan(1);
  });

  it("holds no top-level function in two files", () => {
    expect(copiedHelpers(files)).toEqual([]);
  });
});
