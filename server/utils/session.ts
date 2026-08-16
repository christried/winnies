import type { H3Event } from "h3";

/**
 * Reads the current user, if it exists.
 * @param event The incoming request including the header that includes the session cookie.
 * @returns The signed-in user or null.
 */
export async function getSessionUser(event: H3Event) {
  const session = await auth.api.getSession({ headers: event.headers });

  return session?.user ?? null;
};
