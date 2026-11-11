import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { ICONS } from "../../scripts/favicon-tint.mjs";
import { FAVICON_FILE, faviconState } from "./use-favicon";

describe("faviconState", () => {
  it.each([
    [
      { running: false, complete: false },
      "idle",
    ],
    [
      { running: true, complete: false },
      "running",
    ],
    [
      { running: false, complete: true },
      "complete",
    ],
    [
      { running: true, complete: true },
      "complete",
    ],
  ] as const)("%o shows %s", (input, state) => {
    expect(faviconState(input)).toBe(state);
  });
});

describe("fAVICON_FILE", () => {
  it.each(Object.entries(FAVICON_FILE))("the %s icon, %s, is in public/ and has a staging copy", (_state, file) => {
    expect(existsSync(fileURLToPath(new URL(`../../public/${file}`, import.meta.url)))).toBe(true);
    expect(ICONS.map(icon => icon.file)).toContain(file);
  });
});
