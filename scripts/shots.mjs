// Opens a path of the app as a dev Owner at 1440 and at 390 px, saves a screenshot of each and prints the console
// errors (#238). A subagent in a worktree has no browser of the human's, and from R0 on every ticket's check wants a
// look at a signed-in page. It runs against `pnpm dev` (it does not start it) and against staging.
//
//   node scripts/shots.mjs [path] --out <dir> [--as <name>] [--seed] [--signed-out] [--dark] [--full-motion]
//   node scripts/shots.mjs --story <id> --out <dir> [--dark] [--full-motion] [--dialect <name>]
//
// `path` is where to go (default `/`; with or without the leading slash: Git Bash turns `/x` into `C:/Program Files/Git/x`
// before node sees it, so write `x`). `--as` names the dev Owner (default: the server's `owner`, which every agent shares:
// use your own, so `--seed` does not wipe another agent's Winnies). `--seed` asks for the dummy set (`seed=reset`).
// `--signed-out` skips the sign-in: the page as a Viewer sees it (a Share Link). Each shot prints the tab's title and
// icon, which a screenshot of the page does not show. A path that answers with something other than HTML (`api/winnies`)
// is printed as text, cut, instead of shot (#253: a JSON list waited 60 s per width for a hydration that never comes).
// The pictures are light with reduced motion unless asked: `--dark` and `--full-motion` set the browser's own color
// scheme and motion preference, which a page follows as far as the app follows the OS (an account's saved theme beats
// them, and a note says so). `--story <id>` opens one story of the hosted Storybook instead of a path (staging's
// `/storybook/`, `pnpm storybook`'s root): no sign-in, no hydration to wait for, and it prints how the story's play
// function ended. The toolbar's theme, dialect (`--dialect`) and motion go in the story's address (#364).
// `BASE_URL` picks the target: `http://localhost:3000` by default, or exactly https://staging.winnies.christried.me.
// Nothing else is opened, so the bypass secret can go nowhere else.
//
// Staging sits behind Vercel login. Its Protection Bypass for Automation secret is read from the environment
// (`VERCEL_AUTOMATION_BYPASS_SECRET`, defined even if empty wins), else from the repo's `.env`, and goes out as the
// `x-vercel-protection-bypass` header on requests to the staging origin only: never in a URL, an argument, a file or the
// output. No trace, HAR or video, no logging of headers, and every message that leaves this script passes `scrub`.
// Exit 0 once both screenshots are saved, whatever the console said and whatever phase a story ended in; exit 1 for
// every refusal and failure.
import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";
import { parseArgs, parseEnv } from "node:util";
import { chromium } from "@playwright/test";
import { describeLook, describePhase, readLook, readPath, readStoryUrl, readTarget, Refusal, scrub as scrubSecret, settlePhase, shotFileName, slugOf } from "./shots-guards.mjs";

const SECRET_NAME = "VERCEL_AUTOMATION_BYPASS_SECRET";
const BYPASS_HEADER = "x-vercel-protection-bypass";
const USAGE = "usage: node scripts/shots.mjs [path] --out <dir> [--as <name>] [--seed] [--signed-out] [--story <id>] [--dark] [--full-motion] [--dialect <name>]";
const WIDTHS = [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
];
// The first dev-server compile takes up to 20 s.
const NAVIGATION_MS = 120_000;
const HYDRATION_MS = 60_000;
// Each of the two waits for a story: its render to start, and its play function to end.
const STORY_MS = 20_000;
const SETTLE_MS = 300;
const ERROR_CHARS = 300;
const TEXT_CHARS = 4000;

let secret = "";
// Every line printed goes through here, so a secret that slipped into a message is gone before it is shown.
function scrub(text) {
  return scrubSecret(text, secret);
}
function say(line) {
  console.log(scrub(line));
}
function oneLine(text, limit) {
  const line = text.replace(/\s+/g, " ").trim();
  return line.length > limit
    ? `${line.slice(0, limit)}...`
    : line;
}

const VERCEL_LOGIN = `Vercel login answered instead of the app: on staging the ${SECRET_NAME} is wrong or expired (a new one: the project's Protection Bypass for Automation, then \`bash scripts/staging-wizard.sh\`).`;

