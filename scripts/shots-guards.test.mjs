import { describe, expect, it } from "vitest";
import { describeLook, describePhase, readLook, readPath, readStoryUrl, readTarget, Refusal, scrub, settlePhase, shotFileName, slugOf, STAGING_ORIGIN } from "./shots-guards.mjs";

// scripts/shots.mjs holds the Playwright work; what keeps the Vercel bypass secret from leaving the staging
// origin is decided here (#238): which origin it may open, which path, and what a printed line may show.

const LOCAL = { origin: "http://localhost:3000", host: "localhost:3000", local: true };
const STAGING = { origin: STAGING_ORIGIN, host: new URL(STAGING_ORIGIN).host, local: false };

describe("scripts/shots-guards.mjs readTarget", () => {
  it("opens the local dev server when BASE_URL is not set", () => {
    expect(readTarget(undefined)).toEqual(LOCAL);
    expect(readTarget("")).toEqual(LOCAL);
  });

  it.each([
    ["http://localhost:3000", LOCAL],
    [
      "http://localhost:4123",
      { origin: "http://localhost:4123", host: "localhost:4123", local: true },
    ],
    [
      "http://127.0.0.1:3000",
      { origin: "http://127.0.0.1:3000", host: "127.0.0.1:3000", local: true },
    ],
  ])("opens %s", (baseUrl, expected) => {
    expect(readTarget(baseUrl)).toEqual(expected);
  });

  it("opens exactly the staging origin, the only target that takes the secret", () => {
    expect(STAGING_ORIGIN).toBe("https://staging.winnies.christried.me");
    expect(readTarget(STAGING_ORIGIN)).toEqual(STAGING);
    expect(readTarget(`${STAGING_ORIGIN}/`)).toEqual(STAGING);
  });

  it.each([
    ["the staging host over http", "http://staging.winnies.christried.me"],
    ["the staging host on another port", "https://staging.winnies.christried.me:8443"],
    ["a look-alike host that starts with staging's", "https://staging.winnies.christried.me.evil.com"],
    ["a look-alike host with staging's as its path", "https://evil.com/staging.winnies.christried.me"],
    ["a look-alike host behind userinfo", "https://staging.winnies.christried.me@evil.com"],
    ["a look-alike host that ends in staging's", "https://evilstaging.winnies.christried.me"],
    ["the production host", "https://winnies.christried.me"],
    ["any other host", "https://evil.com"],
    ["localhost over https", "https://localhost:3000"],
    ["a host that starts with localhost", "http://localhost.evil.com:3000"],
    ["another local address", "http://0.0.0.0:3000"],
    ["a local address of a look-alike scheme", "ftp://localhost:3000"],
  ])("refuses %s", (_what, baseUrl) => {
    expect(() => readTarget(baseUrl)).toThrow(Refusal);
    expect(() => readTarget(baseUrl)).toThrow(/is refused/);
  });

  it.each([
    ["a path", `${STAGING_ORIGIN}/winnies`],
    ["a query", `${STAGING_ORIGIN}/?a=1`],
    ["a hash", `${STAGING_ORIGIN}/#a`],
    ["a path on the dev server", "http://localhost:3000/winnies"],
  ])("refuses an address with %s: the path is the script's argument", (_what, baseUrl) => {
    expect(() => readTarget(baseUrl)).toThrow(/without a path/);
  });

  it("refuses a BASE_URL that is no URL", () => {
    expect(() => readTarget("not a url")).toThrow(/is not a URL/);
  });
});

