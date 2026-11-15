// What the process's environment says about where it runs. It imports nothing, on purpose: a Claude Code SessionStart
// hook (scripts/local-checks.mjs) loads it, and a failed import happens at module load, before the hook's `try`, against
// its promise never to fail a session's start. Whatever else needs the check imports it from here.

// A cloud container (`docs/agents/cloud.md`) sets this variable.
export const CLOUD_ENV = "CLAUDE_CODE_REMOTE";

/**
 * Whether the process runs in a cloud container (`docs/agents/cloud.md`), which sets `CLAUDE_CODE_REMOTE`.
 *
 * @param {Record<string, string | undefined>} env the process environment
 * @returns {boolean} true when the variable is a non-empty string
 */
export function isCloudContainer(env) {
  return typeof env[CLOUD_ENV] === "string" && env[CLOUD_ENV] !== "";
}
