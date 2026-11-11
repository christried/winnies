import { createError } from "h3";

// What the dev sign-in (sign-in.ts) reads from its query, apart from the handler: no database and no auth
// import, so sign-in-query.test.ts can run it. The open-redirect guard lives here, where it is tested.

export const DEFAULT_OWNER_NAME = "owner";
const NAME_PATTERN = /^[a-z0-9-]{1,32}$/;
// Only a path inside the app: one `/`, not followed by `/` or `\` (`/\evil.com` counts as `//evil.com` to a
// browser). Browsers also strip tab and newline from a URL, so `/<tab>/evil.com` would become `//evil.com`, and
// a newline cannot sit in a header at all: no control character, whitespace or backslash anywhere.
const LANDING_PATTERN = /^\/(?![/\\])[^\\\s\p{Cc}]*$/u;

/** What a valid dev sign-in request asks for */
export interface SignInQuery {
  /** The dev Owner's name, lower case */
  ownerName: string;
  /** Whether to replace the dev Owner's Winnies with the dummy set */
  reset: boolean;
  /** The path to land on, always inside the app */
  to: string;
}

function devOwnerName(query: Record<string, unknown>): string {
  const as = query.as;
  if (as === undefined || as === "") {
    return DEFAULT_OWNER_NAME;
  }
  // Never falls back to the default for a bad value: two agents would share one Owner's Winnies unnoticed.
  if (typeof as !== "string" || !NAME_PATTERN.test(as.toLowerCase())) {
    throw createError({ statusCode: 400, statusMessage: "`as` must be 1 to 32 characters of a-z, 0-9 and -" });
  }
  return as.toLowerCase();
}

function wantsReset(query: Record<string, unknown>): boolean {
  const seed = query.seed;
  if (seed === undefined || seed === "") {
    return false;
  }
  // A typo or a repeated parameter must not quietly skip the reset, nor guess at one.
  if (seed !== "reset") {
    throw createError({ statusCode: 400, statusMessage: "`seed` must be `reset` or absent" });
  }
  return true;
}

function landing(to: unknown): string {
  return typeof to === "string" && LANDING_PATTERN.test(to)
    ? to
    : "/";
}

/**
 * Reads the dev sign-in's query. Everything is read before the handler writes anything, so a bad request
 * writes nothing.
 *
 * @param query the request's query, as `getQuery` returns it
 * @returns the dev Owner's name, whether to reset, and the path to land on
 * @throws a 400 for an `as` or a `seed` that is not valid; a bad `to` falls back to `/` instead
 */
export function parseSignInQuery(query: Record<string, unknown>): SignInQuery {
  return {
    ownerName: devOwnerName(query),
    reset: wantsReset(query),
    to: landing(query.to),
  };
}
