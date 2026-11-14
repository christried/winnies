import { describe, expect, it } from "vitest";
import { describeAnimations, describeFocus, describeLook, describePhase, describeStep, describeStepFailure, describeTarget, readLook, readPath, readSteps, readStepsPath, readStoryUrl, readTarget, readWidth, Refusal, scrub, settlePhase, shotFileName, slugOf, STAGING_ORIGIN } from "./shots-guards.mjs";

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

describe("scripts/shots-guards.mjs readSteps", () => {
  it("reads a click named by role and accessible name", () => {
    expect(readSteps(JSON.stringify([
      { do: "click", role: "button", name: "Open menu" },
    ]))).toEqual([
      {
        number: 1,
        do: "click",
        target: { kind: "role", role: "button", name: "Open menu" },
        read: [],
      },
    ]);
  });

  it.each([
    [
      "a click with an exact name",
      {
        do: "click",
        role: "button",
        name: "Create",
        exact: true,
      },
      {
        number: 1,
        do: "click",
        target: {
          kind: "role",
          role: "button",
          name: "Create",
          exact: true,
        },
        read: [],
      },
    ],
    [
      "a click by role alone",
      { do: "click", role: "button" },
      {
        number: 1,
        do: "click",
        target: { kind: "role", role: "button" },
        read: [],
      },
    ],
    [
      "a click by selector",
      { do: "click", selector: "header nav a" },
      {
        number: 1,
        do: "click",
        target: { kind: "selector", selector: "header nav a" },
        read: [],
      },
    ],
    [
      "a hover",
      { do: "hover", role: "link", name: "Home" },
      {
        number: 1,
        do: "hover",
        target: { kind: "role", role: "link", name: "Home" },
        read: [],
      },
    ],
    [
      "a key press with a modifier",
      { do: "press", key: "Shift+Tab" },
      {
        number: 1,
        do: "press",
        key: "Shift+Tab",
        read: [],
      },
    ],
    [
      "typed text",
      {
        do: "type",
        role: "textbox",
        name: "Game",
        text: "Speedrun",
      },
      {
        number: 1,
        do: "type",
        target: { kind: "role", role: "textbox", name: "Game" },
        text: "Speedrun",
        read: [],
      },
    ],
    [
      "typed empty text",
      { do: "type", selector: "input", text: "" },
      {
        number: 1,
        do: "type",
        target: { kind: "selector", selector: "input" },
        text: "",
        read: [],
      },
    ],
    [
      "a wait of milliseconds",
      { do: "wait", ms: 500 },
      {
        number: 1,
        do: "wait",
        ms: 500,
        read: [],
      },
    ],
    [
      "a wait for a target",
      { do: "wait", role: "status", name: "Timer reset" },
      {
        number: 1,
        do: "wait",
        target: { kind: "role", role: "status", name: "Timer reset" },
        read: [],
      },
    ],
    [
      "a picture asked as true, labelled by the kind",
      { do: "click", role: "button", shot: true },
      {
        number: 1,
        do: "click",
        target: { kind: "role", role: "button" },
        shot: "click",
        read: [],
      },
    ],
    [
      "a picture with a label",
      { do: "click", role: "button", shot: "open" },
      {
        number: 1,
        do: "click",
        target: { kind: "role", role: "button" },
        shot: "open",
        read: [],
      },
    ],
    [
      "both read-outs",
      {
        do: "press",
        key: "Escape",
        read: ["focus", "animations"],
      },
      {
        number: 1,
        do: "press",
        key: "Escape",
        read: ["focus", "animations"],
      },
    ],
  ])("reads %s", (_what, raw, expected) => {
    expect(readSteps(JSON.stringify([raw]))).toEqual([expected]);
  });

  it("numbers the steps from 1, in order", () => {
    const steps = readSteps(JSON.stringify([
      { do: "wait", ms: 0 },
      { do: "press", key: "Tab" },
      { do: "wait", ms: 1 },
    ]));
    expect(steps.map(step => step.number)).toEqual([1, 2, 3]);
  });

  it.each([
    ["an object", "{\"steps\": []}"],
    ["a string", "\"click\""],
    ["a number", "3"],
    ["null", "null"],
    ["an empty list", "[]"],
    [
      "51 steps",
      JSON.stringify(Array.from({ length: 51 }, () => ({ do: "wait", ms: 1 }))),
    ],
  ])("refuses a file that is %s", (_what, text) => {
    expect(() => readSteps(text)).toThrow(Refusal);
    expect(() => readSteps(text)).toThrow(/not a list of steps/);
  });

  it("takes a list of 50 steps", () => {
    expect(readSteps(JSON.stringify(Array.from({ length: 50 }, () => ({ do: "wait", ms: 1 }))))).toHaveLength(50);
  });

  it("refuses text that is not JSON, with the first line of the parse error", () => {
    expect(() => readSteps("[{do: click}]")).toThrow(Refusal);
    expect(() => readSteps("[{do: click}]")).toThrow(/not JSON: .+/);
    expect(() => readSteps("[{do: click}]")).not.toThrow(/\n/);
  });

  it.each([
    ["a string", "click"],
    ["a number", 3],
    ["null", null],
    [
      "a list",
      [
        { do: "click" },
      ],
    ],
  ])("refuses a step that is %s, not an object", (_what, element) => {
    const text = JSON.stringify([
      { do: "wait", ms: 1 },
      element,
    ]);
    expect(() => readSteps(text)).toThrow(Refusal);
    expect(() => readSteps(text)).toThrow(/step 2: a step is an object/);
  });

  it.each([
    [
      "evaluate",
      { do: "evaluate", script: "1" },
      /unknown step "evaluate"/,
    ],
    [
      "goto",
      { do: "goto", url: "https://evil.com" },
      /unknown step "goto"/,
    ],
    [
      "route",
      { do: "route" },
      /unknown step "route"/,
    ],
    [
      "a kind in another case",
      { do: "Click", role: "button" },
      /unknown step "Click"/,
    ],
    [
      "no do",
      { role: "button" },
      /unknown step \(no "do"\)/,
    ],
    [
      "a do that is not a string",
      {
        do: ["click"],
        role: "button",
      },
      /unknown step/,
    ],
    [
      "a do that is null",
      { do: null },
      /unknown step/,
    ],
  ])("refuses an unknown step: %s", (_what, element, message) => {
    const text = JSON.stringify([
      { do: "wait", ms: 1 },
      element,
    ]);
    expect(() => readSteps(text)).toThrow(Refusal);
    expect(() => readSteps(text)).toThrow(/^step 2:/);
    expect(() => readSteps(text)).toThrow(message);
  });

  it("cuts a long unknown step at 40 characters", () => {
    const text = JSON.stringify([
      {
        do: "x".repeat(300),
      },
    ]);
    expect(() => readSteps(text)).toThrow(/step 1: unknown step/);
    expect(() => readSteps(text)).not.toThrow(/x{41}/);
  });

  it.each([
    [
      "eval",
      { do: "click", role: "button", eval: "alert(1)" },
    ],
    [
      "script",
      { do: "hover", role: "button", script: "alert(1)" },
    ],
    [
      "function",
      { do: "wait", ms: 1, function: "() => 1" },
    ],
    [
      "headers",
      {
        do: "click",
        role: "button",
        headers: { "x-vercel-protection-bypass": "x" },
      },
    ],
    [
      "url",
      { do: "click", role: "button", url: "https://evil.com" },
    ],
    [
      "onclick",
      { do: "click", role: "button", onclick: "alert(1)" },
    ],
    [
      "key on a click",
      { do: "click", role: "button", key: "Escape" },
    ],
    [
      "text on a click",
      { do: "click", role: "button", text: "x" },
    ],
    [
      "ms on a type",
      {
        do: "type",
        role: "textbox",
        text: "x",
        ms: 1,
      },
    ],
    [
      "target on a press",
      { do: "press", key: "Escape", role: "button" },
    ],
    [
      "selector on a press",
      { do: "press", key: "Escape", selector: "body" },
    ],
  ])("refuses the field %s as unknown, with the step's number", (field, element) => {
    const text = JSON.stringify([
      { do: "wait", ms: 1 },
      element,
    ]);
    expect(() => readSteps(text)).toThrow(Refusal);
    expect(() => readSteps(text)).toThrow(/^step 2 \(\w+\): unknown field/);
    expect(() => readSteps(text)).toThrow(/nothing in it runs/);
  });

  it("refuses a planted __proto__ as unknown and copies nothing of it", () => {
    // JSON.parse makes `__proto__` an own property of the object, which is how a file can carry one.
    const text = "[{\"do\": \"click\", \"role\": \"button\", \"__proto__\": {\"polluted\": true}}]";
    expect(() => readSteps(text)).toThrow(/step 1 \(click\): unknown field "__proto__"/);
    expect({}.polluted).toBeUndefined();
  });

  it("returns objects with no inherited surprises for a step with only known fields", () => {
    const [step] = readSteps(JSON.stringify([
      { do: "click", role: "button" },
    ]));
    expect(Object.keys(step).sort()).toEqual(["do", "number", "read", "target"]);
  });

  it.each([
    [
      "a click with no target",
      { do: "click" },
      /step 2 \(click\): no target/,
    ],
    [
      "a hover with no target",
      { do: "hover" },
      /step 2 \(hover\): no target/,
    ],
    [
      "a type with no target",
      { do: "type", text: "x" },
      /step 2 \(type\): no target/,
    ],
    [
      "a name without a role",
      { do: "click", name: "Open" },
      /step 2 \(click\): .*"name"/,
    ],
    [
      "exact without a role",
      { do: "click", exact: true },
      /step 2 \(click\): .*"exact"/,
    ],
    [
      "exact without a name",
      { do: "click", role: "button", exact: true },
      /step 2 \(click\): "exact" goes with a "name"/,
    ],
    [
      "a role and a selector",
      { do: "click", role: "button", selector: "button" },
      /step 2 \(click\): .*"role" and "selector"/,
    ],
    [
      "a type with no text",
      { do: "type", role: "textbox" },
      /step 2 \(type\): no text/,
    ],
    [
      "a press with no key",
      { do: "press" },
      /step 2 \(press\): no key/,
    ],
    [
      "a wait with nothing to wait for",
      { do: "wait" },
      /step 2 \(wait\): nothing to wait for/,
    ],
    [
      "a wait with a time and a target",
      { do: "wait", ms: 5, role: "status" },
      /step 2 \(wait\): .*not both/,
    ],
    [
      "a wait with half a target",
      { do: "wait", name: "x" },
      /step 2 \(wait\): .*"name"/,
    ],
  ])("refuses %s", (_what, element, message) => {
    const text = JSON.stringify([
      { do: "wait", ms: 1 },
      element,
    ]);
    expect(() => readSteps(text)).toThrow(Refusal);
    expect(() => readSteps(text)).toThrow(message);
  });

  it.each([
    [
      "a role that is an object",
      {
        do: "click",
        role: { a: 1 },
      },
      /"role"/,
    ],
    [
      "a role in capitals",
      { do: "click", role: "Button" },
      /"role"/,
    ],
    [
      "a role with a dash",
      { do: "click", role: "a-b" },
      /"role"/,
    ],
    [
      "a role of 31 letters",
      {
        do: "click",
        role: "a".repeat(31),
      },
      /"role"/,
    ],
    [
      "a name that is a list",
      {
        do: "click",
        role: "button",
        name: ["a"],
      },
      /"name"/,
    ],
    [
      "an empty name",
      { do: "click", role: "button", name: "" },
      /"name"/,
    ],
    [
      "a name of 201 characters",
      {
        do: "click",
        role: "button",
        name: "n".repeat(201),
      },
      /"name"/,
    ],
    [
      "an exact that is a string",
      {
        do: "click",
        role: "button",
        name: "a",
        exact: "yes",
      },
      /"exact"/,
    ],
    [
      "an empty selector",
      { do: "click", selector: "" },
      /"selector"/,
    ],
    [
      "a selector of 201 characters",
      {
        do: "click",
        selector: "s".repeat(201),
      },
      /"selector"/,
    ],
    [
      "a selector that is a number",
      { do: "click", selector: 3 },
      /"selector"/,
    ],
    [
      "text that is a number",
      { do: "type", role: "textbox", text: 3 },
      /"text"/,
    ],
    [
      "text of 201 characters",
      {
        do: "type",
        role: "textbox",
        text: "t".repeat(201),
      },
      /"text"/,
    ],
    [
      "a key with a space",
      { do: "press", key: "Escape now" },
      /"key"/,
    ],
    [
      "a key that is a list",
      {
        do: "press",
        key: ["Escape"],
      },
      /"key"/,
    ],
    [
      "a key of 41 characters",
      {
        do: "press",
        key: "k".repeat(41),
      },
      /"key"/,
    ],
    [
      "a key ending in a plus",
      { do: "press", key: "Shift+" },
      /"key"/,
    ],
    [
      "ms of 10001",
      { do: "wait", ms: 10_001 },
      /"ms"/,
    ],
    [
      "ms of 1.5",
      { do: "wait", ms: 1.5 },
      /"ms"/,
    ],
    [
      "ms of -1",
      { do: "wait", ms: -1 },
      /"ms"/,
    ],
    [
      "ms as a string",
      { do: "wait", ms: "5" },
      /"ms"/,
    ],
    [
      "a shot of false",
      { do: "click", role: "button", shot: false },
      /"shot"/,
    ],
    [
      "a shot label in capitals",
      { do: "click", role: "button", shot: "Open" },
      /"shot"/,
    ],
    [
      "a shot label with a slash",
      { do: "click", role: "button", shot: "../x" },
      /"shot"/,
    ],
    [
      "a shot label of 41 characters",
      {
        do: "click",
        role: "button",
        shot: "a".repeat(41),
      },
      /"shot"/,
    ],
    [
      "a read that is a string",
      { do: "click", role: "button", read: "focus" },
      /"read"/,
    ],
    [
      "a read of something else",
      {
        do: "click",
        role: "button",
        read: ["network"],
      },
      /"read"/,
    ],
    [
      "a read with a duplicate",
      {
        do: "click",
        role: "button",
        read: ["focus", "focus"],
      },
      /"read"/,
    ],
  ])("refuses a value of the wrong kind: %s", (_what, element, message) => {
    const text = JSON.stringify([
      { do: "wait", ms: 1 },
      element,
    ]);
    expect(() => readSteps(text)).toThrow(Refusal);
    expect(() => readSteps(text)).toThrow(/^step 2 \(\w+\)/);
    expect(() => readSteps(text)).toThrow(message);
  });

  it.each([
    [
      "a name of 200 characters",
      {
        do: "click",
        role: "button",
        name: "n".repeat(200),
      },
    ],
    [
      "a selector of 200 characters",
      {
        do: "click",
        selector: "s".repeat(200),
      },
    ],
    [
      "text of 200 characters",
      {
        do: "type",
        role: "textbox",
        text: "t".repeat(200),
      },
    ],
    [
      "a role of 30 letters",
      {
        do: "click",
        role: "a".repeat(30),
      },
    ],
    [
      "a key of 40 characters",
      {
        do: "press",
        key: "k".repeat(40),
      },
    ],
    [
      "ms of 0",
      { do: "wait", ms: 0 },
    ],
    [
      "ms of 10000",
      { do: "wait", ms: 10_000 },
    ],
    [
      "a shot label of 40 characters",
      {
        do: "click",
        role: "button",
        shot: "a".repeat(40),
      },
    ],
  ])("takes %s, the edge of its limit", (_what, element) => {
    expect(readSteps(JSON.stringify([element]))).toHaveLength(1);
  });
});

