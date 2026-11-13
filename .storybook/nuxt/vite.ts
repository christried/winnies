// The part of the Nuxt app that Storybook reproduces so the app's own components render in a story (#307): the Vue
// plugin, the auto-imports, the components in templates, the aliases `app/` uses and the `import.meta` flags.
// Nothing here boots Nuxt or any of its modules: `@nuxtjs/storybook` would run the app's plugins, and the theme plugin
// would overwrite the toolbar's `data-theme` (#264). Only this file touches the disk, and only when Vite calls it.
import type { UserConfig } from "vite";
import path from "node:path";
import vue from "@vitejs/plugin-vue";
import Unimport from "unimport/unplugin";
import { componentsPlugin } from "./components.ts";
import { importMetaPlugin } from "./import-meta.ts";
import { importsOptions } from "./imports.ts";

/**
 * A Vite config to merge into Storybook's.
 *
 * @param root the repository root
 * @returns the plugins and the aliases
 */
export function nuxtConfig(root: string): UserConfig {
  const at = (dir: string) => path.join(root, dir).replaceAll("\\", "/");
  return {
    plugins: [
      importMetaPlugin(root),
      vue(),
      // `enforce: "post"`: both see the compiled SFC.
      Unimport.vite(importsOptions(root)),
      componentsPlugin(root),
    ],
    resolve: {
      alias: [
        { find: /^~\//, replacement: `${at("app")}/` },
        { find: /^~~\//, replacement: `${at("")}/` },
        { find: /^#shared\//, replacement: `${at("shared")}/` },
        {
          find: /^#components$/,
          replacement: at(".storybook/nuxt/components-module.ts"),
        },
      ],
    },
  };
}
