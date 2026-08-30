import type { SessionUser } from "~~/server/utils/auth";

/**
 * The signed-in user for the current request.
 * Introduced over old useAuth composable because it will not 500 on Vercel deployment hopefully.
 * @returns A ref to the current user, or `null` when signed out.
 */
export function useCurrentUser() {
  return useState<SessionUser | null>("currentUser", () => {
    const event = useRequestEvent();

    return (event?.context.user as SessionUser | undefined) ?? null;
  });
}
