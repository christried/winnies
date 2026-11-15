// What keeps the bypass secret of scripts/shots.mjs (#238) from leaving the staging origin: the origin it may
// open, the path it may go to, and what a printed line may show. Apart from the script so shots-guards.test.mjs
// can run it without a browser (the split of worktree-verdict.mjs). No IO here.

export const STAGING_ORIGIN = "https://staging.winnies.christried.me";
const DEFAULT_BASE_URL = "http://localhost:3000";

// An expected stop: its message is a sentence for the caller, printed as it is.
export class Refusal extends Error {}

/**
 * Replaces the secret in a line before it is shown.
 *
 * @param {string} text what is about to be printed
 * @param {string} secret the bypass secret, empty while none is read (a local run)
 * @returns {string} the text with every copy of the secret replaced
 */
export function scrub(text, secret) {
  return secret
    ? text.split(secret).join("***")
    : text;
}

/**
 * Where the script may go: `pnpm dev` on this machine, or exactly the staging origin, so the secret can go nowhere else.
 *
 * @param {string | undefined} baseUrl BASE_URL; empty or unset means `pnpm dev` on port 3000
 * @returns {{ origin: string, host: string, local: boolean }} the target
 */
export function readTarget(baseUrl) {
  let url;
  try {
    url = new URL(baseUrl || DEFAULT_BASE_URL);
  }
  catch {
    throw new Refusal("BASE_URL is not a URL. It opens `pnpm dev` (http://localhost:<port>) or staging only.");
  }
  const local = url.protocol === "http:" && (url.hostname === "localhost" || url.hostname === "127.0.0.1");
  if (!local && url.origin !== STAGING_ORIGIN) {
    throw new Refusal(`BASE_URL ${url.origin} is refused: this opens \`pnpm dev\` (http://localhost:<port>) and ${STAGING_ORIGIN} only.`);
  }
  if (url.pathname !== "/" || url.search || url.hash) {
    throw new Refusal("BASE_URL is an address without a path: the path is the script's first argument.");
  }
  return { origin: url.origin, host: url.host, local };
}

/**
 * The path to open, as a place inside the target's origin.
 *
 * @param {string} raw the script's first argument, with or without the leading slash
 * @param {{ origin: string }} target the target `readTarget` returned
 * @returns {string} the path, with its leading slash
 */
export function readPath(raw, target) {
  if (/^[A-Z]:[\\/]/i.test(raw)) {
    throw new Refusal("The path looks like a Windows path: Git Bash rewrites an argument that starts with `/` (`/` becomes `C:/Program Files/Git/`). Write the path without its leading slash, or leave it out for `/`.");
  }
  if (raw.startsWith("//") || /^[A-Z][A-Z0-9+.-]*:/i.test(raw)) {
    throw new Refusal("The path is a place in the app, not a URL: no scheme and no `//`.");
  }
  const path = raw.startsWith("/")
    ? raw
    : `/${raw}`;
  // `/\evil.com` counts as `//evil.com` to a browser, so the origin is compared and not just the start of the string.
  if (new URL(path, target.origin).origin !== target.origin) {
    throw new Refusal("The path leaves the app's origin.");
  }
  return path;
}

// The toolbar's dialects (.storybook/preview.ts).
export const DIALECTS = ["workspace", "broadcast", "showcase"];

/**
 * What the caller asked a picture to look like: the theme, the motion and, for a story, the dialect.
 *
 * @param {{ dark?: boolean, fullMotion?: boolean, dialect?: string }} flags the script's `--dark`, `--full-motion`, `--dialect`
 * @param {boolean} isStory whether a story is opened (`--story`); a page's dialect is the app's own
 * @returns {{ theme: "light" | "dark", motion: "reduce" | "full", dialect: string, colorScheme: "light" | "dark", reducedMotion: "reduce" | "no-preference" }} the look, with the two browser settings that give it
 */