function readArgs() {
  let parsed;
  try {
    parsed = parseArgs({
      args: process.argv.slice(2),
      allowPositionals: true,
      strict: true,
      options: {
        "out": { type: "string" },
        "as": { type: "string" },
        "seed": { type: "boolean", default: false },
        "signed-out": { type: "boolean", default: false },
        "story": { type: "string" },
        "dark": { type: "boolean", default: false },
        "full-motion": { type: "boolean", default: false },
        "dialect": { type: "string" },
      },
    });
  }
  catch (error) {
    // Node adds a hint about `--` to the first sentence.
    throw new Refusal(`${error.message.split(/\.\s|\n/)[0].replace(/\.$/, "")}.\n${USAGE}`);
  }
  if (parsed.positionals.length > 1) {
    throw new Refusal(`Only one path is allowed, got ${parsed.positionals.length}.\n${USAGE}`);
  }
  if (!parsed.values.out) {
    throw new Refusal(`--out <dir> is required: the folder the screenshots go to.\n${USAGE}`);
  }
  if (parsed.values["signed-out"] && (parsed.values.as !== undefined || parsed.values.seed)) {
    throw new Refusal(`--signed-out signs nobody in, so --as and --seed have no Owner to act for.\n${USAGE}`);
  }
  if (parsed.values.story !== undefined && parsed.positionals.length > 0) {
    throw new Refusal(`A story is opened by its id, so no path is given.\n${USAGE}`);
  }
  if (parsed.values.story !== undefined && (parsed.values.as !== undefined || parsed.values.seed || parsed.values["signed-out"])) {
    throw new Refusal(`A story signs nobody in, so --as, --seed and --signed-out have no Owner to act for.\n${USAGE}`);
  }
  return {
    path: parsed.positionals[0] ?? "/",
    out: parsed.values.out,
    as: parsed.values.as,
    seed: parsed.values.seed,
    signedOut: parsed.values["signed-out"],
    story: parsed.values.story,
    dark: parsed.values.dark,
    fullMotion: parsed.values["full-motion"],
    dialect: parsed.values.dialect,
  };
}

// Only staging needs the secret, so a local run never reads `.env`. `parseEnv` reads the one key out of the file,
// where `loadEnvFile` would put every variable into this process.
function readSecret() {
  let value = process.env[SECRET_NAME];
  if (value === undefined) {
    try {
      value = parseEnv(readFileSync(new URL("../.env", import.meta.url), "utf8"))[SECRET_NAME];
    }
    catch {
      value = undefined;
    }
  }
  if (!value) {
    throw new Refusal(`Staging needs ${SECRET_NAME}, the project's Protection Bypass for Automation secret, and it is not set. It belongs in the main checkout's .env (\`bash scripts/staging-wizard.sh\` writes it; a new agent worktree gets that file copied through .worktreeinclude, one created before the secret was written has none).`);
  }
  return value;
}

function signInUrl(target, args) {
  const url = new URL("/api/dev/sign-in", target.origin);
  if (args.as !== undefined) {
    url.searchParams.set("as", args.as);
  }
  if (args.seed) {
    url.searchParams.set("seed", "reset");
  }
  return url.href;
}

async function signIn(context, target, args, headers) {
  let response;
  try {
    // A followed redirect would lose the header, and the answer to judge is the sign-in's own.
    response = await context.request.get(signInUrl(target, args), {
      maxRedirects: 0,
      failOnStatusCode: false,
      timeout: NAVIGATION_MS,
      headers,
    });
  }
  catch (error) {
    if (target.local) {
      throw new Refusal(`Nothing answers at ${target.origin} (${oneLine(error.message.split("\n")[0], 120)}): start \`pnpm dev\` (this script does not) or set BASE_URL to its port.`);
    }
    throw error;
  }
  const status = response.status();
  if (status >= 300 && status < 400) {
    let host = "";
    try {
      host = new URL(response.headers().location ?? "", target.origin).hostname;
    }
    catch {
      // An unreadable location is judged as a redirect to somewhere in the app.
    }
    if (host === "vercel.com" || host.endsWith(".vercel.com")) {
      throw new Refusal(VERCEL_LOGIN);
    }
    return;
  }
  if (status === 404) {
    throw new Refusal(`${target.origin} does not carry the dev sign-in (404): \`pnpm dev\` and the staging build do, a production build and a staging deployment older than the dev sign-in do not.`);
  }
  if (status === 400) {
    throw new Refusal(`The dev sign-in refused the request (400): ${response.statusText() || "no reason given"}`);
  }
  throw new Refusal(`The dev sign-in answered ${status} ${response.statusText()}, not a redirect.`);
}

// Signed out, `/api/winnies` answers 401: an agent must not read a signed-out screenshot as the Workspace.
async function confirmSession(context, target, headers) {
  const response = await context.request.get(`${target.origin}/api/winnies`, {
    maxRedirects: 0,
    failOnStatusCode: false,
    timeout: NAVIGATION_MS,
    headers,
  });
  if (response.status() === 401) {
    throw new Refusal("Signed in, but the session cookie did not stick: /api/winnies still answers 401.");
  }
  if (response.status() !== 200) {
    throw new Refusal(`Signed in, but /api/winnies answered ${response.status()} ${response.statusText()}, not 200.`);
  }
}

