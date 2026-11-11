import { describe, expect, it } from "vitest";
import { readPath, readTarget, Refusal, scrub, slugOf, STAGING_ORIGIN } from "./shots-guards.mjs";

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
