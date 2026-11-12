import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const dir = dirname(fileURLToPath(import.meta.url));
const SOURCES = readdirSync(dir).filter(f => f.endsWith(".ts") && !f.endsWith(".test.ts"));

function specifiers(file: string) {
  return [
    ...readFileSync(join(dir, file), "utf8").matchAll(/from\s+["']([^"']+)["']/g),
  ].map(m => m[1] ?? "");
}

// Guards the ticket's "no hex left" criterion and the module's independence from Nuxt, not any internals.
describe("the motion sources", () => {
  it("are the six modules of the engine", () => {
    expect(SOURCES.sort()).toEqual([
      "engine.ts",
      "env.ts",
      "loops.ts",
      "surface.ts",
      "tokens.ts",
      "types.ts",
    ]);
  });

  it.each(SOURCES)("%s holds no hex colour, comments included", (file) => {
    expect(readFileSync(join(dir, file), "utf8")).not.toMatch(/#[0-9A-F]{6}\b/i);
  });

  it.each(SOURCES)("%s imports neither Vue, Nuxt, #imports nor the ~ alias", (file) => {
    expect(specifiers(file).filter(s => /^(?:vue|nuxt|@nuxt|#|~)/.test(s))).toEqual([]);
  });

  it.each(SOURCES)("%s imports only its own folder, so tests/tsconfig.json can typecheck it", (file) => {
    expect(specifiers(file).filter(s => !s.startsWith("./"))).toEqual([]);
  });
});
