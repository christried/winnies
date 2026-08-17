import type { EventHandler, EventHandlerRequest, H3Event } from "h3";
import type { SessionUser } from "./auth";

/**
 * An Event that has a signed in user associated to it. Used to hand over to {@link defineAuthenticatedEventHandler}.
 */
export interface AuthenticatedEvent extends H3Event {
  context: H3Event["context"] & { user: SessionUser };
}

/**
 * Wraps the H3's definteEventHandler function to make sure it's only accessible for signed in users.
 * @param handler The route function carried over into this.
 * @returns The new event handler that throws if not signed in.
 */
export function defineAuthenticatedEventHandler<T extends EventHandlerRequest, D>(
  handler: (event: AuthenticatedEvent) => Promise<D> | D,
): EventHandler<T, D> {
  return defineEventHandler<T>(async (event) => {
    if (!event.context.user)
      throw createError ({ statusCode: 401, statusMessage: "not signed in!" });

    return handler(event as AuthenticatedEvent);
  });
};
