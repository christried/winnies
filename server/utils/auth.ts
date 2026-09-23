import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { THEME_PREFERENCE } from "../../shared/constants";
import { COOKIE_MAX_AGE } from "../constants";
import { db } from "../db";
import * as schema from "../db/schema";
import env from "./env";

export const auth = betterAuth(
  {
    database: drizzleAdapter(db, { provider: "pg", schema }),

    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,

    socialProviders: {
      discord: {
        clientId: env.DISCORD_CLIENT_ID,
        clientSecret: env.DISCORD_CLIENT_SECRET,
      },
    },

    session: {
      cookieCache: { enabled: true, maxAge: COOKIE_MAX_AGE },
    },

    trustedOrigins: [env.BETTER_AUTH_URL],

    advanced: {
      database: { generateId: "uuid" },
    },

    user: {
      additionalFields: {
        theme: {
          type: [...THEME_PREFERENCE],
          required: false,
          defaultValue: "system",
          input: false,
        },
      },
    },
  },
);

/**
 * The signed in user from Better Auth (inferred from there)
 */
export type SessionUser = typeof auth.$Infer.Session.user;
