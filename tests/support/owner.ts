import type { TestCookie } from "better-auth/plugins";
import { testAuth } from "./test-auth";

/**
 * An Owner who exists in the test database and holds a session
 */
export interface SignedInOwner {
  user: { id: string; email: string; name: string };
  /** Carries the session cookie, for `fetch` */
  headers: Headers;
  /** The same session as cookies a browser context can take (`context.addCookies`) */
  cookies: TestCookie[];
}

/**
 * Creates a fresh Owner and signs them in, without Discord. The uuid in the id and in the email
 * (unique in the user table) is what keeps two tests' Owners from ever colliding.
 *
 * @returns the Owner with the session cookie as headers and as cookies
 */
export async function signInAsOwner(): Promise<SignedInOwner> {
  const test = (await testAuth.$context).test;

  const id = crypto.randomUUID();
  const user = test.createUser({ id, email: `owner-${id}@winnies.test`, name: "Test Owner" });
  await test.saveUser(user);

  return {
    user: { id: user.id, email: user.email, name: user.name },
    headers: await test.getAuthHeaders({ userId: user.id }),
    cookies: await test.getCookies({ userId: user.id }),
  };
}