// What a page and a story share: the viewport, the console listeners, the check that the browser stayed on the target
// (Vercel login answers in its place when the secret is wrong), the fonts, the settle and the picture. `open` is what
// differs: it goes to the address, waits until the page is ready and returns `{ text }` to stop without a picture, or
// `{ phase }` for a story.
async function capture(context, target, size, file, errors, open) {
  const page = await context.newPage();
  try {
    await page.setViewportSize(size);
    page.on("console", (message) => {
      if (message.type() === "error") {
        errors.push(`[${size.width}] ${oneLine(message.text(), ERROR_CHARS)}`);
      }
    });
    page.on("pageerror", (error) => {
      errors.push(`[${size.width}] uncaught: ${oneLine(error.message, ERROR_CHARS)}`);
    });
    const landedOnTarget = () => new URL(page.url()).host === target.host;
    const opened = await open(page, landedOnTarget);
    if (opened.text !== undefined) {
      return opened;
    }
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(SETTLE_MS);
    if (!landedOnTarget()) {
      throw new Refusal(VERCEL_LOGIN);
    }
    // Viewport only: a Workspace of 50 Challenges is very tall.
    await page.screenshot({ path: file });
    // The tab is outside the screenshot; the icon changes with the Winnie's state (app/composables/use-favicon.ts).
    const tab = await page.evaluate(() => ({
      title: document.title,
      icon: document.querySelector("link[rel~=\"icon\"]")?.getAttribute("href") ?? "none",
      // What the page ended up with: the look asked for it, but an account's saved theme can beat the browser's scheme.
      seen: {
        theme: document.documentElement.getAttribute("data-theme"),
        motion: document.documentElement.getAttribute("data-motion"),
        prefersReduced: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      },
    }));
    return { ...tab, phase: opened.phase };
  }
  finally {
    await page.close();
  }
}

function shoot(context, target, path, size, file, errors) {
  return capture(context, target, size, file, errors, async (page, landedOnTarget) => {
    const response = await page.goto(new URL(path, target.origin).href, { timeout: NAVIGATION_MS });
    if (!landedOnTarget()) {
      throw new Refusal(VERCEL_LOGIN);
    }
    // JSON or text has no Nuxt to hydrate and nothing a screenshot shows better than its text.
    const type = response?.headers()["content-type"] ?? "";
    if (response && !type.includes("text/html")) {
      return { text: `${response.status()} ${type || "no content type"}: ${oneLine(await response.text(), TEXT_CHARS)}` };
    }
    // What `waitForHydration` of @nuxt/test-utils checks (tests/e2e/fixtures.ts): a shot before it shows markup without handlers.
    try {
      await page.waitForFunction(() => window.useNuxtApp?.().isHydrating === false, undefined, { timeout: HYDRATION_MS });
    }
    catch {
      say(`note: Nuxt had not hydrated after ${HYDRATION_MS / 1000} s at ${size.width} px, the shot is taken anyway.`);
    }
    return {};
  });
}

// A story has no Nuxt app to hydrate. It is ready when its render has ended: a story with a play function drives the
// same controls a check would, so the shot waits for the play function to pass or fail, and the phase the render
// ended in is what gets printed (the picture of a failed one can look clean). The waits are those of the local checks'
// harness (#359, B1).
function shootStory(context, target, url, size, file, errors) {
  return capture(context, target, size, file, errors, async (page, landedOnTarget) => {
    // Storybook runs a render on to `finished` after a play function threw, so the last phase can read a failure as a
    // pass: record every phase the preview's channel announces, from the first (the channel is set once, early).
    await page.addInitScript(() => {
      let channel;
      Object.defineProperty(window, "__STORYBOOK_ADDONS_CHANNEL__", {
        configurable: true,
        get: () => channel,
        set: (value) => {
          channel = value;
          window.__shotsPhases = [];
          value?.on?.("storyRenderPhaseChanged", ({ newPhase }) => window.__shotsPhases.push(newPhase));
        },
      });
    });
    await page.goto(url, { timeout: NAVIGATION_MS });
    if (!landedOnTarget()) {
      throw new Refusal(VERCEL_LOGIN);
    }
    let phase;
    try {
      await page.waitForFunction(() => document.querySelector("#storybook-root")?.children.length > 0
        && !document.body.classList.contains("sb-show-preparing-story"), undefined, { timeout: STORY_MS });
      const ended = await page.waitForFunction(() => {
        const phase = window.__STORYBOOK_PREVIEW__?.currentRender?.phase;
        return [
          "completed",
          "finished",
          "errored",
          "aborted",
        ].includes(phase)
          ? phase
          : false;
      }, undefined, { timeout: STORY_MS });
      phase = await ended.jsonValue();
    }
    catch {
      // A timeout: the picture is taken anyway, and the phase the render stopped in is the answer.
      phase = await page.evaluate(() => window.__STORYBOOK_PREVIEW__?.currentRender?.phase ?? null).catch(() => null);
    }
    const seen = await page.evaluate(() => window.__shotsPhases).catch(() => undefined);
    return {
      phase: settlePhase(phase, seen),
    };
  });
}

