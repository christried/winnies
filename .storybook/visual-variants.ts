/**
 * The pictures the screenshot suite takes: one Vitest project per variant, each rendering every story with these
 * globals (the toolbar's theme, dialect and motion, set through the decorator in preview.ts). Every story is rendered
 * in every variant, so axe runs on each of them; the variant decides which of those renders are also compared with a
 * baseline in `stories/__screenshots__/<variant>/<story id>.png`.
 *
 * The rule is the one for reduced motion: a variant is shot only where its picture differs from the Workspace shot of
 * the same theme, and the shots were compared byte for byte to decide it (#265). Light and dark under Workspace are the
 * reference and are shot for every story. A story added later is shot in every variant that shoots all stories, and its
 * baselines are regenerated with `pnpm test:visual:podman --update`.
 */
export interface Variant {
  name: string;
  globals: { theme: "light" | "dark"; dialect: "workspace" | "broadcast" | "showcase"; motion: "full" | "reduce" };
  /** Only these stories are shot; the others are rendered and checked by axe only. */
  only?: readonly string[];
  /** These stories are rendered and checked by axe, but not shot: their picture equals the Workspace one. */
  skip?: readonly string[];
}

export const VARIANTS: readonly Variant[] = [
  {
    name: "workspace-light",
    globals: { theme: "light", dialect: "workspace", motion: "full" },
  },
  {
    name: "workspace-dark",
    globals: { theme: "dark", dialect: "workspace", motion: "full" },
  },
  // `--dur-hover` and `--motion-gain` resolve differently under data-motion="reduce"; no other token story reads them.
  {
    name: "workspace-light-reduced",
    globals: { theme: "light", dialect: "workspace", motion: "reduce" },
    only: ["tokens-switches--default"],
  },
  {
    name: "showcase-light",
    globals: { theme: "light", dialect: "showcase", motion: "full" },
  },
  {
    name: "showcase-dark",
    globals: { theme: "dark", dialect: "showcase", motion: "full" },
  },
  // Spacing draws nothing a Broadcast dialect changes.
  {
    name: "broadcast-light",
    globals: { theme: "light", dialect: "broadcast", motion: "full" },
    skip: ["tokens-spacing--default"],
  },
  {
    name: "broadcast-dark",
    globals: { theme: "dark", dialect: "broadcast", motion: "full" },
    skip: ["tokens-spacing--default"],
  },
];

/** Whether a story rendered in a variant is also compared with a baseline. */
export function isShot(variantName: string | undefined, storyId: string) {
  const variant = VARIANTS.find(({ name }) => name === variantName);
  if (!variant) {
    throw new Error(`Unknown screenshot variant ${String(variantName)}.`);
  }
  return variant.only
    ? variant.only.includes(storyId)
    : !variant.skip?.includes(storyId);
}
