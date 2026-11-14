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
 * The part of a screenshot's file name that says which path it shows.
 *
 * @param {string} path the path that was opened
 * @returns {string} letters, digits and dashes, at most 60 characters; `home` for `/`
 */
export function slugOf(path) {
  const slug = path.split(/[?#]/)[0].replace(/[^A-Z0-9]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 60).replace(/-+$/, "");
  return slug || "home";
}
