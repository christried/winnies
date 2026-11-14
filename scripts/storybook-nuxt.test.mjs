import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { createUnimport } from "unimport";
import { describe, expect, it } from "vitest";
import { componentName, scanComponents } from "../.storybook/nuxt/components.ts";
import { iconBody } from "../.storybook/nuxt/icons.ts";
import { replaceImportMeta } from "../.storybook/nuxt/import-meta.ts";
import { importsOptions, isScanned } from "../.storybook/nuxt/imports.ts";
import { useState } from "../.storybook/nuxt/stubs.ts";
import { ICONS } from "../app/utils/icons.ts";

// Storybook renders the app's own components without the Nuxt app (#307), so it resolves their auto-imports itself:
// functions on top of unimport (Nuxt's own engine) and a Vite plugin for components in templates. Nothing here may drift
// from what Nuxt resolves, so the two scans are compared with the files `nuxt prepare` writes into `.nuxt/`.

const ROOT = process.cwd();
const NUXT_DIR = path.join(ROOT, ".nuxt");

/** The text of a file `nuxt prepare` writes, or a failure that says what to run. */
function nuxtFile(name) {
  const file = path.join(NUXT_DIR, name);
  if (!existsSync(file))
    throw new Error(`${file} is missing: run pnpm install (nuxt prepare).`);
  return readFileSync(file, "utf8");
}

describe("componentName follows Nuxt's component names", () => {
  it.each([
    ["ui/icon.vue", "UiIcon"],
    ["ui/icon-button.vue", "UiIconButton"],
    ["challenge/challenge-card.vue", "ChallengeCard"],
    ["particle-layer.vue", "ParticleLayer"],
    ["ui/index.vue", "Ui"],
    ["winnie/delete-winnie-modal.vue", "WinnieDeleteWinnieModal"],
    ["ui/icon.client.vue", "UiIcon"],
    ["ui/icon.server.vue", "UiIcon"],
    ["ui/icon.global.vue", "UiIcon"],
    ["a/b/b-c.vue", "ABC"],
  ])("%s is %s", (file, name) => {
    expect(componentName(file)).toBe(name);
  });
});

describe("the files unimport scans for auto-imports", () => {
  it.each(["use-toast.ts"])("scans %s", (file) => {
    expect(isScanned(`/repo/app/composables/${file}`)).toBe(true);
  });

  it.each([
    "use-toast.test.ts",
    "use-toast.spec.ts",
    "a.stories.ts",
    "a.d.ts",
    "-a.ts",
  ])("skips %s", (file) => {
    expect(isScanned(`/repo/app/composables/${file}`)).toBe(false);
  });
});

describe("replaceImportMeta sets the flags Nuxt sets for the app", () => {
  it("dev and client are true, server is false", () => {
    expect(replaceImportMeta("if (import.meta.dev && import.meta.client && !import.meta.server) go();"))
      .toBe("if (true && true && !false) go();");
  });

  it("leaves the rest of import.meta alone", () => {
    for (const code of [
      "import.meta.env.DEV",
      "import.meta.url",
      "import.meta.devtools",
      "my.import.meta.dev",
    ])
      expect(replaceImportMeta(code), code).toBeUndefined();
  });
});

describe("useState, the one Nuxt global a story may reach", () => {
  it("is one ref per key, started from the first init", () => {
    const first = useState("a-key", () => 1);
    expect(first.value).toBe(1);
    first.value = 2;
    expect(useState("a-key", () => 9).value).toBe(2);
    expect(useState("another-key", () => 3).value).toBe(3);
  });

  it("is registered for the app's sources, and nothing else of Nuxt's is", async () => {
    const unimport = createUnimport(importsOptions(ROOT));
    await unimport.init();
    const names = new Set((await unimport.getImports()).map(i => i.as ?? i.name));
    expect(names.has("useState")).toBe(true);
    for (const name of [
      "useRoute",
      "useRuntimeConfig",
      "navigateTo",
      "useNuxtApp",
      "useFetch",
      "$fetch",
    ])
      expect(names.has(name), name).toBe(false);
  });
});

describe("the icon stub draws what the app asks for", () => {
  it("has a body for every key of ICONS", () => {
    for (const [key, name] of Object.entries(ICONS))
      expect(iconBody(name), key).toContain("<");
  });

  it("throws on a name no icon set has", () => {
    expect(() => iconBody("tabler:no-such-icon")).toThrow("tabler:no-such-icon");
    expect(() => iconBody("mdi:home")).toThrow("mdi:home");
  });
});

describe("the scans against what Nuxt generated", () => {
  it("components: every one Nuxt registered from app/components resolves to the same file", () => {
    const found = [
      ...nuxtFile("components.d.ts").matchAll(/^export const (\w+): typeof import\("([^"]+)"\)\['default'\]$/gm),
    ]
      .map(([, name, from]) => ({
        name,
        file: path.resolve(NUXT_DIR, from),
      }))
      // `@nuxt/content` registers app/components/content itself, with `pathPrefix: false`.
      .filter(({ file }) => file.startsWith(path.join(ROOT, "app/components") + path.sep) && !file.startsWith(path.join(ROOT, "app/components/content") + path.sep));
    expect(found.length).toBeGreaterThan(0);
    expect(found.map(({ name }) => name)).toContain("UiIcon");

    const scanned = scanComponents(ROOT);
    // One direction only: `.nuxt` can be older than the tree.
    for (const { name, file } of found)
      expect(scanned.get(name), name).toBe(file);
  });

  it("imports: every name Nuxt auto-imports from the app's own dirs resolves to the same file", async () => {
    const dts = nuxtFile("imports.d.ts");
    const found = [
      ...dts.matchAll(/^export \{ ([^}]+) \} from '(\.\.\/(?:app\/composables|app\/utils|shared\/utils)\/[^']+)';$/gm),
    ]
      .flatMap(([, names, from]) => names.split(",").map(n => ({
        name: n.trim().split(/\s+as\s+/).pop(),
        file: path.resolve(NUXT_DIR, from),
      })));
    expect(found.length).toBeGreaterThan(0);

    const unimport = createUnimport(importsOptions(ROOT));
    // The plugin does this at the start of a build; `getImports` alone has not scanned the dirs yet.
    await unimport.init();
    const scanned = new Map((await unimport.getImports()).map(i => [
      i.as ?? i.name,
      path.resolve(i.from),
    ]));
    for (const name of ["useWinniesMotion", "useSurfaceClock", "ICONS"])
      expect(found.map(f => f.name), name).toContain(name);
    for (const { name, file } of found) {
      // The scan gives a file with or without its extension; Nuxt's d.ts has none.
      expect(scanned.get(name)?.replace(/\.(?:ts|js|mjs)$/, ""), name).toBe(file);
    }
  });
});