describe("scripts/shots-guards.mjs readStepsPath", () => {
  it.each(["steps.json", "dir/steps.JSON", "C:\\tmp\\steps.json"])("takes %s", (raw) => {
    expect(readStepsPath(raw)).toBe(raw);
  });

  it.each([
    "steps.js",
    "steps.mjs",
    "steps.cjs",
    "steps.json.js",
    "steps",
    "steps.json ",
  ])("refuses %j: a step file is data, not a script", (raw) => {
    expect(() => readStepsPath(raw)).toThrow(Refusal);
    expect(() => readStepsPath(raw)).toThrow(/\.json/);
  });
});

describe("scripts/shots-guards.mjs readWidth", () => {
  it("is the one 1440 px viewport with steps and no width", () => {
    expect(readWidth(undefined, true)).toEqual({ width: 1440, height: 900 });
  });

  it("is nothing without steps and without a width: the script shoots its two widths", () => {
    expect(readWidth(undefined, false)).toBeUndefined();
  });

  it.each([
    [
      "390",
      { width: 390, height: 844 },
    ],
    [
      "1280",
      { width: 1280, height: 900 },
    ],
    [
      "320",
      { width: 320, height: 844 },
    ],
    [
      "600",
      { width: 600, height: 844 },
    ],
    [
      "601",
      { width: 601, height: 900 },
    ],
    [
      "2560",
      { width: 2560, height: 900 },
    ],
  ])("takes %s with steps", (raw, expected) => {
    expect(readWidth(raw, true)).toEqual(expected);
  });

  it.each([
    "abc",
    "12.5",
    "319",
    "2561",
    "0",
    "",
    "-390",
    "99999",
  ])("refuses %j and names the range", (raw) => {
    expect(() => readWidth(raw, true)).toThrow(Refusal);
    expect(() => readWidth(raw, true)).toThrow(/320 to 2560/);
  });

  it("refuses a width without steps", () => {
    expect(() => readWidth("390", false)).toThrow(Refusal);
    expect(() => readWidth("390", false)).toThrow(/--width needs --steps/);
  });
});

