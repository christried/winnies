/**
 * The commit scopes CLAUDE.md § Commits lists: the single source the commitlint configuration reads, so adding a scope is one edit to that line.
 *
 * @param markdown The text of CLAUDE.md.
 * @returns The backticked names after `- Scopes:`, in order.
 */
export function parseScopes(markdown) {
  const match = /^- Scopes:\s*((?:`[a-z][a-z0-9-]*`(?:,\s*)?)+)/m.exec(markdown);
  // Loud on purpose: a reformatted line must not turn the scope rule off, or let every scope through.
  if (!match)
    throw new Error("CLAUDE.md § Commits has no line starting `- Scopes:` followed by backticked names; commitlint.config.mjs reads it.");
  return [
    ...match[1].matchAll(/`([^`]+)`/g),
  ].map(([, scope]) => scope);
}
