import { describe, expect, it } from "vitest";
import { DEFAULT_OWNER_NAME, parseSignInQuery } from "./sign-in-query";

// The parsing of `?as=`, `?seed=` and `?to=` of the dev sign-in (#235, #236). The handler is a thin shell
// around it: its answers are what these rows pin, and the route exists only in the dev and staging builds.

/** The 400 the handler answers with: what `createError` carries */
function refusal(query: Record<string, unknown>): { statusCode: number; statusMessage: string } {
  try {
    parseSignInQuery(query);
  }
  catch (error) {
    return error as { statusCode: number; statusMessage: string };
  }
  throw new Error(`expected a refusal for ${JSON.stringify(query)}`);
}

describe("the dev sign-in's `to`", () => {
  it("lands on / when absent", () => {
    expect(parseSignInQuery({}).to).toBe("/");
  });

  it.each([
    "/",
    "/winnies",
    "/winnies/abc?x=1#top",
    "/a/b/c",
    "/%2F/ok",
  ])("keeps the path %j", (to) => {
    expect(parseSignInQuery({ to }).to).toBe(to);
  });

  // A refused `to` is not an error: the Owner is signed in and lands on `/`, as the handler always did.
  it.each([
    ["a protocol-relative URL", "//evil.com"],
    ["a backslash after the slash", "/\\evil.com"],
    ["a backslash anywhere", "/a\\b"],
    ["a tab the browser strips (/%09 decoded)", "/\t/evil.com"],
    ["a tab anywhere", "/a\tb"],
    ["a space anywhere", "/a b"],
    ["a newline", "/a\nb"],
    ["a carriage return", "/a\rb"],
    ["a NUL", "/a\u0000b"],
    ["another control character", "/a\u007Fb"],
    ["an absolute URL", "https://evil.com"],
    ["a path without its leading slash", "winnies"],
    ["an empty string", ""],
    [
      "a repeated parameter",
      ["/a", "/b"],
    ],
    ["a non-string", 42],
  ])("falls back to / for %s", (_what, to) => {
    expect(parseSignInQuery({ to }).to).toBe("/");
  });

  it("keeps a percent-encoded tab, which is only text until something decodes it", () => {
    // `/%09/evil.com` itself: no raw tab, so the pattern passes it, and the redirect header carries it as is.
    expect(parseSignInQuery({ to: "/%09/evil.com" }).to).toBe("/%09/evil.com");
  });
});

describe("the dev sign-in's `as`", () => {
  it("is `owner` when absent or empty", () => {
    expect(DEFAULT_OWNER_NAME).toBe("owner");
    expect(parseSignInQuery({}).ownerName).toBe("owner");
    expect(parseSignInQuery({ as: "" }).ownerName).toBe("owner");
  });

  it.each([
    ["agent-1", "agent-1"],
    ["A1", "a1"],
    [
      "x".repeat(32),
      "x".repeat(32),
    ],
    ["0", "0"],
  ])("accepts %j as %j", (as, expected) => {
    expect(parseSignInQuery({ as }).ownerName).toBe(expected);
  });

  it.each([
    [
      "too long",
      "x".repeat(33),
    ],
    ["a space", "a b"],
    ["an underscore", "a_b"],
    ["a dot", "a.b"],
    ["an at sign", "a@b"],
    ["a slash", "a/b"],
    ["a non-ASCII letter", "ä"],
    [
      "a repeated parameter",
      ["a", "b"],
    ],
    ["a non-string", 1],
  ])("refuses %s with the 400, never the default", (_what, as) => {
    expect(refusal({ as })).toMatchObject({
      statusCode: 400,
      statusMessage: "`as` must be 1 to 32 characters of a-z, 0-9 and -",
    });
  });
});

describe("the dev sign-in's `seed`", () => {
  it("does not reset when absent or empty", () => {
    expect(parseSignInQuery({}).reset).toBe(false);
    expect(parseSignInQuery({ seed: "" }).reset).toBe(false);
  });

  it("resets for `reset`", () => {
    expect(parseSignInQuery({ seed: "reset" }).reset).toBe(true);
  });

  it.each([
    "Reset",
    "true",
    "1",
    "reset ",
    ["reset", "reset"],
    1,
  ])("refuses %j with the 400, never skipping the reset quietly", (seed) => {
    expect(refusal({ seed })).toMatchObject({
      statusCode: 400,
      statusMessage: "`seed` must be `reset` or absent",
    });
  });
});

describe("a bad request", () => {
  it("is refused whole: a bad `as` or `seed` throws before anything is returned", () => {
    expect(refusal({ as: "bad name", seed: "reset", to: "/x" }).statusCode).toBe(400);
    expect(refusal({ as: "ok", seed: "nope", to: "/x" }).statusCode).toBe(400);
  });
});
