import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { testUtils } from "better-auth/plugins";
import * as schema from "../../server/db/schema";
import { createTestDb } from "./db";
import { readTestEnv } from "./env";

const env = readTestEnv();

// Matches server/utils/auth.ts in everything that decides the session cookie and the row shapes:
// secret, baseURL, uuid ids. The production config stays free of any test sign-in; this instance
// only exists in test code, next to the same test database.
export const testAuth = betterAuth({
  database: drizzleAdapter(createTestDb().db, { provider: "pg", schema }),
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  advanced: {
    database: { generateId: "uuid" },
  },
  // Static array: a conditional spread would stop `ctx.test` from being inferred.
  plugins: [testUtils()],
});
