import { makeSignature } from "better-auth/crypto";
import { db } from "../db";
import { user } from "../db/schema";
import { auth } from "../utils/auth";
import { resetDummyWinnies } from "./reset-dummy-winnies";
import { DEFAULT_OWNER_NAME, parseSignInQuery } from "./sign-in-query";

// Signs in as a dev Owner without Discord, so agents can check the Workspace as a signed-in Owner (#235).
// Only the builds carriesDevSignIn names register this route (stage.ts, read by nuxt.config.ts), and
// this folder is none Nitro scans on its own. The handler has no check of its own: the staging build
// carries it and runs with NODE_ENV=production (ADR-0005).
// `?as=<name>` picks the dev Owner (default `owner`), `?to=/path` where to land.
// `?seed=reset` replaces that Owner's Winnies with the dummy set (#236).

export default defineEventHandler(async (event) => {
  // Read before anything is written, so a bad request writes nothing. The rules are in sign-in-query.ts.
  const { ownerName, reset, to } = parseSignInQuery(getQuery(event));

  const displayName = ownerName === DEFAULT_OWNER_NAME
    ? "Dev Owner"
    : `Dev Owner (${ownerName})`;
  // The email's domain marks a dev Owner. Insert-or-find in one statement, so parallel agents opening the
  // same name cannot collide on the unique email.
  const [owner] = await db.insert(user)
    .values({
      name: displayName,
      email: `${ownerName}@dev.winnies.invalid`,
      emailVerified: true,
    })
    .onConflictDoUpdate({
      target: user.email,
      set: { name: displayName },
    })
    .returning({ id: user.id });

  // The Owner `?as=` named, never a real account (its email ends in dev.winnies.invalid).
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

  return sendRedirect(event, to);
});
