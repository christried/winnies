// `import.meta.dev`, `.client` and `.server`, which Nuxt sets for the app. Vite's `define` does not reach them in the dev
// server's client, where a story runs (only in a build), so a plugin writes them into the source instead. Without
// `dev`, `useWinniesMotion()` outside a surface would hand back a silent inert engine instead of throwing as it does in
// the app.
import type { Plugin } from "vite";
import path from "node:path";

const FLAGS = { dev: "true", client: "true", server: "false" } as const;
const FLAG_RE = /(?<![\w.$])import\.meta\.(dev|client|server)\b/g;

/**
 * Replaces the three flags with their value.
 *
 * @param code the source of a module
 * @returns the new source, or undefined when it holds none of them
 */
export function replaceImportMeta(code: string): string | undefined {
  const out = code.replace(FLAG_RE, (_match, flag: keyof typeof FLAGS) => FLAGS[flag]);
  return out === code
    ? undefined
    : out;
}

/**
 * The plugin for the app's own sources and the fixtures: a story file keeps its `import.meta` as written, so a play
 * function reads what the app's code reads only through a component.
 *
 * @param root the repository root
 * @returns the Vite plugin
 */
export function importMetaPlugin(root: string): Plugin {
  const sources = ["app", "shared", ".storybook/fixtures"].map(dir => path.join(root, dir) + path.sep);
  return {
    name: "winnies:storybook-import-meta",
    enforce: "pre",
    transform(code, id) {
      const file = path.normalize(id.split("?")[0]!);
      if (!sources.some(dir => file.startsWith(dir)) || !/\.(?:vue|ts)$/.test(file))
        return;
      const out = replaceImportMeta(code);
      return out === undefined
        ? undefined
        : { code: out, map: null };
    },
  };
}