describe("scripts/shots-guards.mjs describeTarget and describeStep", () => {
  it.each([
    [
      { kind: "role", role: "button", name: "Open menu" },
      "button named \"Open menu\"",
    ],
    [
      {
        kind: "role",
        role: "button",
        name: "Create",
        exact: true,
      },
      "button named \"Create\" (exact)",
    ],
    [
      {
        kind: "role",
        role: "button",
        name: "Create",
        exact: false,
      },
      "button named \"Create\"",
    ],
    [
      { kind: "role", role: "button" },
      "button",
    ],
    [
      { kind: "selector", selector: "header nav a" },
      "selector \"header nav a\"",
    ],
  ])("describes the target %j as %s", (target, expected) => {
    expect(describeTarget(target)).toBe(expected);
  });

  it.each([
    [
      {
        do: "click",
        target: { kind: "role", role: "button", name: "Open menu" },
      },
      "click button named \"Open menu\"",
    ],
    [
      {
        do: "hover",
        target: { kind: "selector", selector: "nav" },
      },
      "hover selector \"nav\"",
    ],
    [
      { do: "press", key: "Escape" },
      "press \"Escape\"",
    ],
    [
      {
        do: "type",
        text: "Speedrun",
        target: { kind: "role", role: "textbox", name: "Game" },
      },
      "type \"Speedrun\" into textbox named \"Game\"",
    ],
    [
      { do: "wait", ms: 500 },
      "wait 500 ms",
    ],
    [
      { do: "wait", ms: 0 },
      "wait 0 ms",
    ],
    [
      {
        do: "wait",
        target: { kind: "role", role: "status", name: "Timer reset" },
      },
      "wait for status named \"Timer reset\"",
    ],
  ])("describes the step %j as %s", (step, expected) => {
    expect(describeStep(step)).toBe(expected);
  });

  it("cuts typed text at 40 characters", () => {
    const step = {
      do: "type",
      text: "a".repeat(41),
      target: { kind: "role", role: "textbox" },
    };
    expect(describeStep(step)).toBe(`type "${"a".repeat(40)}..." into textbox`);
    expect(describeStep({
      ...step,
      text: "a".repeat(40),
    })).toBe(`type "${"a".repeat(40)}" into textbox`);
  });

  it("shows typed text as a JSON string, so a quote or a new line stays on the line", () => {
    const step = {
      do: "type",
      text: "a\"b\nc",
      target: { kind: "role", role: "textbox" },
    };
    expect(describeStep(step)).toBe("type \"a\\\"b\\nc\" into textbox");
  });
});

