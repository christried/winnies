import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import lintStaged from "../lint-staged.config.mjs";
import { eslintCommands, eslintIgnoreCheck } from "./lint-staged-eslint.mjs";

// lint-staged splits a command string with string-argv and spawns it without a shell. This is the part of that
// splitting the commands use: whitespace separates tokens, double quotes group one.
function splitArgs(command) {
  return [
    ...command.matchAll(/"([^"]*)"|(\S+)/g),
  ].map(match => match[1] ?? match[2]);
}

const flags = [
  "eslint",
  "--fix",
  "--no-warn-ignored",
  "--max-warnings",
  "0",
];

// scripts/lint-staged-eslint.mjs: a commit runs ESLint only on the staged paths ESLint lints (#284).
describe("scripts/lint-staged-eslint.mjs eslintCommands", () => {
  it("starts no command when every path is ignored", async () => {
    const commands = await eslintCommands(["C:/repo/docs/a.md", "C:/repo/docs/b.md"], async () => true);

    expect(commands).toEqual([]);
  });

  it("starts no command for an empty list", async () => {
    expect(await eslintCommands([], async () => false)).toEqual([]);
  });

  it("lints only the paths that are not ignored, in the order given", async () => {
    const ignored = new Set(["C:/repo/docs/a.md", "C:/repo/docs/b.md"]);
    const commands = await eslintCommands(
      [
        "C:/repo/app/z.vue",
        "C:/repo/docs/a.md",
        "C:/repo/app/a.vue",
        "C:/repo/docs/b.md",
      ],
      async file => ignored.has(file),
    );

    expect(commands).toHaveLength(1);
    expect(splitArgs(commands[0]).slice(flags.length)).toEqual(["C:/repo/app/z.vue", "C:/repo/app/a.vue"]);
  });

  it("lints every path when none is ignored", async () => {
    const files = ["C:/repo/app/a.vue", "C:/repo/server/b.ts"];
    const commands = await eslintCommands(files, async () => false);

    expect(commands).toHaveLength(1);
    expect(splitArgs(commands[0]).slice(flags.length)).toEqual(files);
  });

  it("keeps a path with a space whole", async () => {
    const commands = await eslintCommands(["C:/My Repo/app/a.vue"], async () => false);

    expect(splitArgs(commands[0]).slice(flags.length)).toEqual(["C:/My Repo/app/a.vue"]);
  });

  it("keeps the flags that fix a file and refuse a warning", async () => {
    const commands = await eslintCommands(["C:/repo/app/a.vue"], async () => false);

    expect(splitArgs(commands[0]).slice(0, flags.length)).toEqual(flags);
  });
});

// The real wiring: this repository's eslint.config.mjs, which imports .nuxt/eslint.config.mjs (written by `nuxt
// prepare`, so by `pnpm install`). It fails, never skips, when .nuxt is missing. Loading antfu and Nuxt takes seconds.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// lint-staged hands over absolute paths with forward slashes.
const absolute = relative => path.resolve(root, relative).replaceAll("\\", "/");
const loadTimeout = 60_000;

describe("scripts/lint-staged-eslint.mjs eslintIgnoreCheck", () => {
  const isIgnored = eslintIgnoreCheck();

  it.each([
    "docs/design_handoff_winnies/README.md",
    "docs/winnies_full_process/README.md",
    "docs/research/testing-tooling.md",
    ".claude/skills/README.md",
    // No config object matches an icon: ESLint's CLI skips it too.
    "public/favicon.ico",
  ])("skips %s", async (file) => {
    expect(await isIgnored(absolute(file))).toBe(true);
  }, loadTimeout);

  it.each([
    "app/app.vue",
    "scripts/ci-wait.mjs",
    "eslint.config.mjs",
    // Brackets in a path are not a glob.
    "server/api/winnies/[id].get.ts",
  ])("lints %s", async (file) => {
    expect(await isIgnored(absolute(file))).toBe(false);
  }, loadTimeout);

  it("refuses to answer when ESLint cannot load a config, instead of calling every path ignored", async () => {
    const empty = mkdtempSync(path.join(tmpdir(), "lint-staged-eslint-"));
    try {
      await expect(eslintIgnoreCheck(empty)(path.join(empty, "a.ts"))).rejects.toThrow(/could not load its config/);
    }
    finally {
      rmSync(empty, { recursive: true, force: true });
    }
  }, loadTimeout);
});

describe("lint-staged.config.mjs", () => {
  it("starts no ESLint for staged handoff files", async () => {
    const commands = await lintStaged["*"]([
      absolute("docs/design_handoff_winnies/README.md"),
    ]);

    expect(commands).toEqual([]);
  }, loadTimeout);

  it("lints only the staged files ESLint lints", async () => {
    const commands = await lintStaged["*"]([
      absolute("docs/design_handoff_winnies/README.md"),
      absolute("app/app.vue"),
    ]);

    expect(commands).toHaveLength(1);
    expect(splitArgs(commands[0]).slice(flags.length)).toEqual([
      absolute("app/app.vue"),
    ]);
  }, loadTimeout);
});
