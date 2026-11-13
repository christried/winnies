// What Nuxt's components loader does for the app, for Storybook: a `.vue` file of `app/components/` is a component by
// name, and `<UiIcon />` in a template becomes an import of that file. Pure functions beside one small Vite plugin, so
// `scripts/storybook-nuxt.test.mjs` can compare the names with the ones Nuxt wrote into `.nuxt/components.d.ts`.
// The naming is a port of `resolveComponentNameSegments` in Nuxt's `src/core/utils/names.ts`.
import type { Plugin } from "vite";
import { globSync } from "node:fs";
import path from "node:path";

const posix = (file: string) => file.replaceAll("\\", "/");

/** `splitByCase` of `scule`, which Nuxt uses: separators and case boundaries split, "AwesomeComponent" is two parts. */
function splitByCase(text: string): string[] {
  return text.replace(/([a-z\d])([A-Z])/g, "$1-$2").split(/[-_/.\\\s]+/).filter(Boolean);
}

const pascalCase = (parts: string[]) => parts.map(part => part.charAt(0).toUpperCase() + part.slice(1)).join("");

/** A directory in parentheses only groups files; it never enters a name. */
const isGroupingFolder = (segment: string) => /^\(.*\)$/.test(segment.trim());

/**
 * The name Nuxt registers a component under.
 *
 * Directory segments plus the file's stem, in PascalCase; a directory the stem already starts with is not said twice
 * (`challenge/challenge-card.vue` is `ChallengeCard`), `index.vue` takes the folder's name, and the `.client`,
 * `.server`, `.global` and `.island` suffixes are not part of the name.
 *
 * @param relativePath the file's path relative to `app/components`
 * @returns the PascalCase name a template uses
 */
export function componentName(relativePath: string): string {
  const relative = posix(relativePath);
  const dir = path.posix.dirname(relative);
  const prefixes = (dir === "."
    ? []
    : dir.split("/")).filter(part => !isGroupingFolder(part));

  let stem = path.posix.basename(relative, path.posix.extname(relative)).replace(/(?:\.(?:client|server))?(?:\.global|\.island)*$/, "");
  if (stem.toLowerCase() === "index")
    stem = "";
  const fileParts = splitByCase(stem);
  const fileContent = fileParts.join("/").toLowerCase();

  const nameParts = prefixes.flatMap(splitByCase);
  const matched: string[] = [];
  for (let index = prefixes.length - 1; index >= 0; index--) {
    const prefix = prefixes[index]!;
    matched.unshift(...splitByCase(prefix).map(part => part.toLowerCase()));
    const matchedContent = matched.join("/");
    if (fileContent === matchedContent || fileContent.startsWith(`${matchedContent}/`) || (prefix.toLowerCase() === fileContent && prefixes[index + 1] === prefix))
      nameParts.length = index;
  }
  return pascalCase([
    ...nameParts,
    ...fileParts,
  ]);
}

/**
 * Every component of `app/components`, by the name a template uses.
 *
 * @param root the repository root
 * @returns PascalCase name to the file's absolute path; the first file wins a duplicate name
 */
export function scanComponents(root: string): Map<string, string> {
  const base = path.join(root, "app/components");
  const found = new Map<string, string>();
  for (const file of globSync("**/*.vue", { cwd: base }).map(posix).toSorted()) {
    // Nuxt ignores a file whose name starts with a hyphen.
    if (path.posix.basename(file).startsWith("-"))
      continue;
    const name = componentName(file);
    if (name && !found.has(name))
      found.set(name, path.join(base, file));
  }
  return found;
}

// `_resolveComponent("UiIcon")` or `_resolveComponent("ui-icon", true)`: what Vue's template compiler writes for a tag
// that is no import of the script.
const RESOLVE_RE = /_resolveComponent\((["'])([^"']+)\1(?:\s*,\s*(?:true|false))?\)/g;

/**
 * Turns the components a template resolves by name into imports of their files. Runs after the Vue plugin, on the
 * compiled SFC, as Nuxt's loader does. A name no file has stays a `_resolveComponent` call: Vue warns, and the
 * preview's `warnHandler` fails the story.
 *
 * @param root the repository root
 * @returns the Vite plugin
 */
export function componentsPlugin(root: string): Plugin {
  let components: Map<string, string> | undefined;
  return {
    name: "winnies:storybook-components",
    enforce: "post",
    transform(code, id) {
      if (!/\.vue(?:\?|$)/.test(id) || !code.includes("_resolveComponent"))
        return;
      components ??= scanComponents(root);
      const imports = new Map<string, string>();
      const out = code.replace(RESOLVE_RE, (call, _quote, tag: string) => {
        const name = pascalCase(splitByCase(tag));
        const file = components!.get(name);
        if (!file)
          return call;
        const local = `__storybook_${name}`;
        imports.set(local, file);
        return local;
      });
      if (!imports.size)
        return;
      const head = [...imports].map(([local, file]) => `import ${local} from ${JSON.stringify(posix(file))};`).join("\n");
      return { code: `${head}\n${out}`, map: null };
    },
  };
}
