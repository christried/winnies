// The deviation blocks of the app's copy of the token file, and what docs/design-deviations.md must say about them.
// Pure: text in, problems out, so handoff-sync.test.mjs and its own test run the same functions over the real files
// and over planted text. Test tooling, not app code.

const DEVIATION_START = /^\/\* winnies:deviation #(\d+) start\b/;
const DEVIATION_END = /^\/\* winnies:deviation #(\d+) end \*\/$/;

/**
 * The deviation blocks of a copy, each from its `start` marker line through its `end` marker line, and the copy
 * without them (and without the blank line before each, so the rest reads as the handoff's text did). A marker
 * without its partner is a problem, never a block that runs to the end of the file.
 * @param {string} text the app's copy, LF
 * @param {string} path the app path, for the messages
 * @returns {{ blocks: { issue: number, startLine: number, text: string }[], rest: string, problems: string[] }}
 *   each block's issue number, its first marker's line (1-based) and the text between the markers; the copy without
 *   the blocks; and what is wrong with the markers
 */
export function deviations(text, path) {
  const kept = [];
  const blocks = [];
  const problems = [];
  let open = null;
  text.split("\n").forEach((line, index) => {
    const starts = DEVIATION_START.exec(line);
    const ends = DEVIATION_END.exec(line);
    if (starts) {
      if (open) {
        problems.push(`${path}: the deviation start marker at line ${index + 1} opens inside the block started at line ${open.line}.`);
      }
      open = {
        issue: Number(starts[1]),
        line: index + 1,
        lines: [],
      };
      // The one blank line that sets the block apart from the handoff's text goes with it.
      if (kept.at(-1) === "") {
        kept.pop();
      }
    }
    else if (ends) {
      if (!open) {
        problems.push(`${path}: the deviation end marker at line ${index + 1} has no start marker.`);
      }
      else {
        if (open.issue !== Number(ends[1])) {
          problems.push(`${path}: the block of #${open.issue} (line ${open.line}) ends with the marker of #${ends[1]} at line ${index + 1}.`);
        }
        blocks.push({
          issue: open.issue,
          startLine: open.line,
          text: open.lines.join("\n"),
        });
      }
      open = null;
    }
    else if (open) {
      open.lines.push(line);
    }
    else {
      kept.push(line);
    }
  });
  if (open) {
    problems.push(`${path}: the deviation start marker at line ${open.line} has no end marker.`);
  }
  return {
    blocks,
    rest: kept.join("\n"),
    problems,
  };
}

// An entry heading: `## <date> · #<issue> · <title>`, as docs/design-deviations.md writes them.
const ENTRY_HEADING = /^## \d{4}-\d{2}-\d{2} · #(\d+) · \S/;
const FORMAT = "## <date> · #<issue> · <title>";

/**
 * The entries of docs/design-deviations.md: every `## ` heading, with its issue number and the text under it.
 * @param {string} docText the doc, LF
 * @param {string} docPath the doc's path, for the messages
 * @returns {{ entries: { issue: number, body: string }[], problems: string[] }} the entries, and each heading that is not in the format
 */
export function docEntries(docText, docPath) {
  const entries = [];
  const problems = [];
  docText.split("\n").forEach((line, index) => {
    if (!line.startsWith("## ")) {
      entries.at(-1)?.lines.push(line);
      return;
    }
    const heading = ENTRY_HEADING.exec(line);
    if (heading) {
      entries.push({
        issue: Number(heading[1]),
        lines: [],
      });
    }
    else {
      entries.push({
        issue: null,
        lines: [],
      });
      problems.push(`${docPath}: the heading at line ${index + 1} (${JSON.stringify(line)}) is not an entry in the format "${FORMAT}", so no deviation block can name it. Fix the heading in ${docPath}.`);
    }
  });
  return {
    entries: entries.filter(entry => entry.issue !== null).map(entry => ({
      issue: entry.issue,
      body: entry.lines.join("\n"),
    })),
    problems,
  };
}

// An entry that promises its block copies values says so in this sentence (#268's does); the check below holds it to
// the promise. A block that gives a token a value of its own (a Dialect, say) does not say it and is not compared.
const SAME_VALUES = /same value text as in its theme block/i;