describe("scripts/shots-guards.mjs readPath", () => {
  it.each([
    ["/", "/"],
    ["/winnies", "/winnies"],
    ["winnies", "/winnies"],
    ["winnies/abc?x=1#top", "/winnies/abc?x=1#top"],
  ])("takes %j as %j", (raw, expected) => {
    expect(readPath(raw, STAGING)).toBe(expected);
    expect(readPath(raw, LOCAL)).toBe(expected);
  });

  it.each([
    "C:/Program Files/Git/winnies",
    "c:\\Program Files\\Git\\winnies",
  ])("refuses the Windows path Git Bash makes of a leading slash: %j", (raw) => {
    expect(() => readPath(raw, LOCAL)).toThrow(/Windows path/);
  });

  it.each([
    ["a protocol-relative URL", "//evil.com"],
    ["an absolute URL", "https://evil.com/x"],
    ["a scheme", "javascript:alert(1)"],
    ["a data URL", "data:text/html,x"],
  ])("refuses %s: a path is a place in the app, not a URL", (_what, raw) => {
    expect(() => readPath(raw, STAGING)).toThrow(/not a URL/);
  });

  it.each([
    ["a backslash a browser reads as a slash", "/\\evil.com"],
    ["a backslash without the leading slash", "\\evil.com"],
    ["a tab a browser strips", "/\t/evil.com"],
    ["a newline a browser strips", "/\n/evil.com"],
  ])("refuses a path that leaves the origin by %s", (_what, raw) => {
    expect(() => readPath(raw, STAGING)).toThrow(/leaves the app's origin/);
  });
});

describe("scripts/shots-guards.mjs slugOf", () => {
  it.each([
    ["/", "home"],
    ["/???", "home"],
    ["/winnies/abc", "winnies-abc"],
    ["/a/b?c#d", "a-b"],
    ["/Ünï/x", "n-x"],
    [
      `/${"a".repeat(59)}/b`,
      "a".repeat(59),
    ],
  ])("names the file of %j %j", (path, expected) => {
    expect(slugOf(path)).toBe(expected);
  });
});

describe("scripts/shots-guards.mjs scrub", () => {
  it("replaces the secret wherever it appears in a line", () => {
    expect(scrub("a hunter2 b hunter2", "hunter2")).toBe("a *** b ***");
    expect(scrub("x-protection-bypass: hunter2", "hunter2")).toBe("x-protection-bypass: ***");
  });

  it("replaces it in every line of a multi-line message", () => {
    expect(scrub("first hunter2\nsecond\nthird hunter2", "hunter2")).toBe("first ***\nsecond\nthird ***");
  });

  it("treats the secret as text, not as a pattern", () => {
    expect(scrub("a.*b and a.*b", "a.*b")).toBe("*** and ***");
    expect(scrub("axxb", "a.*b")).toBe("axxb");
  });

  it("leaves a line as it is when there is no secret yet (a local run)", () => {
    expect(scrub("nothing to hide", "")).toBe("nothing to hide");
  });
});

const DEFAULT_LOOK = {
  theme: "light",
  motion: "reduce",
  dialect: "workspace",
  colorScheme: "light",
  reducedMotion: "reduce",
};

describe("scripts/shots-guards.mjs readLook", () => {
  it("is light with reduced motion and the Workspace dialect when no flag is given, as before the flags", () => {
    expect(readLook({}, false)).toEqual(DEFAULT_LOOK);
    expect(readLook({ dark: false, fullMotion: false }, true)).toEqual(DEFAULT_LOOK);
  });

  it("asks the browser for a dark scheme with --dark", () => {
    expect(readLook({ dark: true }, false)).toEqual({ ...DEFAULT_LOOK, theme: "dark", colorScheme: "dark" });
  });

  it("asks the browser for no reduced-motion preference with --full-motion", () => {
    expect(readLook({ fullMotion: true }, false)).toEqual({ ...DEFAULT_LOOK, motion: "full", reducedMotion: "no-preference" });
  });

  it("takes dark and full motion together", () => {
    expect(readLook({ dark: true, fullMotion: true }, true)).toEqual({
      theme: "dark",
      motion: "full",
      dialect: "workspace",
      colorScheme: "dark",
      reducedMotion: "no-preference",
    });
  });

  it("takes a dialect for a story", () => {
    expect(readLook({ dialect: "broadcast" }, true)).toEqual({ ...DEFAULT_LOOK, dialect: "broadcast" });
  });

  it.each(["overlay", "Broadcast", ""])("refuses the dialect %j and names the three", (dialect) => {
    expect(() => readLook({ dialect }, true)).toThrow(Refusal);
    expect(() => readLook({ dialect }, true)).toThrow(/workspace, broadcast, showcase/);
  });

  it("refuses a dialect for a page: a page's dialect is the app's own", () => {
    expect(() => readLook({ dialect: "broadcast" }, false)).toThrow(Refusal);
    expect(() => readLook({ dialect: "broadcast" }, false)).toThrow(/--dialect is for a story/);
  });
});

const STORY_IDS = ["ui-button--primary", "motion-total-timer--idle-loop", "ui-counter--with-50-challenges"];

describe("scripts/shots-guards.mjs readStoryUrl", () => {
  it.each(STORY_IDS)("opens %s on staging's /storybook/ with the toolbar's globals in the address", (id) => {
    const url = new URL(readStoryUrl(id, DEFAULT_LOOK, STAGING));
    expect(url.origin).toBe(STAGING_ORIGIN);
    expect(url.pathname).toBe("/storybook/iframe.html");
    expect(url.searchParams.get("id")).toBe(id);
    expect(url.searchParams.get("viewMode")).toBe("story");
    expect(url.searchParams.get("globals")).toBe("theme:light;dialect:workspace;motion:reduce");
  });

  it.each(STORY_IDS)("opens %s at /iframe.html on a local target (pnpm storybook serves no /storybook/)", (id) => {
    const url = new URL(readStoryUrl(id, DEFAULT_LOOK, LOCAL));
    expect(url.origin).toBe(LOCAL.origin);
    expect(url.pathname).toBe("/iframe.html");
  });

  it("puts the query keys in the order id, viewMode, globals", () => {
    const url = new URL(readStoryUrl("ui-button--primary", DEFAULT_LOOK, LOCAL));
    expect([
      ...url.searchParams.keys(),
    ]).toEqual(["id", "viewMode", "globals"]);
  });

  it("names dark, showcase and full motion in the globals", () => {
    const look = readLook({ dark: true, fullMotion: true, dialect: "showcase" }, true);
    const url = new URL(readStoryUrl("ui-button--primary", look, STAGING));
    expect(url.searchParams.get("globals")).toBe("theme:dark;dialect:showcase;motion:full");
  });

  it.each([STAGING, LOCAL])("stays on the target's origin and carries no secret or header for %j", (target) => {
    for (const id of STORY_IDS) {
      const href = readStoryUrl(id, DEFAULT_LOOK, target);
      expect(new URL(href).origin).toBe(target.origin);
      expect(href).not.toMatch(/bypass|x-vercel/i);
    }
  });

  it.each([
    ["an empty id", ""],
    ["no id", undefined],
    ["uppercase", "UI-Button--Primary"],
    ["no double dash", "ui-button"],
    ["no story after the double dash", "ui-button--"],
    ["no component before the double dash", "--primary"],
    ["a tripled dash", "ui-button---primary"],
    ["a second double dash", "ui-button--primary--x"],
    ["a slash", "ui/button--primary"],
    ["a query added to it", "ui-button--primary&globals=theme:dark"],
    ["a query mark", "ui-button--primary?x=1"],
    ["a hash", "ui-button--primary#a"],
    ["a percent escape", "ui-button--primary%2F"],
    ["a trailing space", "ui-button--primary "],
    ["a trailing newline", "ui-button--primary\n"],
    ["a whole URL", "https://evil.com/iframe.html"],
    ["a protocol-relative URL", "//evil.com"],
    ["more than 200 characters", `${"a".repeat(100)}--${"b".repeat(99)}`],
  ])("refuses an id of %s", (_what, id) => {
    expect(() => readStoryUrl(id, DEFAULT_LOOK, STAGING)).toThrow(Refusal);
    expect(() => readStoryUrl(id, DEFAULT_LOOK, STAGING)).toThrow(/not a story id/);
  });

  it("takes an id of exactly 200 characters", () => {
    const id = `${"a".repeat(100)}--${"b".repeat(98)}`;
    expect(id).toHaveLength(200);
    expect(new URL(readStoryUrl(id, DEFAULT_LOOK, STAGING)).searchParams.get("id")).toBe(id);
  });
});

describe("scripts/shots-guards.mjs describePhase", () => {
  it.each(["completed", "finished"])("reads the phase %j as a play function that passed", (phase) => {
    expect(describePhase(phase)).toEqual({ outcome: "passed", line: `play function passed (phase ${phase})` });
  });

  it("reads errored as a play function that failed", () => {
    expect(describePhase("errored")).toEqual({ outcome: "failed", line: "play function failed (phase errored)" });
  });

  it("reads aborted as a play function that failed, the render cut off", () => {
    expect(describePhase("aborted")).toEqual({
      outcome: "failed",
      line: "play function failed (phase aborted: the render was cut off)",
    });
  });

  it.each([
    ["rendering", "rendering"],
    ["playing", "playing"],
    ["loading", "loading"],
    ["", "none"],
    [null, "none"],
    [undefined, "none"],
  ])("reads the last phase %j as a play function that never ended, naming %s", (phase, named) => {
    expect(describePhase(phase)).toEqual({ outcome: "never ended", line: `play function never ended (last phase: ${named})` });
  });
});

describe("scripts/shots-guards.mjs settlePhase", () => {
  it("keeps the last phase when the render ran without a failure", () => {
    expect(settlePhase("finished", [
      "preparing",
      "playing",
      "played",
      "completed",
      "finished",
    ])).toBe("finished");
    expect(settlePhase("completed", undefined)).toBe("completed");
    expect(settlePhase(null, [])).toBe(null);
  });

  // Storybook runs on to `finished` after a play function threw: the last phase alone reads a failure as a pass.
  it("reads a render that went through errored as errored, whatever phase it ended in", () => {
    expect(settlePhase("finished", [
      "playing",
      "errored",
      "completing",
      "completed",
      "finished",
    ])).toBe("errored");
    expect(settlePhase(null, ["playing", "errored"])).toBe("errored");
  });

  it("reads a render that went through aborted as aborted", () => {
    expect(settlePhase("finished", ["playing", "aborted", "finished"])).toBe("aborted");
  });

  it("puts errored before aborted", () => {
    expect(settlePhase("finished", ["aborted", "errored"])).toBe("errored");
  });
});

describe("scripts/shots-guards.mjs describeLook", () => {
  it.each([
    [
      { theme: "dark", motion: "full", prefersReduced: false },
    ],
    [
      { theme: null, motion: null, prefersReduced: true },
    ],
    [
      { theme: "light", motion: "reduce", prefersReduced: true },
    ],
  ])("says nothing for the default look, so a call without flags prints what it printed before: %j", (seen) => {
    expect(describeLook(DEFAULT_LOOK, seen, 1440)).toEqual([]);
  });

  it("prints one line for a dark look the page took", () => {
    const look = readLook({ dark: true }, false);
    expect(describeLook(look, { theme: "dark", motion: "reduce", prefersReduced: true }, 1440)).toEqual([
      "look [1440]: <html data-theme=\"dark\" data-motion=\"reduce\">, prefers-reduced-motion reduce",
    ]);
  });

  it("adds a note when --dark found a light page: the page keeps its own saved theme", () => {
    const look = readLook({ dark: true }, false);
    const lines = describeLook(look, { theme: "light", motion: "reduce", prefersReduced: true }, 390);
    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatch(/^look \[390\]: /);
    expect(lines[1]).toBe("note: --dark asked, but <html data-theme> is \"light\": the page keeps its own saved theme");
  });

  it("says none for an attribute the page does not carry", () => {
    const look = readLook({ fullMotion: true }, false);
    expect(describeLook(look, { theme: null, motion: null, prefersReduced: false }, 1440)).toEqual([
      "look [1440]: <html data-theme=\"none\" data-motion=\"none\">, prefers-reduced-motion no-preference",
    ]);
  });

  it("adds a note when --full-motion still meets data-motion reduce", () => {
    const look = readLook({ fullMotion: true }, true);
    const lines = describeLook(look, { theme: "light", motion: "reduce", prefersReduced: false }, 1440);
    expect(lines).toHaveLength(2);
    expect(lines[1]).toMatch(/^note: --full-motion asked, but reduced motion is still on: .*data-motion/);
  });

  it("adds a note when --full-motion still meets a reduced-motion preference", () => {
    const look = readLook({ fullMotion: true }, true);
    const lines = describeLook(look, { theme: "light", motion: null, prefersReduced: true }, 1440);
    expect(lines).toHaveLength(2);
    expect(lines[1]).toMatch(/^note: --full-motion asked, but reduced motion is still on: .*prefers-reduced-motion/);
  });

  it("prints a line for a dialect alone: a story in Showcase is not the default look", () => {
    const look = readLook({ dialect: "showcase" }, true);
    expect(describeLook(look, { theme: "light", motion: "reduce", prefersReduced: true }, 1440)).toHaveLength(1);
  });
});

describe("scripts/shots-guards.mjs shotFileName", () => {
  it("names a picture as before for the default look", () => {
    expect(shotFileName("home", 1440, DEFAULT_LOOK)).toBe("home-1440.png");
    expect(shotFileName("story-ui-button-primary", 390, DEFAULT_LOOK)).toBe("story-ui-button-primary-390.png");
  });

  it.each([
    [
      { dark: true },
      "home-1440-dark.png",
    ],
    [
      { fullMotion: true },
      "home-1440-full-motion.png",
    ],
    [
      { dark: true, fullMotion: true },
      "home-1440-dark-full-motion.png",
    ],
  ])("adds the look to the name for %j", (flags, expected) => {
    expect(shotFileName("home", 1440, readLook(flags, false))).toBe(expected);
  });

  it("adds a dialect that is not Workspace, and only that", () => {
    expect(shotFileName("story-ui-button-primary", 390, readLook({ dialect: "showcase" }, true))).toBe("story-ui-button-primary-390-showcase.png");
    expect(shotFileName("story-ui-button-primary", 390, readLook({ dialect: "workspace" }, true))).toBe("story-ui-button-primary-390.png");
  });

  it("puts dark, full motion and the dialect in that order", () => {
    expect(shotFileName("home", 1440, readLook({ dark: true, fullMotion: true, dialect: "showcase" }, true))).toBe("home-1440-dark-full-motion-showcase.png");
  });
});