export function readLook({ dark, fullMotion, dialect }, isStory) {
  if (dialect !== undefined) {
    if (!isStory) {
      throw new Refusal("--dialect is for a story: a page's dialect is the app's own.");
    }
    if (!DIALECTS.includes(dialect)) {
      throw new Refusal(`--dialect ${JSON.stringify(dialect)} is not one of ${DIALECTS.join(", ")} (the toolbar's dialects).`);
    }
  }
  const theme = dark ? "dark" : "light";
  const motion = fullMotion ? "full" : "reduce";
  return {
    theme,
    motion,
    dialect: dialect ?? "workspace",
    colorScheme: theme,
    reducedMotion: fullMotion ? "no-preference" : "reduce",
  };
}

// A Storybook id: lowercase words joined by `-`, one `--` between the component and the story (`ui-button--primary`).
const STORY_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*--[a-z0-9]+(?:-[a-z0-9]+)*$/;
const STORY_ID_CHARS = 200;

/**
 * The address of one story's own page (no Storybook manager around it), built on the target's origin and nothing else.
 * Staging serves Storybook under `/storybook/` (ADR-0005); `pnpm storybook` serves it at the root.
 *
 * @param {string} id the story's id, the one in the Storybook address (`?path=/story/<id>`)
 * @param {{ theme: string, dialect: string, motion: string }} look what `readLook` returned
 * @param {{ origin: string, local: boolean }} target the target `readTarget` returned
 * @returns {string} the story's address
 */
export function readStoryUrl(id, look, target) {
  if (typeof id !== "string" || id.length > STORY_ID_CHARS || !STORY_ID.test(id)) {
    throw new Refusal(`${JSON.stringify(id)} is not a story id: lowercase words joined by \`-\`, one \`--\` between the component and the story, as in \`ui-button--primary\`. It is the id in the Storybook address (\`?path=/story/<id>\`), not a path or a URL.`);
  }
  const prefix = target.local ? "" : "/storybook";
  const url = new URL(`${prefix}/iframe.html`, target.origin);
  url.searchParams.set("id", id);
  url.searchParams.set("viewMode", "story");
  // Storybook's own encoding of the toolbar's globals (.storybook/preview.ts).
  url.searchParams.set("globals", `theme:${look.theme};dialect:${look.dialect};motion:${look.motion}`);
  return url.href;
}

/**
 * How a story's render ended, from the last `currentRender.phase` the preview showed. A story with no play function
 * ends `completed` too, so it reads as passed.
 *
 * @param {string | null | undefined} phase the last phase, `null` or `undefined` when the page had no preview or render
 * @returns {{ outcome: "passed" | "failed" | "never ended", line: string }} the outcome and the line to print
 */
export function describePhase(phase) {
  if (phase === "completed" || phase === "finished") {
    return { outcome: "passed", line: `play function passed (phase ${phase})` };
  }
  if (phase === "errored") {
    return { outcome: "failed", line: "play function failed (phase errored)" };
  }
  if (phase === "aborted") {
    return { outcome: "failed", line: "play function failed (phase aborted: the render was cut off)" };
  }
  return { outcome: "never ended", line: `play function never ended (last phase: ${phase || "none"})` };
}

/**
 * The phase to describe, from the last one the preview showed and every one it went through. Storybook runs a render
 * on to `completed` and `finished` after a play function threw, so the last phase alone reads a failure as a pass:
 * a render that went through `errored` or `aborted` ended in it.
 *
 * @param {string | null | undefined} last the last `currentRender.phase` the page showed
 * @param {string[] | undefined} seen the phases of every `storyRenderPhaseChanged` event, `undefined` when none were recorded
 * @returns {string | null | undefined} the phase `describePhase` reads
 */
export function settlePhase(last, seen) {
  return ["errored", "aborted"].find(phase => seen?.includes(phase)) ?? last;
}

/**
 * What to print about the look, so a caller can tell a picture that took it from one that did not: an account that
 * saved a theme beats the browser's dark scheme. Nothing for the default look, so a call without flags prints as before.
 *
 * @param {{ theme: string, motion: string, dialect: string }} look what `readLook` returned
 * @param {{ theme: string | null, motion: string | null, prefersReduced: boolean }} seen `<html data-theme>`, `<html data-motion>` and `prefers-reduced-motion: reduce` as the page ended up
 * @param {number} width the viewport width the line is about
 * @returns {string[]} the lines, none for the default look
 */
