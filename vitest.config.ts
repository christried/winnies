import { defineVitestConfig } from "@nuxt/test-utils/config";
import { configDefaults } from "vitest/config";

export default defineVitestConfig({
  test: {
    environment: "node",
    exclude: [
      ...configDefaults.exclude,
      // The API tests need a database and their own config (vitest.api.config.ts).
      "tests/**",
      // Agent worktrees (.claude/worktrees/, git-ignored) sit below this root in the main checkout, each with its own copy
      // of the unit tests. In the config because defineVitestConfig builds its projects with their own `exclude`: a CLI
      // `--exclude` only reaches the root, which has none (scripts/vitest-worktrees.test.mjs, #339).
      ".claude/**",
    ],
  },
});
