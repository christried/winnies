import { Buffer } from "node:buffer";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { deviationProblems, deviations } from "./handoff-deviations.mjs";

// The token file and the fonts are copied from the design handoff into the app, verbatim: the handoff is the
// design's source of truth and the copy is what Winnies ships (ADR-0001), apart from the deviation blocks the
// token file's copy may carry (docs/design-deviations.md). ESLint ignores the copies, so
// nothing reformats them; this test fails `pnpm test` (the `check` job) the moment one differs, with a message
// that names both files, the first line that differs and the fix.
//
// Not compared, on purpose: `app/assets/css/main.css`. It is adapted from the handoff's tailwind-theme.css
// (the base styles, and whatever `pnpm lint:fix` formats), so it is not a copy.

const HANDOFF = "docs/design_handoff_winnies";
const APP_FONTS = "app/assets/fonts";
const FIX = "Copy the handoff's file again. A deliberate change to the token file goes in a winnies:deviation block at the end of the copy, with an entry in docs/design-deviations.md (#178).";
const TOKENS_COPY = "app/assets/css/winnies-tokens.css";
const DEVIATIONS_DOC = "docs/design-deviations.md";

// Each pair is [the handoff's file, the app's copy], both relative to the repository root. A pair with
// `{ deviations: true }` may carry winnies:deviation blocks in the copy: compared against nothing, so the fix the
// handoff cannot have lives there, and checked against the doc (handoff-deviations.mjs). Everything outside a block is
// still compared verbatim.
const TEXT_PAIRS = [
  [
    `${HANDOFF}/tokens/winnies-tokens.css`,
    TOKENS_COPY,
    { deviations: true },
  ],
  [`${HANDOFF}/assets/fonts/fonts.css`, `${APP_FONTS}/fonts.css`],
  [`${HANDOFF}/assets/fonts/licences/MochiyPopOne-OFL.txt`, `${APP_FONTS}/licences/MochiyPopOne-OFL.txt`],
  [`${HANDOFF}/assets/fonts/licences/MPLUSRounded1c-OFL.txt`, `${APP_FONTS}/licences/MPLUSRounded1c-OFL.txt`],
];

// The seven faces that ship in R0. MaterialSymbols is not one of them: icons are R2, which brings its own licence.
const WOFF2 = [
  "MochiyPopOne-400-latin.woff2",
  "MPLUSRounded1c-500-latin.woff2",
  "MPLUSRounded1c-500-latin-ext.woff2",
  "MPLUSRounded1c-700-latin.woff2",
  "MPLUSRounded1c-700-latin-ext.woff2",
  "MPLUSRounded1c-800-latin.woff2",
  "MPLUSRounded1c-800-latin-ext.woff2",
];

const FONTS_CSS = `${APP_FONTS}/fonts.css`;

// A checkout may be CRLF (.gitattributes forces LF in the repository, a Windows editor may not): compare LF.
const lf = text => text.replace(/\r\n/g, "\n");
const readText = path => lf(readFileSync(path, "utf8"));

/**
 * What is wrong with the app's copy of one text file: the first line that differs from the handoff's, as one problem,
 * and, for a pair that may carry deviation blocks, what is wrong with their markers and their entries in the doc. The
 * copy is compared without its blocks (see FIX); a block in any other file is a difference like any other line.
 * @param {string} handoffText the handoff's file, LF
 * @param {string} appCopy the app's copy, LF
 * @param {[string, string, { deviations?: boolean }?]} pair the handoff path, the app path and the pair's options
 * @param {string} docText docs/design-deviations.md, LF
 */
function differences(handoffText, appCopy, [handoffPath, appPath, options], docText) {
  let appText = appCopy;
  const extra = [];
  if (options?.deviations) {
    const parsed = deviations(appCopy, appPath);
    if (parsed.problems.length > 0) {
      return parsed.problems;
    }
    appText = parsed.rest;
    extra.push(...deviationProblems(parsed, docText, {
      copyPath: appPath,
      docPath: DEVIATIONS_DOC,
    }));
  }
  if (handoffText === appText) {
    return extra;
  }
  const handoff = handoffText.split("\n");
  const app = appText.split("\n");
  const first = handoff.findIndex((line, index) => line !== app[index]);
  const at = first === -1
    ? handoff.length
    : first;
  return [
    `${appPath} differs from ${handoffPath} at line ${at + 1}: the handoff has ${JSON.stringify(handoff[at])}, the copy has ${JSON.stringify(app[at])}. ${FIX}`,
    ...extra,
  ];
}

