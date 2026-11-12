import { describe, expect, it } from "vitest";
import { deviationProblems, deviations, docEntries } from "./handoff-deviations.mjs";

// The parser and the two checks on a copy's deviation blocks, over synthetic text: no file on disk, no live block.
// handoff-sync.test.mjs runs the same functions over the real files.

const COPY = "app/assets/css/copy.css";
const DOC = "docs/design-deviations.md";
const PATHS = {
  copyPath: COPY,
  docPath: DOC,
};

const start = issue => `/* winnies:deviation #${issue} start · see docs/design-deviations.md */`;
const end = issue => `/* winnies:deviation #${issue} end */`;
function block(issue, body) {
  return [
    start(issue),
    body,
    end(issue),
  ].join("\n");
}
const SAME = "Each has the same value text as in its theme block.";
const entry = (issue, body = "What changed.") => `## 2026-11-12 · #${issue} · A title\n\n${body}\n`;
const docOf = (...entries) => `# Design deviations\n\nIntro.\n\n${entries.join("\n")}`;

describe("deviations", () => {
  it("returns each block with its issue number and its text, and the copy without the blocks", () => {
    const text = [
      ".a { color: red; }",
      "",
      block(7, ".b { color: blue; }"),
      ".c { color: green; }",
      block(9, ".d { top: 0; }\n.e { top: 1px; }"),
      "",
    ].join("\n");
    const parsed = deviations(text, COPY);
    expect(parsed.problems).toEqual([]);
    expect(parsed.blocks.map(b => [b.issue, b.text])).toEqual([
      [7, ".b { color: blue; }"],
      [9, ".d { top: 0; }\n.e { top: 1px; }"],
    ]);
    // The one blank line that sets a block apart goes with it, so the rest reads as the handoff's text did.
    expect(parsed.rest).toBe(".a { color: red; }\n.c { color: green; }\n");
  });

  it("a start marker with no end marker is a problem, not a block that runs to the end", () => {
    const parsed = deviations(`.a {}\n${start(7)}\n.b {}\n`, COPY);
    expect(parsed.blocks).toEqual([]);
    expect(parsed.problems).toHaveLength(1);
    expect(parsed.problems[0]).toContain(COPY);
    expect(parsed.problems[0]).toMatch(/start marker at line 2 has no end marker/);
  });

  it("an end marker with no start marker", () => {
    const parsed = deviations(`.a {}\n.b {}\n${end(7)}\n`, COPY);
    expect(parsed.problems).toHaveLength(1);
    expect(parsed.problems[0]).toMatch(/end marker at line 3 has no start marker/);
  });

  it("a start marker inside a block", () => {
    const parsed = deviations(`${start(7)}\n${start(8)}\n.b {}\n${end(8)}\n`, COPY);
    expect(parsed.problems).toHaveLength(1);
    expect(parsed.problems[0]).toMatch(/start marker at line 2 opens inside the block started at line 1/);
  });

  it("an end marker that names another issue than its start marker", () => {
    const parsed = deviations(`${start(7)}\n.b {}\n${end(8)}\n`, COPY);
    expect(parsed.problems).toHaveLength(1);
    expect(parsed.problems[0]).toMatch(/#7 .* ends with the marker of #8/);
  });
});

describe("docEntries", () => {
  it("reads an entry per heading, with its issue number and its text", () => {
    const entries = docEntries(docOf(entry(268, "Body one."), entry(300, "Body two.")), DOC);
    expect(entries.problems).toEqual([]);
    expect(entries.entries.map(e => [
      e.issue,
      e.body.trim(),
    ])).toEqual([
      [268, "Body one."],
      [300, "Body two."],
    ]);
  });

  it("a heading that does not name an issue the way the doc's format does is a problem", () => {
    const entries = docEntries(docOf("## Composites resolve under their Dialect\n\nBody.\n"), DOC);
    expect(entries.problems).toHaveLength(1);
    expect(entries.problems[0]).toContain(DOC);
    expect(entries.problems[0]).toContain("## <date> · #<issue> · <title>");
  });
});

describe("deviationProblems: a marker and its entry", () => {
  const check = (copyText, docText) => deviationProblems(deviations(copyText, COPY), docText, PATHS);

  it("a block with an entry, and an entry with a block, is fine", () => {
    expect(check(`.a {}\n${block(9999, ".x { top: 0; }")}\n`, docOf(entry(9999)))).toEqual([]);
  });

  it("no deviation blocks and no entries is fine", () => {
    expect(check(".a {}\n", docOf())).toEqual([]);
  });

  it("a block with no entry names the issue and says which file to fix", () => {
    const problems = check(`.a {}\n${block(9999, ".x { top: 0; }")}\n`, docOf(entry(268)));
    expect(problems).toHaveLength(2);
    const missingEntry = problems.find(problem => problem.includes("#9999"));
    expect(missingEntry).toContain(COPY);
    expect(missingEntry).toContain(DOC);
    expect(missingEntry).toMatch(/Add the entry to docs\/design-deviations\.md/);
  });

  it("an entry with no block names the issue and says which file to fix", () => {
    const problems = check(".a {}\n", docOf(entry(268)));
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("#268");
    expect(problems[0]).toContain(DOC);
    expect(problems[0]).toContain(COPY);
    expect(problems[0]).toMatch(/Remove the entry from docs\/design-deviations\.md/);
  });

  it("an entry heading in another format does not count as the block's entry", () => {
    const problems = check(`.a {}\n${block(9999, ".x { top: 0; }")}\n`, docOf("## #9999 Composites\n\nBody.\n"));
    expect(problems.some(problem => problem.includes("deviation block for #9999"))).toBe(true);
    expect(problems.some(problem => problem.includes("## <date> · #<issue> · <title>"))).toBe(true);
  });
});

describe("deviationProblems: copied values", () => {
  // The theme blocks as the handoff writes them: a selector list, a comment, a value over two lines.
  const THEMES = [
    ":root, [data-theme=\"light\"] {",
    "  --shadow: 0 var(--lip) 0 -2px var(--color-lip), /* a note */",
    "            inset 0 5px 7px var(--color-highlight);",
    "  --btn-text: var(--text-base);",
    "  --only-light: 1px;",
    "}",
    "[data-theme=\"dark\"] {",
    "  --shadow: 0 var(--lip) 0 -2px var(--color-lip), inset 0 2px 0 var(--color-rim);",
    "}",
    ":root, [data-theme] {",
    "  --card-pad: 30px;",
    "}",
  ].join("\n");
  const SHOWCASE = "[data-dialect=\"showcase\"]";
  const SHOWCASE_DARK = "[data-theme=\"dark\"] [data-dialect=\"showcase\"], [data-theme=\"dark\"][data-dialect=\"showcase\"]";
  const rule = (selector, ...declarations) => `${selector} {\n  ${declarations.join("\n  ")}\n}`;
  const LIGHT_COPY = "--shadow: 0 var(--lip) 0 -2px var(--color-lip),\n  inset 0 5px 7px   var(--color-highlight);";
  const DARK_COPY = "--shadow: 0 var(--lip) 0 -2px var(--color-lip), inset 0 2px 0 var(--color-rim);";

  const check = (blockBody, entryBody) => deviationProblems(
    deviations(`${THEMES}\n\n${block(9999, blockBody)}\n`, COPY),
    docOf(entry(9999, entryBody)),
    PATHS,
  );

  it("a shadow with the theme block's value text, however it is wrapped, is fine", () => {
    expect(check([
      rule(SHOWCASE, LIGHT_COPY, "--btn-text: var(--text-base);"),
      rule(SHOWCASE_DARK, DARK_COPY),
    ].join("\n"), SAME)).toEqual([]);
  });

  it("a light copy whose value text differs from the light theme block", () => {
    const problems = check(rule(SHOWCASE, LIGHT_COPY.replace("5px 7px", "5px 8px")), SAME);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain(COPY);
    expect(problems[0]).toContain("#9999");
    expect(problems[0]).toContain("--shadow");
    expect(problems[0]).toContain("light");
    expect(problems[0]).toContain("5px 8px");
    expect(problems[0]).toContain("inset 0 5px 7px var(--color-highlight)");
    expect(problems[0]).toContain(DOC);
  });

  it("a dark copy is compared with the dark theme block, not the light one", () => {
    expect(check(rule(SHOWCASE_DARK, LIGHT_COPY), SAME)).toHaveLength(1);
    const problems = check(rule(SHOWCASE_DARK, DARK_COPY.replace("0 2px", "0 3px")), SAME);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("dark");
  });

  it("a dark copy of a property only the light theme block declares is compared with that one", () => {
    expect(check(rule(SHOWCASE_DARK, "--only-light: 2px;"), SAME)).toHaveLength(1);
    expect(check(rule(SHOWCASE_DARK, "--only-light: 1px;"), SAME)).toEqual([]);
  });

  it("a property no theme block declares is not compared", () => {
    expect(check(rule(SHOWCASE, "--new-token: 1px;"), SAME)).toEqual([]);
  });

  it("the rule applies only when the entry says the values are the theme block's", () => {
    const differing = rule(SHOWCASE, "--card-pad: 99px;");
    expect(check(differing, "A Dialect with its own card padding.")).toEqual([]);
    expect(check(differing, SAME)).toHaveLength(1);
  });
});