const withoutComments = css => css.replace(/\/\*[\s\S]*?\*\//g, "");
const squash = text => text.replace(/\s+/g, " ").trim();

/**
 * The custom properties each rule of a stylesheet declares, in source order.
 * @param {string} css the stylesheet, LF
 * @returns {{ selectors: string[], name: string, value: string }[]} one per declaration, the value whitespace-normalised
 */
function customProperties(css) {
  return [
    ...withoutComments(css).matchAll(/([^{}]+)\{([^{}]*)\}/g),
  ].flatMap(([, selector, body]) => body.split(";").flatMap((declaration) => {
    const [, name, value] = /^\s*(--[\w-]+)\s*:([\s\S]*)$/.exec(declaration) ?? [];
    return name
      ? [
          {
            selectors: selector.split(",").map(squash),
            name,
            value: squash(value),
          },
        ]
      : [];
  }));
}

const LIGHT_THEME = [":root", "[data-theme]", "[data-theme=\"light\"]"];
const DARK_THEME = "[data-theme=\"dark\"]";

/**
 * The value a theme block gives a property: the last declaration in a block whose selector list names the theme.
 * Dark falls back to the blocks that apply to every theme, as the cascade does.
 */
function themeValue(declarations, name, dark) {
  const named = (selectors) => {
    const found = declarations.findLast(d => d.name === name && d.selectors.some(selector => selectors.includes(selector)));
    return found?.value;
  };
  return (dark
    ? named([DARK_THEME])
    : undefined) ?? named(LIGHT_THEME);
}

/**
 * For a block whose entry says its values are its theme block's: every property it declares that a theme block also
 * declares has the same value text there (whitespace-normalised), light for a selector without the dark theme, dark with it.
 */
function valueProblems(block, rest, { copyPath, docPath }) {
  const theme = customProperties(rest);
  return customProperties(block.text).flatMap(({ selectors, name, value }) => {
    // One problem per declaration: the selectors of a list repeat the same value.
    const wrong = selectors
      .map(selector => ({
        selector,
        dark: selector.includes(DARK_THEME),
      }))
      .map(found => ({
        ...found,
        expected: themeValue(theme, name, found.dark),
      }))
      .find(found => found.expected !== undefined && found.expected !== value);
    return wrong
      ? [`${copyPath}: the deviation block for #${block.issue} gives ${name} under ${wrong.selector} the value ${JSON.stringify(value)}, but its ${wrong.dark ? "dark" : "light"} theme block has ${JSON.stringify(wrong.expected)}, and the entry in ${docPath} says each has the same value text. Fix the block in ${copyPath}, or change the entry in ${docPath}.`]
      : [];
  });
}

/**
 * What the copy's blocks and the doc's entries say about each other: every block has an entry that names its issue,
 * every entry names the issue of a block that is in the copy, and a block whose entry says it copies values does.
 * @param {ReturnType<typeof deviations>} parsed the copy, parsed
 * @param {string} docText docs/design-deviations.md, LF
 * @param {{ copyPath: string, docPath: string }} paths the copy's and the doc's paths, for the messages
 * @returns {string[]} one problem per mismatch, each saying which file to fix
 */
export function deviationProblems(parsed, docText, paths) {
  const { copyPath, docPath } = paths;
  const doc = docEntries(docText, docPath);
  const blockIssues = parsed.blocks.map(block => block.issue);
  const entryIssues = doc.entries.map(entry => entry.issue);
  return [
    ...doc.problems,
    ...parsed.blocks
      .filter(block => !entryIssues.includes(block.issue))
      .map(block => `${copyPath}: the deviation block for #${block.issue} (line ${block.startLine}) has no entry in ${docPath}. Add the entry to ${docPath}, headed "${FORMAT}", or remove the block from ${copyPath}.`),
    ...doc.entries
      .filter(entry => !blockIssues.includes(entry.issue))
      .map(entry => `${docPath}: the entry for #${entry.issue} has no winnies:deviation #${entry.issue} block in ${copyPath}. Remove the entry from ${docPath} if the handoff took the deviation in, or restore the block in ${copyPath}.`),
    ...parsed.blocks
      .filter(block => doc.entries.some(entry => entry.issue === block.issue && SAME_VALUES.test(entry.body)))
      .flatMap(block => valueProblems(block, parsed.rest, paths)),
  ];
}