/**
 * The first byte that differs between the handoff's binary file and the app's copy, as one problem; none when equal.
 * @param {Buffer} handoffBytes the handoff's file
 * @param {Buffer} appBytes the app's copy
 * @param {[string, string]} paths the handoff path and the app path, for the message
 */
function byteDifferences(handoffBytes, appBytes, [handoffPath, appPath]) {
  if (handoffBytes.equals(appBytes)) {
    return [];
  }
  const first = handoffBytes.findIndex((byte, index) => byte !== appBytes[index]);
  const at = first === -1
    ? Math.min(handoffBytes.length, appBytes.length)
    : first;
  return [
    `${appPath} differs from ${handoffPath} at byte ${at} (${appBytes.length} bytes against ${handoffBytes.length}). ${FIX}`,
  ];
}

/**
 * What fonts.css asks for against what ships: every url() must be one of the seven faces and exist next to it,
 * and every shipped face must be asked for. A missing font would otherwise be a 404 at runtime, not a red build.
 * @param {string} fontsCss the app's fonts.css
 * @param {string[]} shipped the file names in app/assets/fonts/ that end in .woff2
 */
function fontProblems(fontsCss, shipped) {
  const named = [
    ...fontsCss.matchAll(/url\('\.\/([^']+\.woff2)'\)/g),
  ].map(match => match[1]);
  return [
    ...named
      .filter(name => !shipped.includes(name))
      .map(name => `${FONTS_CSS} asks for ${name}, which is not in ${APP_FONTS}/. Copy it from ${HANDOFF}/assets/fonts/. ${FIX}`),
    ...shipped
      .filter(name => !named.includes(name))
      .map(name => `${APP_FONTS}/${name} ships, but ${FONTS_CSS} does not ask for it. ${FIX}`),
    ...WOFF2
      .filter(name => !named.includes(name))
      .map(name => `${FONTS_CSS} does not name ${name}, one of the seven faces that ship. ${FIX}`),
    ...named
      .filter(name => !WOFF2.includes(name))
      .map(name => `${FONTS_CSS} names ${name}, which is not one of the seven faces that ship. ${FIX}`),
  ];
}

/**
 * All differences between the handoff's and the app's copy of every file, and what is wrong with the deviation
 * blocks. The one walk: the real files and the planted cases both go through it.
 * @param {{ text: Record<string, string>, bytes: Record<string, Buffer> }} sources the files by path, read from both places (the doc is one of the text files)
 */
function allDifferences(sources) {
  return [
    ...TEXT_PAIRS.flatMap(pair => differences(sources.text[pair[0]], sources.text[pair[1]], pair, sources.text[DEVIATIONS_DOC])),
    ...WOFF2.flatMap(name => byteDifferences(
      sources.bytes[`${HANDOFF}/assets/fonts/${name}`],
      sources.bytes[`${APP_FONTS}/${name}`],
      [`${HANDOFF}/assets/fonts/${name}`, `${APP_FONTS}/${name}`],
    )),
  ];
}

/** A copy that was never made reads as empty, so it fails as a difference with a message and not as a stack trace. */
function readOrEmpty(read, path, empty) {
  return existsSync(path)
    ? read(path)
    : empty;
}

function real() {
  const paths = [
    ...TEXT_PAIRS.flatMap(pair => pair.slice(0, 2)),
    DEVIATIONS_DOC,
  ];
  const woff2 = WOFF2.flatMap(name => [`${HANDOFF}/assets/fonts/${name}`, `${APP_FONTS}/${name}`]);
  return {
    text: Object.fromEntries(paths.map(path => [
      path,
      readOrEmpty(readText, path, ""),
    ])),
    bytes: Object.fromEntries(woff2.map(path => [
      path,
      readOrEmpty(readFileSync, path, Buffer.alloc(0)),
    ])),
  };
}

const shippedFonts = () => readdirSync(APP_FONTS).filter(name => name.endsWith(".woff2"));
const noProblems = problems => expect(problems, problems.join("\n")).toEqual([]);

const onDisk = real();

