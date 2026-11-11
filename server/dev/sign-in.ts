import { makeSignature } from "better-auth/crypto";
import { db } from "../db";
import { user } from "../db/schema";
import { auth } from "../utils/auth";
import { resetDummyWinnies } from "./reset-dummy-winnies";

// Signs in as a dev Owner without Discord, so agents can check the Workspace as a signed-in Owner (#235).
// Only the builds carriesDevSignIn names register this route (stage.ts, read by nuxt.config.ts), and
// this folder is none Nitro scans on its own. The handler has no check of its own: the staging build
// carries it and runs with NODE_ENV=production (ADR-0005).
// `?as=<name>` picks the dev Owner (default `owner`), `?to=/path` where to land.
// `?seed=reset` replaces that Owner's Winnies with the dummy set (#236).

const DEFAULT_NAME = "owner";
const NAME_PATTERN = /^[a-z0-9-]{1,32}$/;
// Only a path inside the app: one `/`, not followed by `/` or `\` (`/\evil.com` counts as `//evil.com` to a
// browser). Browsers also strip tab and newline from a URL, so `/<tab>/evil.com` would become `//evil.com`, and
// a newline cannot sit in a header at all: no control character, whitespace or backslash anywhere.
const LANDING_PATTERN = /^\/(?![/\\])[^\\\s\p{Cc}]*$/u;

function devOwnerName(query: Record<string, unknown>): string {
  const as = query.as;
  if (as === undefined || as === "") {
    return DEFAULT_NAME;
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

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const as = devOwnerName(query);
  // Both are read before anything is written, so a bad request writes nothing.
  const reset = wantsReset(query);

  const displayName = as === DEFAULT_NAME
    ? "Dev Owner"
    : `Dev Owner (${as})`;
  // The email's domain marks a dev Owner. Insert-or-find in one statement, so parallel agents opening the
  // same name cannot collide on the unique email.
  const [owner] = await db.insert(user)
    .values({
      name: displayName,
      email: `${as}@dev.winnies.invalid`,
      emailVerified: true,
    })
    .onConflictDoUpdate({
      target: user.email,
      set: { name: displayName },
    })
    .returning({ id: user.id });

  // The Owner `as` named, never a real account (its email ends in dev.winnies.invalid).
  if (reset) {
    await resetDummyWinnies(owner!.id);
  }

  // A Better Auth session, with the cookie signed the way Better Auth signs it. Each visit adds a session row.
  const ctx = await auth.$context;
  const session = await ctx.internalAdapter.createSession(owner!.id);
  const { name, attributes } = ctx.authCookies.sessionToken;
  setCookie(event, name, `${session.token}.${await makeSignature(session.token, ctx.secret)}`, {
    path: attributes.path ?? "/",
    httpOnly: attributes.httpOnly ?? true,
    secure: attributes.secure ?? false,
    sameSite: "lax",
    maxAge: attributes.maxAge,
  });

  return sendRedirect(event, landing(query.to));
});
