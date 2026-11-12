// The staging favicons (#237, #263). public/staging/ holds the three production icons of public/ with
// every literal colour hue-rotated by +180 degrees, so staging and production tabs can be told apart at a
// glance. scripts/favicon-stage.mjs writes them (`pnpm favicons:stage`); scripts/favicon-tint.test.mjs
// fails `pnpm test` when a committed copy differs from what it makes. Never edit a staging copy by hand.
//
// The rule: hue +180 degrees modulo 360, saturation and lightness kept, written as lowercase #rrggbb.
// Shapes, viewBox, coordinates and metadata (the <title> text) are not touched; only
// colour values change. The rule covers every hex, so a colour that is not in the table below needs no
// new row. The rows are #237's and pin the rule in the test:
//
//   #001e29 -> #290b00
//   #bdff00 -> #4200ff
//   #ffbf00 -> #0040ff
//
// A new production icon: copy it into public/ under its name, add a row to ICONS below, run
// `pnpm favicons:stage`, and render the three staging icons at 32 px to check the tab. A new literal
// colour form (rgb(), a named colour, #rgb, url(), a style attribute) makes tintSvg throw instead of
// guessing: give the form its own row and test before it is tinted.

/**
 * One row per icon the app shows (FAVICON_FILE in app/composables/use-favicon.ts): `file` is its name in
 * public/ and public/staging/, `handoff` its name in docs/design_handoff_winnies/assets/favicon/.
 */
export const ICONS = [
  { file: "favicon.svg", handoff: "favicon-idle.svg" },
  { file: "favicon-running.svg", handoff: "favicon-running.svg" },
  { file: "favicon-complete.svg", handoff: "favicon-complete.svg" },
];

const HEX = /^#[0-9a-f]{6}$/i;

/** The attributes whose value is a colour. */
const COLOUR_ATTRIBUTES = [
  "fill",
  "stroke",
  "stop-color",
  "flood-color",
  "lighting-color",
  "color",
];

/** Values of a colour attribute that are not a colour to rotate. */
const KEYWORDS = new Set([
  "none",
  "currentcolor",
  "transparent",
  "inherit",
]);

/**
 * Rotates the hue of a colour by +180 degrees, keeping saturation and lightness.
 *
 * @param {string} hex a colour as #rrggbb, in either case
 * @returns {string} the rotated colour as lowercase #rrggbb
 */
export function rotateHex(hex) {
  if (!HEX.test(hex)) {
    throw new Error(`Not a #rrggbb colour: ${JSON.stringify(hex)}`);
  }
  const [r, g, b] = [1, 3, 5].map(i => Number.parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  const l = (max + min) / 2;
  const s = d === 0
    ? 0
    : d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (d !== 0) {
    if (max === r) {
      h = 60 * (((g - b) / d + 6) % 6);
    }
    else if (max === g) {
      h = 60 * ((b - r) / d + 2);
    }
    else {
      h = 60 * ((r - g) / d + 4);
    }
  }
  h = (h + 180) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  const sector = Math.floor(h / 60);
  const [r1, g1, b1] = [
    [c, x, 0],
    [x, c, 0],
    [0, c, x],
    [0, x, c],
    [x, 0, c],
    [c, 0, x],
  ][sector];
  return `#${[r1, g1, b1].map(v => Math.round((v + m) * 255).toString(16).padStart(2, "0")).join("")}`;
}

// A comment, a CDATA section, a processing instruction or a start tag, in the order they can begin. Only
// the start tags are scanned; a quoted attribute value may hold a ">".
const TOKEN = /<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<\?[\s\S]*?\?>|<[A-Za-z](?:"[^"]*"|'[^']*'|[^>"'])*>/g;
const COLOUR_ATTRIBUTE = new RegExp(`(\\s)(${COLOUR_ATTRIBUTES.join("|")})=("[^"]*"|'[^']*')`, "g");
const STYLE_ATTRIBUTE = /\sstyle=("[^"]*"|'[^']*')/;
const COLOUR_PROPERTY = new RegExp(`(?:^|[\\s;"'])(${COLOUR_ATTRIBUTES.join("|")})\\s*:`);

function tintTag(tag) {
  const style = STYLE_ATTRIBUTE.exec(tag);
  const property = style && COLOUR_PROPERTY.exec(style[1].slice(1, -1));
  if (property) {
    throw new Error(`style attribute with the colour property ${property[1]}: ${style[1]}`);
  }
  return tag.replace(COLOUR_ATTRIBUTE, (_, space, name, quoted) => {
    const value = quoted.slice(1, -1);
    if (quoted.startsWith("'")) {
      throw new Error(`${name}=${quoted} is single-quoted; only double quotes are read`);
    }
    if (KEYWORDS.has(value.toLowerCase())) {
      return `${space}${name}=${quoted}`;
    }
    if (!HEX.test(value)) {
      throw new Error(`${name}="${value}" is not a colour form the tint knows (#rrggbb, none, currentColor, transparent, inherit)`);
    }
    return `${space}${name}="${rotateHex(value)}"`;
  });
}

/**
 * Hue-rotates every colour of an SVG by +180 degrees. Only the values of fill, stroke, stop-color,
 * flood-color, lighting-color and color on start tags change; every other byte stays as it was.
 *
 * @param {string} svg the SVG text
 * @returns {string} the SVG text with rotated colours
 * @throws {Error} on a colour in a form the rule does not cover (a new form needs its own row and test)
 */
export function tintSvg(svg) {
  return svg.replace(TOKEN, token => token.startsWith("<!") || token.startsWith("<?")
    ? token
    : tintTag(token));
}