describe("scripts/shots-guards.mjs describeStepFailure", () => {
  const step = {
    number: 3,
    do: "click",
    target: { kind: "role", role: "button", name: "Open menu" },
  };

  it("says nothing matched, with the step's number, what it looked for and the wait", () => {
    expect(describeStepFailure(step, 5, { kind: "missing" })).toBe("step 3 of 5 failed: click button named \"Open menu\": nothing matched within 5 s");
  });

  it("says more than one element matched and what to do", () => {
    expect(describeStepFailure(step, 5, { kind: "ambiguous" })).toBe("step 3 of 5 failed: click button named \"Open menu\": more than one element matched; give the exact name (exact), a longer name or a selector");
  });

  it("carries Playwright's first line for any other failure", () => {
    expect(describeStepFailure(step, 5, { kind: "other", message: "element is not enabled" })).toBe("step 3 of 5 failed: click button named \"Open menu\": element is not enabled");
  });
});

describe("scripts/shots-guards.mjs describeFocus", () => {
  const trigger = {
    tag: "button",
    id: "trigger",
    classes: ["menu-trigger", "ui", "extra"],
    role: null,
  };

  it("says the page itself has focus when nothing does", () => {
    expect(describeFocus(null)).toBe("focus: none (the page itself)");
  });

  it("names the role and name the way a step does, the element and :focus-visible", () => {
    expect(describeFocus({ element: trigger, aria: "button \"Open menu\" [expanded]", focusVisible: true })).toBe("focus: button \"Open menu\" [expanded] (<button#trigger.menu-trigger.ui>), :focus-visible matches");
  });

  it("says when :focus-visible does not match", () => {
    expect(describeFocus({ element: trigger, aria: "button \"Open menu\"", focusVisible: false })).toMatch(/, :focus-visible does not match$/);
  });

  it("says there is no role when the page gave no accessible name", () => {
    expect(describeFocus({
      element: {
        tag: "div",
        id: "x",
        classes: [],
        role: null,
      },
      aria: null,
      focusVisible: true,
    })).toBe("focus: <div#x> (no role), :focus-visible matches");
  });

  it("shows the role attribute and a pseudo-element", () => {
    expect(describeFocus({
      element: {
        tag: "ul",
        id: null,
        classes: ["menu"],
        role: "menu",
        pseudo: "::before",
      },
      aria: null,
      focusVisible: false,
    })).toBe("focus: <ul.menu role=menu>::before (no role), :focus-visible does not match");
  });
});