describe("the app ships the handoff's tokens and fonts", () => {
  // The same walk the planted cases below go through, over the files on disk.
  it("every copy is the handoff's, byte for byte, and every deviation block has its entry in the doc", () => {
    noProblems(allDifferences(onDisk));
  });

  it("fonts.css names exactly the seven faces, and each is in app/assets/fonts/", () => {
    noProblems(fontProblems(onDisk.text[FONTS_CSS], shippedFonts()));
  });

  it("finds all seven faces and every file it compares (a moved file must not make a rule pass on nothing)", () => {
    expect(shippedFonts().toSorted()).toEqual(WOFF2.toSorted());
    expect(Object.keys(onDisk.text)).toHaveLength(TEXT_PAIRS.length * 2 + 1);
    expect(Object.keys(onDisk.bytes)).toHaveLength(WOFF2.length * 2);
  });
});

// Each plant changes one thing in a copy of the sources and expects exactly the problem it should cause.
// `plant` asserts the text changed, so a plant that matched nothing cannot pass.
function plant(text, change) {
  const mutated = change(text);
  expect(mutated, "the planted change matched nothing").not.toBe(text);
  return mutated;
}

const [TOKENS, FONTS] = TEXT_PAIRS;

// The plants own their fixtures: the disk's sources, except that the token copy is the handoff's own text with no
// deviation block and the doc has no entries. Whatever blocks the real copy carries (or stops carrying) changes nothing here.
const ISSUE = 9999;
const marker = (kind, tail = "") => `/* winnies:deviation #${ISSUE} ${kind}${tail} */`;
const blockOf = body => `${marker("start", " · see docs/design-deviations.md")}\n${body}\n${marker("end")}`;
const SAME = "Each has the same value text as in its theme block.";
function docWith(...issues) {
  return [
    "# Design deviations",
    ...issues.map(issue => `## 2026-11-12 · #${issue} · A planted deviation\n\n${SAME}`),
    "",
  ].join("\n\n");
}

function cleanSources() {
  return {
    text: {
      ...onDisk.text,
      [TOKENS[1]]: onDisk.text[TOKENS[0]],
      [DEVIATIONS_DOC]: docWith(),
    },
    bytes: { ...onDisk.bytes },
  };
}

/** The clean sources with a block for ISSUE appended to the token copy, and the doc's entry for it. */
function sourcesWithBlock(body) {
  const sources = cleanSources();
  sources.text[TOKENS[1]] = `${sources.text[TOKENS[1]]}\n${blockOf(body)}\n`;
  sources.text[DEVIATIONS_DOC] = docWith(ISSUE);
  return sources;
}

