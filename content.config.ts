import { fileURLToPath } from "node:url";
import { defineCollection, defineContentConfig } from "@nuxt/content";

export default defineContentConfig({
  collections: {
    changelog: defineCollection({
      type: "page",
      source: {
        cwd: fileURLToPath(new URL(".", import.meta.url)).replaceAll("\\", "/"),
        include: "CHANGELOG.md",
        exclude: ["*/**"],
      },
    }),
  },
});
