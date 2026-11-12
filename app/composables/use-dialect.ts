/** The dialects a surface can speak. The Workspace speaks none, so it passes null. */
export type Dialect = "broadcast" | "showcase";

/**
 * Renders the surface's dialect as `data-dialect` on <body>, on the server as well as in the browser.
 *
 * @param dialect the dialect the surface speaks, or null for none
 */
export function useDialect(dialect: Dialect | null) {
  useHead({
    bodyAttrs: { "data-dialect": dialect ?? undefined },
  });
}
