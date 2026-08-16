import type { SessionUser } from "../utils/auth";

declare module "h3" {
  interface H3EventContext {
    /**
     * configured because the user is attached to the H3 events if logged in.
     */
    user?: SessionUser;
  }
}