export function describeLook(look, seen, width) {
  if (look.theme === "light" && look.motion === "reduce" && look.dialect === "workspace") {
    return [];
  }
  const lines = [
    `look [${width}]: <html data-theme="${seen.theme ?? "none"}" data-motion="${seen.motion ?? "none"}">, prefers-reduced-motion ${seen.prefersReduced ? "reduce" : "no-preference"}`,
  ];
  if (look.theme === "dark" && seen.theme !== "dark") {
    lines.push(`note: --dark asked, but <html data-theme> is "${seen.theme ?? "none"}": the page keeps its own saved theme`);
  }
  if (look.motion === "full" && (seen.motion === "reduce" || seen.prefersReduced)) {
    const what = [
      seen.motion === "reduce"
        ? "<html data-motion> is \"reduce\""
        : null,
      seen.prefersReduced ? "prefers-reduced-motion still matches" : null,
    ].filter(Boolean).join(" and ");
    lines.push(`note: --full-motion asked, but reduced motion is still on: ${what}`);
  }
  return lines;
}

/**
 * The name of a screenshot: the slug, the width and, only for a look that is not the default, the look.
 *
 * @param {string} slug what `slugOf` returned, or `story-` and that of a story's id
 * @param {number} width the viewport width
 * @param {{ theme: string, motion: string, dialect: string }} look what `readLook` returned
 * @returns {string} the file name, `home-1440.png` for the default look
 */
export function shotFileName(slug, width, look) {
  const parts = [
    slug,
    String(width),
  ];
  if (look.theme === "dark") {
    parts.push("dark");
  }
  if (look.motion === "full") {
    parts.push("full-motion");
  }
  if (look.dialect !== "workspace") {
    parts.push(look.dialect);
  }
  return `${parts.join("-")}.png`;
}

/**
 * The part of a screenshot's file name that says which path it shows.
 *
 * @param {string} path the path that was opened
 * @returns {string} letters, digits and dashes, at most 60 characters; `home` for `/`
 */