async function main() {
  const args = readArgs();
  const target = readTarget(process.env.BASE_URL);
  const look = readLook(args, Boolean(args.story));
  // A story has no path: its address is built from its id, on the target's origin and nothing else.
  const storyUrl = args.story === undefined
    ? undefined
    : readStoryUrl(args.story, look, target);
  const path = storyUrl === undefined
    ? readPath(args.path, target)
    : undefined;
  if (!target.local) {
    secret = readSecret();
  }
  const out = resolve(args.out);
  const headers = secret
    ? { [BYPASS_HEADER]: secret }
    : undefined;

  let browser;
  try {
    // Unset, the Chromium Playwright downloaded. A cloud session's container brings its own (docs/agents/cloud.md).
    browser = await chromium.launch({ executablePath: process.env.WINNIES_CHROMIUM || undefined });
  }
  catch (error) {
    const first = error.message.split("\n")[0];
    throw new Refusal(/Executable doesn't exist|playwright install/i.test(error.message)
      ? `${oneLine(first, 200)}\nThe e2e browser is missing: run \`pnpm exec playwright install chromium\` once per machine (README, Tests). A cloud session sets WINNIES_CHROMIUM instead (docs/agents/cloud.md).`
      : first);
  }
  try {
    // `context.request` runs in Node and, unlike the browser, does not read HTTPS_PROXY by itself. In a cloud session
    // the proxy is the only way out, and it is what adds the real bypass header (docs/agents/cloud.md § Staging).
    const proxy = process.env.HTTPS_PROXY
      ? { server: process.env.HTTPS_PROXY }
      : undefined;
    // Light and reduced are what the old fixed option and Playwright's default scheme gave, so a call without flags
    // takes the same pictures. A page follows these settings; a story also gets them as globals in its address.
    const context = await browser.newContext({ reducedMotion: look.reducedMotion, colorScheme: look.colorScheme, proxy });
    // The devtools pill of `pnpm dev` would sit in every screenshot.
    await context.addInitScript(() => {
      document.addEventListener("DOMContentLoaded", () => {
        const style = document.createElement("style");
        style.textContent = "#nuxt-devtools-container{display:none !important}";
        document.head.append(style);
      });
    });
    if (headers) {
      // Scoped to the staging origin: no other host (a CDN, a font host) ever sees the secret. The helper's own
      // `context.request` calls pass the header themselves, a route does not intercept them.
      await context.route(`${target.origin}/**`, route => route.continue({
        headers: {
          ...route.request().headers(),
          ...headers,
        },
      }));
    }

    if (storyUrl !== undefined) {
      say(`target: ${target.origin}, story ${args.story}`);
    }
    else if (args.signedOut) {
      say(`target: ${target.origin}, signed out`);
    }
    else {
      await signIn(context, target, args, headers);
      await confirmSession(context, target, headers);
      say(`target: ${target.origin} as ${args.as ?? "owner (default)"}${args.seed ? ", dummy set requested" : ""}`);
    }
    mkdirSync(out, { recursive: true });

    const errors = [];
    const slug = storyUrl === undefined
      ? slugOf(path)
      : `story-${slugOf(args.story)}`;
    for (const size of WIDTHS) {
      const file = resolve(out, shotFileName(slug, size.width, look));
      const shot = storyUrl === undefined
        ? await shoot(context, target, path, size, file, errors)
        : await shootStory(context, target, storyUrl, size, file, errors);
      if (shot.text !== undefined) {
        say(`not a page, so no shot: ${shot.text}`);
        break;
      }
      // Before the picture's line: a failed play function can leave a clean-looking picture.
      if (storyUrl !== undefined) {
        say(`story ${args.story} at ${size.width} px: ${describePhase(shot.phase).line}`);
      }
      describeLook(look, shot.seen, size.width).forEach(line => say(line));
      say(`shot: ${file} (title "${shot.title}", icon ${shot.icon})`);
    }
    if (errors.length === 0) {
      say("no console errors");
    }
    else {
      say(`console errors (${errors.length}):`);
      errors.forEach(error => say(error));
    }
  }
  finally {
    await browser.close();
  }
}

main().catch((error) => {
  // The first line only: Playwright's call log lists the request headers, the secret among them.
  const message = error instanceof Refusal
    ? error.message
    : oneLine(String(error?.message ?? error).split("\n")[0], 300);
  console.log(scrub(message));
  process.exitCode = 1;
});