describe("catches drift", () => {
  it("the clean sources, with and without a block, are in sync", () => {
    expect(allDifferences(cleanSources())).toEqual([]);
    expect(allDifferences(sourcesWithBlock(".x { top: 0; }"))).toEqual([]);
  });

  it("one character changed in the token file", () => {
    const sources = cleanSources();
    sources.text[TOKENS[1]] = plant(sources.text[TOKENS[1]], text => text.replace("#FFF8FB", "#FFF8FC"));
    const problems = allDifferences(sources);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain(TOKENS[1]);
    expect(problems[0]).toContain(TOKENS[0]);
    expect(problems[0]).toContain("#FFF8FC");
    expect(problems[0]).toMatch(/at line \d+/);
    expect(problems[0]).toContain("docs/design-deviations.md");
  });

  it("a change inside a deviation block is not drift", () => {
    const sources = sourcesWithBlock(".not-in-the-handoff { color: red; }");
    sources.text[TOKENS[1]] = plant(sources.text[TOKENS[1]], text => text.replace(".not-in-the-handoff { color: red; }", ".changed { color: blue; }\n.more { top: 0; }"));
    expect(allDifferences(sources)).toEqual([]);
  });

  it("a start marker with no end marker", () => {
    const sources = sourcesWithBlock(".x { top: 0; }");
    sources.text[TOKENS[1]] = plant(sources.text[TOKENS[1]], text => text.replace(`${marker("end")}\n`, ""));
    const problems = allDifferences(sources);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain(TOKENS[1]);
    expect(problems[0]).toMatch(/start marker at line \d+ has no end marker/);
  });

  it("an end marker with no start marker", () => {
    const sources = sourcesWithBlock(".x { top: 0; }");
    sources.text[TOKENS[1]] = plant(sources.text[TOKENS[1]], text => text.replace(/^\/\* winnies:deviation #9999 start[^\n]*\n/m, ""));
    const problems = allDifferences(sources);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatch(/end marker at line \d+ has no start marker/);
  });

  it("a deviation block in a file other than the token file is still drift", () => {
    const sources = cleanSources();
    sources.text[FONTS[1]] = `${sources.text[FONTS[1]]}/* winnies:deviation #1 start */\n.x {}\n/* winnies:deviation #1 end */\n`;
    const problems = allDifferences(sources);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain(FONTS[1]);
  });

  it("a block with no entry in the doc names the copy and the doc", () => {
    const sources = sourcesWithBlock(".x { top: 0; }");
    sources.text[DEVIATIONS_DOC] = docWith();
    const problems = allDifferences(sources);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain(`#${ISSUE}`);
    expect(problems[0]).toContain(TOKENS[1]);
    expect(problems[0]).toContain(DEVIATIONS_DOC);
  });

  it("an entry in the doc with no block in the copy names the doc and the copy", () => {
    const sources = cleanSources();
    sources.text[DEVIATIONS_DOC] = docWith(ISSUE);
    const problems = allDifferences(sources);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain(`#${ISSUE}`);
    expect(problems[0]).toContain(DEVIATIONS_DOC);
    expect(problems[0]).toContain(TOKENS[1]);
  });

  it("a block that copies a theme block's value, and one that does not, when the entry says it does", () => {
    // --shadow-popover is declared in the handoff's light and dark blocks as var(--shadow-raised-lg).
    expect(allDifferences(sourcesWithBlock("[data-dialect=\"x\"] { --shadow-popover: var(--shadow-raised-lg); }"))).toEqual([]);
    const problems = allDifferences(sourcesWithBlock("[data-dialect=\"x\"] { --shadow-popover: var(--shadow-raised); }"));
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("--shadow-popover");
    expect(problems[0]).toContain("var(--shadow-raised-lg)");
    expect(problems[0]).toContain(DEVIATIONS_DOC);
  });

  it("one line dropped from fonts.css", () => {
    const sources = cleanSources();
    sources.text[FONTS[1]] = plant(sources.text[FONTS[1]], text => text.replace(/^ {2}font-display: swap;\n/m, ""));
    const problems = allDifferences(sources);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain(FONTS[1]);
    expect(problems[0]).toContain(FONTS[0]);
  });

  it("a woff2 with one byte flipped", () => {
    const sources = cleanSources();
    const path = `${APP_FONTS}/MochiyPopOne-400-latin.woff2`;
    const flipped = Buffer.from(sources.bytes[path]);
    flipped[100] ^= 0xFF;
    sources.bytes[path] = flipped;
    const problems = allDifferences(sources);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain(path);
    expect(problems[0]).toContain("at byte 100");
  });

  it("a copy that was never made", () => {
    const sources = cleanSources();
    sources.text[TOKENS[1]] = "";
    const problems = allDifferences(sources);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain(TOKENS[1]);
  });

  it("fonts.css asking for a face that is not shipped", () => {
    const shipped = shippedFonts().filter(name => name !== "MochiyPopOne-400-latin.woff2");
    const problems = fontProblems(readText(FONTS_CSS), shipped);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("asks for MochiyPopOne-400-latin.woff2");
  });

  it("a face in app/assets/fonts/ that fonts.css does not ask for", () => {
    const problems = fontProblems(readText(FONTS_CSS), [
      ...shippedFonts(),
      "Extra.woff2",
    ]);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("Extra.woff2 ships, but");
  });

  it("fonts.css swapping a face for one outside the seven", () => {
    const problems = fontProblems(
      plant(readText(FONTS_CSS), text => text.replace("MochiyPopOne-400-latin.woff2", "Other.woff2")),
      [
        ...shippedFonts(),
        "Other.woff2",
      ].filter(name => name !== "MochiyPopOne-400-latin.woff2"),
    );
    // Other.woff2 is asked for and shipped but is not one of the seven; the Mochiy face is one of the seven and is missing.
    expect(problems).toHaveLength(2);
    expect(problems.filter(problem => problem.includes("does not name MochiyPopOne-400-latin.woff2"))).toHaveLength(1);
    expect(problems.filter(problem => problem.includes("names Other.woff2"))).toHaveLength(1);
  });
});
