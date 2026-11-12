import { readFileSync } from "node:fs";
import conventional from "@commitlint/config-conventional";
import { parseScopes } from "./scripts/commit-scopes.mjs";

// CLAUDE.md § Commits is the one list of scopes; the types are the official configuration's.
const scopes = parseScopes(readFileSync(new URL("./CLAUDE.md", import.meta.url), "utf8"));
const types = conventional.rules["type-enum"][2];

export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    // Replaced by `scope-listed` below: these two print "scope may not be empty", which names no scope.
    "scope-empty": [0],
    "scope-enum": [0],
    "scope-listed": [2, "always"],
    // The one departure from the official configuration (the human, 2026-11-12:
    // https://github.com/christried/winnies/issues/282#issuecomment-6831864190). Conventional Commits 1.0.0 has no
    // line limit, and agents wrap bodies at about 120 characters.
    "body-max-line-length": [0],
    "footer-max-line-length": [0],
  },
  plugins: [
    {
      rules: {
        "scope-listed": parsed => [
          Boolean(parsed.scope) && scopes.includes(parsed.scope),
          `scope must be one of [${scopes.join(", ")}]`,
        ],
      },
    },
  ],
  // On top of commitlint's own (Revert, `Merge pull request`, `Merge branch '…' into …`, fixup!): the merges this
  // repository makes (docs/agents/subagents.md § Supervision). Anchored on the forms, not on a bare "Merge".
  ignores: [
    message => /^Merge (?:\S+ \(#\d+\)|\S+ into \S+|branch |remote-tracking branch |tag |pull request )/.test(message.split("\n")[0]),
  ],
  // commitlint prints this under every failure as "Get help: …"; it is where the ticket's list of types and scopes goes.
  helpUrl: `Header: type(scope): summary. Types: ${types.join(", ")}. Scopes: ${scopes.join(", ")} (CLAUDE.md § Commits)`,
};
