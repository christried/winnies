/**
 * The session resolved during SSR.
 * @returns Better Auth's session handle: `data`, `isPending` and `error`.
 */
export function useAuth() {
  return authClient.useSession(useFetch);
}
