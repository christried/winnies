import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { cssTimeMs } from "../../stories/support/css-time";

// Staging serves the minified Storybook build, where `--dur-breathe: 2200ms` is `2.2s` (#378); CI's `visual` job
// plays the stories on the dev server's unminified CSS and never sees it. Run `pnpm build-storybook` first, then
// `pnpm test:build`; CI's `check` job builds storybook-static just before this. A stale local storybook-static
// passes on its own old CSS: build it again after a change to the token file.
const STATIC = resolve(import.meta.dirname, "../../storybook-static");
const TOKEN_FILE = resolve(import.meta.dirname, "../../app/assets/css/winnies-tokens.css");

// A `var(--dur-x)` use is never followed by a colon, so only declarations match. A minified block ends without `;`.
const DECLARATION = /--(dur-[\w-]+)\s*:\s*([^;}]+)/g;

/** Per `--dur-*` name, the milliseconds its declarations read as: sorted and unique, since a block may repeat one. */
function durationsIn(css: string) {
  const byName = new Map<string, Set<number>>();
  for (const [, name = "", value = ""] of css.matchAll(DECLARATION)) {
    const ms = byName.get(name) ?? new Set<number>();
    ms.add(cssTimeMs(value));
    byName.set(name, ms);
  }
  return Object.fromEntries([...byName].toSorted(([a], [b]) => a.localeCompare(b)).map(([name, ms]) => [
    name,
    [...ms].toSorted((a, b) => a - b),
  ]));
}

describe("the duration tokens in the built Storybook", () => {
  it("read as the milliseconds the token file writes", () => {
    // A missing build must fail loudly, never pass on nothing.
    const files = readdirSync(STATIC, { recursive: true, encoding: "utf8" }).filter(file => file.endsWith(".css"));
    expect(files.length, "no storybook-static: run `pnpm build-storybook` first").toBeGreaterThan(0);

    const built = durationsIn(files.map(file => readFileSync(join(STATIC, file), "utf8")).join("\n"));
    const source = durationsIn(readFileSync(TOKEN_FILE, "utf8"));

    // 27 names, as app/utils/motion/tokens.test.ts asserts of the source: an empty match cannot pass.
    expect(Object.keys(source)).toHaveLength(27);
    expect(Object.keys(built)).toHaveLength(27);
    expect(built).toEqual(source);
  });
});
