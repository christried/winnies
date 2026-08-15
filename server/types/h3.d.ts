import type { SessionUser } from "../utils/auth";

declare module "h3" {
  interface H3EventContext {
    user?: SessionUser;
  }
}

// Makes this a ESM so it's not ignored by H3
export {};
