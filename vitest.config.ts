import { defineVitestConfig } from "@nuxt/test-utils/config";
import { configDefaults } from "vitest/config";

export default defineVitestConfig({
  test: {
    environment: "node",
    // The API tests need a database and their own config (vitest.api.config.ts).
    exclude: [...configDefaults.exclude, "tests/**"],
  },
});
