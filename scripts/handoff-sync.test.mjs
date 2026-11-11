import { Buffer } from "node:buffer";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// The token file and the fonts are copied from the design handoff into the app, verbatim: the handoff is the
// design's source of truth and the copy is what Winnies ships (ADR-0001). ESLint ignores the copies, so
// nothing reformats them; this test fails `pnpm test` (the `check` job) the moment one differs, with a message
// that names both files, the first line that differs and the fix.
//
// Not compared, on purpose: `app/assets/css/main.css`. It is adapted from the handoff's tailwind-theme.css
// (the base styles, and whatever `pnpm lint:fix` formats), so it is not a copy.

const HANDOFF = "docs/design_handoff_winnies";
const APP_FONTS = "app/assets/fonts";
const FIX = "Edit the copy and this expectation in the same PR, and add a line to docs/design-deviations.md (#178).";

// Each pair is [the handoff's file, the app's copy], both relative to the repository root.
const TEXT_PAIRS = [
  [`${HANDOFF}/tokens/winnies-tokens.css`, "app/assets/css/winnies-tokens.css"],
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
 * The first line that differs between the handoff's text and the app's copy, as one problem; none when equal.
 * @param {string} handoffText the handoff's file, LF
 * @param {string} appText the app's copy, LF
 * @param {[string, string]} paths the handoff path and the app path, for the message
 */
function differences(handoffText, appText, [handoffPath, appPath]) {
  if (handoffText === appText) {
    return [];
  }
  const handoff = handoffText.split("\n");
  const app = appText.split("\n");
  const first = handoff.findIndex((line, index) => line !== app[index]);
  const at = first === -1
    ? handoff.length
    : first;
  return [
    `${appPath} differs from ${handoffPath} at line ${at + 1}: the handoff has ${JSON.stringify(handoff[at])}, the copy has ${JSON.stringify(app[at])}. ${FIX}`,
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
 * All differences between the handoff's and the app's copy of every file.
 * @param {{ text: Record<string, string>, bytes: Record<string, Buffer> }} sources the files by path, read from both places
 */
function allDifferences(sources) {
  return [
    ...TEXT_PAIRS.flatMap(pair => differences(sources.text[pair[0]], sources.text[pair[1]], pair)),
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
  const paths = TEXT_PAIRS.flat();
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

describe("the app ships the handoff's tokens and fonts", () => {
  it.each(TEXT_PAIRS)("%s and %s are equal", (handoffPath, appPath) => {
    noProblems(differences(readText(handoffPath), readOrEmpty(readText, appPath, ""), [handoffPath, appPath]));
  });

  it("the seven woff2 files are byte for byte the handoff's", () => {
    noProblems(WOFF2.flatMap((name) => {
      const paths = [`${HANDOFF}/assets/fonts/${name}`, `${APP_FONTS}/${name}`];
      return byteDifferences(readFileSync(paths[0]), readOrEmpty(readFileSync, paths[1], Buffer.alloc(0)), paths);
    }));
  });

  it("fonts.css names exactly the seven faces, and each is in app/assets/fonts/", () => {
    noProblems(fontProblems(readText(FONTS_CSS), shippedFonts()));
  });

  it("finds all seven faces and every file it compares (a moved file must not make a rule pass on nothing)", () => {
    expect(shippedFonts().toSorted()).toEqual(WOFF2.toSorted());
    expect(Object.keys(real().text)).toHaveLength(TEXT_PAIRS.length * 2);
  });
});

// Each plant changes one thing in a copy of the real texts and expects exactly the problem it should cause.
// `plant` asserts the text changed, so a plant that matched nothing cannot pass.
function plant(text, change) {
  const mutated = change(text);
  expect(mutated, "the planted change matched nothing").not.toBe(text);
  return mutated;
}

const [TOKENS, FONTS] = TEXT_PAIRS;

describe("catches drift", () => {
  it("one character changed in the token file", () => {
    const sources = real();
    sources.text[TOKENS[1]] = plant(sources.text[TOKENS[1]], text => text.replace("#FFF8FB", "#FFF8FC"));
    const problems = allDifferences(sources);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain(TOKENS[1]);
    expect(problems[0]).toContain(TOKENS[0]);
    expect(problems[0]).toContain("#FFF8FC");
    expect(problems[0]).toMatch(/at line \d+/);
    expect(problems[0]).toContain("docs/design-deviations.md");
  });

  it("one line dropped from fonts.css", () => {
    const sources = real();
    sources.text[FONTS[1]] = plant(sources.text[FONTS[1]], text => text.replace(/^ {2}font-display: swap;\n/m, ""));
    const problems = allDifferences(sources);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain(FONTS[1]);
    expect(problems[0]).toContain(FONTS[0]);
  });

  it("a woff2 with one byte flipped", () => {
    const sources = real();
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
    const sources = real();
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