export function slugOf(path) {
  const slug = path.split(/[?#]/)[0].replace(/[^A-Z0-9]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 60).replace(/-+$/, "");
  return slug || "home";
}

// How long a step waits for its target, and for the action on it. The failure line quotes it.
export const STEP_MS = 5000;

export const STEPS_MAX_BYTES = 64 * 1024;

/**
 * Where a step file may be read from: a `.json` file, which is read as text and parsed, never imported or run. A
 * `.js` or `.mjs` file is refused so that nobody mistakes the file for a script.
 *
 * @param {string} raw the script's `--steps`
 * @returns {string} the path, as given
 */
export function readStepsPath(raw) {
  if (!/\.json$/i.test(raw)) {
    throw new Refusal(`--steps ${JSON.stringify(raw)} is not a .json file: a step file is data, a JSON list of steps, and is never run.`);
  }
  return raw;
}

const WIDTH_RANGE = "320 to 2560";
const DEFAULT_STEPS_WIDTH = { width: 1440, height: 900 };

/**
 * The one viewport a call with steps runs at (a step that changes a dev Owner's data would do it twice at two widths).
 *
 * @param {string | undefined} raw the script's `--width`
 * @param {boolean} hasSteps whether `--steps` was given
 * @returns {{ width: number, height: number } | undefined} the viewport; `undefined` without steps and without a width, where the script shoots its two widths
 */
export function readWidth(raw, hasSteps) {
  if (raw === undefined) {
    return hasSteps
      ? { ...DEFAULT_STEPS_WIDTH }
      : undefined;
  }
  if (!hasSteps) {
    throw new Refusal("--width needs --steps: without steps the helper shoots both widths.");
  }
  const width = /^\d{3,4}$/.test(raw)
    ? Number(raw)
    : Number.NaN;
  if (!(width >= 320 && width <= 2560)) {
    throw new Refusal(`--width ${JSON.stringify(raw)} is not a width in px from ${WIDTH_RANGE}.`);
  }
  return {
    width,
    height: width <= 600
      ? 844
      : 900,
  };
}

// A step file is data, not a script: every kind lists the fields it takes, and no other field is read, let alone
// evaluated, so nothing in the file can run code in the page or in Node, or reach a request header (#359, B1).
const TARGET_FIELDS = ["role", "name", "exact", "selector"];
const STEP_FIELDS = {
  click: [...TARGET_FIELDS, "shot", "read"],
  hover: [...TARGET_FIELDS, "shot", "read"],
  press: ["key", "shot", "read"],
  type: [
    ...TARGET_FIELDS,
    "text",
    "shot",
    "read",
  ],
  wait: ["ms", ...TARGET_FIELDS, "shot", "read"],
};
const STEP_KINDS = Object.keys(STEP_FIELDS);
const MAX_STEPS = 50;
const MAX_VALUE_CHARS = 200;
const ECHO_CHARS = 40;
const ROLE = /^[a-z]+$/;
const KEY = /^[A-Z0-9]+(?:\+[A-Z0-9]+)*$/i;
const SHOT_LABEL = /^[a-z0-9][a-z0-9-]{0,39}$/;
const READ_OUTS = ["focus", "animations"];

function echo(value) {
  const text = String(value);
  return JSON.stringify(text.length > ECHO_CHARS
    ? `${text.slice(0, ECHO_CHARS)}...`
    : text);
}

function isString(value, min, max) {
  return typeof value === "string" && value.length >= min && value.length <= max;
}

function readTargetFields(raw, refuse) {
  const hasRole = Object.hasOwn(raw, "role");
  const hasSelector = Object.hasOwn(raw, "selector");
  if (hasRole && hasSelector) {
    refuse("\"role\" and \"selector\" both name the target: give one.");
  }
  if (!hasRole && (Object.hasOwn(raw, "name") || Object.hasOwn(raw, "exact"))) {
    refuse("\"name\" and \"exact\" go with a \"role\": give the role too, or use \"selector\".");
  }
  if (Object.hasOwn(raw, "exact") && !Object.hasOwn(raw, "name")) {
    refuse("\"exact\" goes with a \"name\".");
  }
  if (hasSelector) {
    if (!isString(raw.selector, 1, MAX_VALUE_CHARS)) {
      refuse(`"selector" must be a string of 1 to ${MAX_VALUE_CHARS} characters.`);
    }
    return { kind: "selector", selector: raw.selector };
  }
  if (!hasRole) {
    return undefined;
  }
  if (typeof raw.role !== "string" || raw.role.length > 30 || !ROLE.test(raw.role)) {
    refuse("\"role\" must be an ARIA role in lowercase letters, such as \"button\".");
  }
  const target = { kind: "role", role: raw.role };
  if (Object.hasOwn(raw, "name")) {
    if (!isString(raw.name, 1, MAX_VALUE_CHARS)) {
      refuse(`"name" must be a string of 1 to ${MAX_VALUE_CHARS} characters.`);
    }
    target.name = raw.name;
  }
  if (Object.hasOwn(raw, "exact")) {
    if (typeof raw.exact !== "boolean") {
      refuse("\"exact\" must be true or false.");
    }
    target.exact = raw.exact;
  }
  return target;
}

function readStep(raw, index) {
  const number = index + 1;
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Refusal(`step ${number}: a step is an object like {"do": "click", ...}.`);
  }
  const kind = Object.hasOwn(raw, "do")
    ? raw.do
    : undefined;
  if (typeof kind !== "string" || !STEP_KINDS.includes(kind)) {
    const what = Object.hasOwn(raw, "do")
      ? echo(typeof kind === "string"
          ? kind
          : JSON.stringify(kind))
      : "(no \"do\")";
    throw new Refusal(`step ${number}: unknown step ${what}: the steps are ${STEP_KINDS.join(", ")}.`);
  }
  const refuse = (message) => {
    throw new Refusal(`step ${number} (${kind}): ${message}`);
  };
  const allowed = STEP_FIELDS[kind];
  for (const field of Object.keys(raw)) {
    if (field !== "do" && !allowed.includes(field)) {
      refuse(`unknown field ${echo(field)}: a ${kind} takes ${allowed.map(name => `"${name}"`).join(", ")}. A step file is data: nothing in it runs.`);
    }
  }

  const step = { number, do: kind };
  const target = kind === "press"
    ? undefined
    : readTargetFields(raw, refuse);
  if (target) {
    step.target = target;
  }
  if (kind === "press") {
    if (!Object.hasOwn(raw, "key")) {
      refuse("no key: name one, such as \"Escape\" or \"Shift+Tab\".");
    }
    if (typeof raw.key !== "string" || raw.key.length > 40 || !KEY.test(raw.key)) {
      refuse("\"key\" must be a key name such as \"Escape\", \"ArrowDown\" or \"Shift+Tab\".");
    }
    step.key = raw.key;
  }
  else if (kind === "wait") {
    const hasMs = Object.hasOwn(raw, "ms");
    if (hasMs === Boolean(target)) {
      refuse(hasMs
        ? "\"ms\" and a target both given: wait for a time or for a target, not both."
        : "nothing to wait for: give \"ms\", or a target by \"role\" (with \"name\") or by \"selector\".");
    }
    if (hasMs) {
      if (!Number.isInteger(raw.ms) || raw.ms < 0 || raw.ms > 10_000) {
        refuse("\"ms\" must be a whole number from 0 to 10000.");
      }
      step.ms = raw.ms;
    }
  }
  else {
    if (!target) {
      refuse("no target: name one by \"role\" (with \"name\") or by \"selector\".");
    }
    if (kind === "type") {
      if (!Object.hasOwn(raw, "text")) {
        refuse("no text: \"text\" is what to type.");
      }
      if (!isString(raw.text, 0, MAX_VALUE_CHARS)) {
        refuse(`"text" must be a string of 0 to ${MAX_VALUE_CHARS} characters.`);
      }
      step.text = raw.text;
    }
  }

  if (Object.hasOwn(raw, "shot")) {
    if (raw.shot !== true && !(typeof raw.shot === "string" && SHOT_LABEL.test(raw.shot))) {
      refuse("\"shot\" must be true or a label of lowercase letters, digits and dashes (at most 40) for the file name.");
    }
    step.shot = raw.shot === true
      ? kind
      : raw.shot;
  }
  step.read = [];
  if (Object.hasOwn(raw, "read")) {
    const asked = raw.read;
    if (!Array.isArray(asked) || asked.some(what => !READ_OUTS.includes(what)) || new Set(asked).size !== asked.length) {
      refuse(`"read" must be a list of ${READ_OUTS.map(what => `"${what}"`).join(" and ")}, each once.`);
    }
    step.read = [...asked];
  }
  return step;
}

/**
 * The steps in a step file, as plain data. An allow-list: a kind, a field or a value the helper does not know is
 * refused, so nothing in the file can be evaluated, used as a URL, a header or a module path.
 *
 * @param {string} text the file's text (never imported or evaluated, only parsed as JSON)
 * @returns {{ number: number, do: "click" | "hover" | "press" | "type" | "wait", target?: { kind: "role", role: string, name?: string, exact?: boolean } | { kind: "selector", selector: string }, key?: string, text?: string, ms?: number, shot?: string, read: ("focus" | "animations")[] }[]} the steps, numbered from 1
 */
export function readSteps(text) {
  let list;
  try {
    list = JSON.parse(text);
  }
  catch (error) {
    throw new Refusal(`The step file is not JSON: ${String(error.message).split("\n")[0]}`);
  }
  if (!Array.isArray(list)) {
    throw new Refusal("The step file is not a list of steps: its top level is a JSON list.");
  }
  if (list.length === 0) {
    throw new Refusal("The step file is not a list of steps: it holds no step.");
  }
  if (list.length > MAX_STEPS) {
    throw new Refusal(`The step file is not a list of steps the helper takes: it holds ${list.length}, at most ${MAX_STEPS}.`);
  }
  return list.map(readStep);
}

/**
 * A step's target as words.
 *
 * @param {{ kind: "role", role: string, name?: string, exact?: boolean } | { kind: "selector", selector: string }} target the step's target
 * @returns {string} `button named "Open menu"`, `button`, `selector "header nav a"`
 */
export function describeTarget(target) {
  if (target.kind === "selector") {
    return `selector ${JSON.stringify(target.selector)}`;
  }
  const name = target.name === undefined
    ? ""
    : ` named ${JSON.stringify(target.name)}${target.exact ? " (exact)" : ""}`;
  return `${target.role}${name}`;
}

/**
 * A step as the line printed before it runs.
 *
 * @param {{ do: string, target?: object, key?: string, text?: string, ms?: number }} step what `readSteps` returned
 * @returns {string} `click button named "Open menu"`, `press "Escape"`, `wait 500 ms`
 */
export function describeStep(step) {
  switch (step.do) {
    case "press":
      return `press ${JSON.stringify(step.key)}`;
    case "type": {
      const text = step.text.length > ECHO_CHARS
        ? `${step.text.slice(0, ECHO_CHARS)}...`
        : step.text;
      return `type ${JSON.stringify(text)} into ${describeTarget(step.target)}`;
    }
    case "wait":
      return step.ms === undefined
        ? `wait for ${describeTarget(step.target)}`
        : `wait ${step.ms} ms`;
    default:
      return `${step.do} ${describeTarget(step.target)}`;
  }
}

/**
 * The line that ends a run at a step that failed. Only first lines of Playwright's message reach it: the call log
 * lists request headers.
 *
 * @param {{ number: number, do: string }} step the step that failed
 * @param {number} total how many steps the file holds
 * @param {{ kind: "missing" } | { kind: "ambiguous" } | { kind: "other", message: string }} why what went wrong
 * @returns {string} the line
 */
export function describeStepFailure(step, total, why) {
  const reason = why.kind === "missing"
    ? `nothing matched within ${STEP_MS / 1000} s`
    : why.kind === "ambiguous"
      ? "more than one element matched; give the exact name (exact), a longer name or a selector"
      : why.message;
  return `step ${step.number} of ${total} failed: ${describeStep(step)}: ${reason}`;
}

const MAX_ANIMATION_LINES = 20;

// `<tag#id.class1.class2 role=menu>`: the first two classes only, `::before` after it for a pseudo-element.
function describeElement(element) {
  const classes = element.classes.slice(0, 2).map(name => `.${name}`).join("");
  const role = element.role
    ? ` role=${element.role}`
    : "";
  return `<${element.tag}${element.id
    ? `#${element.id}`
    : ""}${classes}${role}>${element.pseudo ?? ""}`;
}

/**
 * What has focus, from the page's read-out.
 *
 * @param {{ element: { tag: string, id: string | null, classes: string[], role: string | null, pseudo?: string }, aria: string | null, focusVisible: boolean } | null} raw `null` when the page itself has focus
 * @returns {string} the line
 */
export function describeFocus(raw) {
  if (raw === null) {
    return "focus: none (the page itself)";
  }
  const element = describeElement(raw.element);
  const what = raw.aria === null
    ? `${element} (no role)`
    : `${raw.aria} (${element})`;
  return `focus: ${what}, :focus-visible ${raw.focusVisible ? "matches" : "does not match"}`;
}

/**
 * What is running, from the page's read-out.
 *
 * @param {{ running: { kind: "css-animation" | "css-transition" | "script", name: string | null, properties: string[], durationMs: number, iterations: number | "infinite", target: object | null }[], paused: number }} raw the animations of the document
 * @returns {string[]} the lines: a summary, then one per running animation
 */
export function describeAnimations(raw) {
  const paused = raw.paused > 0
    ? `, ${raw.paused} paused (not listed)`
    : "";
  const lines = [`animations: ${raw.running.length === 0
    ? "none"
    : raw.running.length} running${paused}`];
  for (const animation of raw.running.slice(0, MAX_ANIMATION_LINES)) {
    const what = animation.kind === "script"
      ? "script animation"
      : animation.kind === "css-transition"
        ? "CSS transition"
        : `CSS animation${animation.name
          ? ` ${JSON.stringify(animation.name)}`
          : ""}`;
    const on = animation.target
      ? describeElement(animation.target)
      : "<no element>";
    const properties = animation.properties.length > 0
      ? `: ${animation.properties.join(", ")}`
      : "";
    const times = animation.iterations === 1
      ? ""
      : animation.iterations === "infinite"
        ? ", infinite"
        : `, ${animation.iterations} times`;
    lines.push(`  ${what} on ${on}${properties}; ${animation.durationMs} ms${times}`);
  }
  if (raw.running.length > MAX_ANIMATION_LINES) {
    lines.push(`  ... and ${raw.running.length - MAX_ANIMATION_LINES} more`);
  }
  return lines;
}
