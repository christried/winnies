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
