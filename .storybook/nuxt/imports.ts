// The auto-imports of the app's own code in Storybook, from the engine Nuxt itself uses (`unimport`), with the options
// Nuxt gives it (node_modules/nuxt/dist/index.mjs, "src/imports/module.ts"). `scripts/storybook-nuxt.test.mjs`
// compares the result with the names Nuxt wrote into `.nuxt/imports.d.ts`.
import type { UnimportPluginOptions } from "unimport/unplugin";
import path from "node:path";

/** The directories Nuxt scans for auto-imports, relative to the root. A plain dir is its top-level files and `*\/index.*`. */
export const IMPORT_DIRS = [
  "app/composables",
  "app/utils",
  "app/types",
  "shared/utils",
  "shared/types",
] as const;

/**
 * Whether a file in a scanned directory is auto-imported: what Nuxt's default `ignore` lets through. Tests, stories and
 * declaration files are not auto-imported, nor is a file whose name starts with a hyphen.
 *
 * @param file the file's path
 * @returns false for a file Nuxt ignores
 */
export function isScanned(file: string): boolean {
  const name = path.basename(file);
  return !/\.(?:spec|test)\.\w+$/.test(name)
    && !/\.stories\.\w+$/.test(name)
    && !/\.d\.[cm]?ts$/.test(name)
    && !name.startsWith("-");
}

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Options for `unimport` (and its Vite plugin): Nuxt's dirs, Vue's APIs, and the stubs of `./stubs.ts`.
 *
 * @param root the repository root
 * @returns the options; `dts` is off, TypeScript never sees these imports
 */
export function importsOptions(root: string): Partial<UnimportPluginOptions> {
  const sources = ["app", "shared", ".storybook/fixtures"].map(dir => escape(path.join(root, dir).replaceAll("\\", "/")));
  return {
    dirs: IMPORT_DIRS.map(dir => path.join(root, dir)),
    dirsScanOptions: { fileFilter: isScanned },
    presets: ["vue"],
    imports: [
      {
        name: "useState",
        from: path.join(root, ".storybook/nuxt/stubs.ts"),
      },
    ],
    parser: "oxc",
    injectAtEnd: true,
    addons: { vueTemplate: true, vueDirectives: true },
    dts: false,
    // The app's own sources only. Stories and `.storybook/` keep explicit imports: `tsc` has no Nuxt globals there.
    include: [
      new RegExp(`^(?:${sources.join("|")})/.*\\.(?:vue|ts)(?:\\?vue.*)?$`),
    ],
  };
}
