import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { ICONS, rotateHex, tintSvg } from "./favicon-tint.mjs";

// The staging icons are the production icons with every colour hue-rotated by +180 degrees (#237). This
// file pins the rule's colour function on known values, the scanner on what it must refuse, and the
// committed staging copies against what scripts/favicon-stage.mjs makes.

const root = relative => fileURLToPath(new URL(`../${relative}`, import.meta.url));
const read = relative => readFileSync(root(relative), "utf8");

describe("rotateHex on the rows of #237's table", () => {
  it.each([
    ["#001e29", "#290b00"],
    ["#bdff00", "#4200ff"],
    ["#ffbf00", "#0040ff"],
  ])("%s becomes %s", (input, output) => {
    expect(rotateHex(input)).toBe(output);
  });
});

describe("rotateHex on the colours of the handoff's icons", () => {
  it.each([
    ["#fff8fb", "#f8fffc"],
    ["#b0175a", "#17b06d"],
    ["#ff6fae", "#6fffc0"],
    ["#ffd2e5", "#d2ffec"],
    ["#d9478a", "#47d996"],
    ["#ffefa1", "#a1b1ff"],
    ["#ffc23d", "#3d7aff"],
    ["#4a2b3a", "#2b4a3b"],
    ["#808080", "#808080"],
  ])("%s becomes %s", (input, output) => {
    expect(rotateHex(input)).toBe(output);
  });

  it("reads upper case and writes lower case", () => {
    expect(rotateHex("#FFC23D")).toBe("#3d7aff");
  });

  it.each(["#001e29", "#ffc23d", "#123456"])("rotating %s twice gives it back", (hex) => {
    expect(rotateHex(rotateHex(hex))).toBe(hex);
  });
});

describe("rotateHex refuses what is not #rrggbb", () => {
  it.each(["#abc", "red", "rgb(1,2,3)", "#001e2"])("%s", (input) => {
    expect(() => rotateHex(input)).toThrow(Error);
  });
});

describe("tintSvg", () => {
  const fixture = [
    "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 32 32\">",
    "<!-- keeps #bdff00 -->",
    "<title>#001e29 stays</title>",
    "<rect fill=\"#001E29\" stroke=\"#bdff00\" stroke-width=\"3\" rx=\"4\"/>",
    "<path fill=\"none\" stroke=\"currentColor\" d=\"M0 0\"/>",
    "<circle fill=\"currentColor\" r=\"2\"/>",
    "</svg>",
  ].join("");

  it("rotates the colours of fill and stroke and leaves everything else as it was", () => {
    expect(tintSvg(fixture)).toBe(fixture
      .replace("fill=\"#001E29\"", "fill=\"#290b00\"")
      .replace("stroke=\"#bdff00\" stroke-width", "stroke=\"#4200ff\" stroke-width"));
  });

  it("rotates stop-color, flood-color, lighting-color and color too", () => {
    expect(tintSvg("<stop stop-color=\"#001e29\"/><feFlood flood-color=\"#001e29\"/><feDiffuseLighting lighting-color=\"#001e29\"/><g color=\"#001e29\"/>"))
      .toBe("<stop stop-color=\"#290b00\"/><feFlood flood-color=\"#290b00\"/><feDiffuseLighting lighting-color=\"#290b00\"/><g color=\"#290b00\"/>");
  });

  it.each([
    "none",
    "currentColor",
    "currentcolor",
    "transparent",
    "inherit",
  ])("passes %s through", (value) => {
    const svg = `<path fill="${value}"/>`;
    expect(tintSvg(svg)).toBe(svg);
  });

  it.each([
    "<rect fill=\"rgb(1,2,3)\"/>",
    "<rect fill=\"red\"/>",
    "<rect fill=\"#abc\"/>",
    "<rect fill=\"url(#g)\"/>",
    "<rect stroke=\"#ffffff80\"/>",
    "<rect style=\"fill:#001e29\"/>",
  ])("throws for %s", (svg) => {
    expect(() => tintSvg(svg)).toThrow(Error);
  });

  it("names the attribute and the value it refuses", () => {
    expect(() => tintSvg("<rect fill=\"red\"/>")).toThrow(/fill.*red/);
  });
});

const HEX = /#[0-9a-f]{6}\b/gi;

describe("the three production icons", () => {
  it.each(ICONS.map(({ file }) => file))("%s keeps its shapes: only hex digits change in the staging copy", (file) => {
    const input = read(`public/${file}`);
    expect(tintSvg(input).replace(HEX, "#")).toBe(input.replace(HEX, "#"));
  });

  it.each(ICONS)("public/$file is the handoff's $handoff, byte for byte", ({ file, handoff }) => {
    const fix = `public/${file} differs from docs/design_handoff_winnies/assets/favicon/${handoff}; copy it again (scripts/favicon-tint.test.mjs).`;
    expect(read(`public/${file}`) === read(`docs/design_handoff_winnies/assets/favicon/${handoff}`), fix).toBe(true);
  });
});

describe("the staging copies", () => {
  it.each(ICONS.map(({ file }) => file))("public/staging/%s is what scripts/favicon-stage.mjs makes", (file) => {
    const fix = `public/staging/${file} differs from what scripts/favicon-stage.mjs makes; run pnpm favicons:stage (scripts/favicon-tint.test.mjs).`;
    expect(read(`public/staging/${file}`) === tintSvg(read(`public/${file}`)), fix).toBe(true);
  });
});