describe("scripts/shots-guards.mjs describeAnimations", () => {
  const menu = {
    tag: "div",
    id: null,
    classes: ["menu"],
    role: null,
  };
  const running = (over = {}) => ({
    kind: "script",
    name: null,
    properties: ["transform"],
    durationMs: 300,
    iterations: 1,
    target: menu,
    ...over,
  });

  it("says none is running", () => {
    expect(describeAnimations({ running: [], paused: 0 })).toEqual(["animations: none running"]);
  });

  it("lists one of each kind, with what moves and for how long", () => {
    expect(describeAnimations({
      running: [
        running({
          kind: "css-animation",
          name: "fade-in",
          properties: ["opacity", "transform"],
          durationMs: 180,
        }),
        running({
          kind: "css-transition",
          name: "opacity",
          properties: ["opacity"],
          durationMs: 150,
        }),
        running({
          kind: "script",
          target: {
            tag: "div",
            id: null,
            classes: ["gloss"],
            role: null,
          },
          durationMs: 1200,
          iterations: "infinite",
        }),
      ],
      paused: 0,
    })).toEqual([
      "animations: 3 running",
      "  CSS animation \"fade-in\" on <div.menu>: opacity, transform; 180 ms",
      "  CSS transition on <div.menu>: opacity; 150 ms",
      "  script animation on <div.gloss>: transform; 1200 ms, infinite",
    ]);
  });

  it("counts a paused animation and does not list it", () => {
    expect(describeAnimations({
      running: [
        running(),
      ],
      paused: 1,
    })).toEqual([
      "animations: 1 running, 1 paused (not listed)",
      "  script animation on <div.menu>: transform; 300 ms",
    ]);
    expect(describeAnimations({ running: [], paused: 2 })).toEqual(["animations: none running, 2 paused (not listed)"]);
  });

  it("prints the iterations only when they are not 1", () => {
    expect(describeAnimations({
      running: [
        running({ iterations: 3 }),
      ],
      paused: 0,
    })[1]).toBe("  script animation on <div.menu>: transform; 300 ms, 3 times");
  });

  it("says when there is no element", () => {
    expect(describeAnimations({
      running: [
        running({ target: null }),
      ],
      paused: 0,
    })[1]).toBe("  script animation on <no element>: transform; 300 ms");
  });

  it("cuts 25 running animations to 20 lines and says how many more", () => {
    const lines = describeAnimations({
      running: Array.from({ length: 25 }, () => running()),
      paused: 0,
    });
    expect(lines[0]).toBe("animations: 25 running");
    expect(lines).toHaveLength(1 + 20 + 1);
    expect(lines.at(-1)).toBe("  ... and 5 more");
  });
});
