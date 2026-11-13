import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import storybookConfig from "../.storybook/main.ts";
import unitConfig from "../vitest.config.ts";

// Agent worktrees live in .claude/worktrees/ (git-ignored), so in the main checkout they sit below the Vitest root.
// Vitest's default `exclude` doesn't know the folder, and each worktree has its own copy of the unit tests: without
// `.claude/` in the exclude, `pnpm test` and the IDE's Vitest extension collect them, and a worktree with no `.nuxt/`
// of its own fails every file with TSCONFIG_ERROR (#339). CI and a worktree's own run have no worktree below them,
// so no run of them can show it: this test says it.

const WORKTREE_TEST = ".claude/worktrees/agent-a86ad8cb0bf556d65/app/utils/motion/tokens.test.ts";
const OWN_TEST = "app/utils/motion/tokens.test.ts";

/**
 * The projects the unit config resolves to. defineVitestConfig returns a function and builds the Nuxt and the node
 * project inside it (each with its own `exclude`), so the root of the config says nothing: a CLI `--exclude` reaches
 * only the root, which is why it did not help on the command line.
 * @returns {Promise<{ name: string, exclude: string[] }[]>} each project's name and exclude patterns
 */
async function unitProjects() {
  const resolved = await unitConfig({ command: "serve", mode: "test" });
  return resolved.test.projects.map(project => ({ name: project.test.name, exclude: project.test.exclude }));
}

/**
 * Whether a pattern of an `exclude` list matches the path. Node's matcher skips dot folders for a `*`, so only a
 * pattern that names `.claude` can match, which is the point.
 */
const excludes = (patterns, file) => patterns.some(pattern => path.posix.matchesGlob(file, pattern));

/**
 * The `include` patterns a config file names, read from its source: importing the API config loads the test
 * environment, and the screenshot config refuses to load outside the container.
 */
function includeOf(file) {
  const source = readFileSync(file, "utf8");
  const list = /include:\s*\[([^\]]*)\]/.exec(source)?.[1] ?? "";
  return [
    ...list.matchAll(/"([^"]+)"/g),
  ].map(match => match[1]);
}

/** A pattern that starts with a wildcard or a dot can match below `.claude/`; one that starts with a folder name cannot. */
const rooted = pattern => /^[\w-]+\//.test(pattern);

describe("agent worktrees stay out of the Vitest runs (#339)", () => {
  it("the unit config excludes .claude/ in every project it resolves to", async () => {
    const projects = await unitProjects();
    expect(projects.map(project => project.name), "the unit config is expected to resolve to a nuxt and a node project").toEqual(["nuxt", "node"]);
    for (const { name, exclude } of projects) {
      expect(excludes(exclude, WORKTREE_TEST), `The "${name}" project of vitest.config.ts would collect ${WORKTREE_TEST}. Add ".claude/**" to \`test.exclude\` there; defineVitestConfig copies it into each project.`).toBe(true);
      expect(excludes(exclude, OWN_TEST), `The "${name}" project excludes the checkout's own tests (${OWN_TEST}).`).toBe(false);
    }
  }, 60_000);

  it.each(["vitest.api.config.ts", "vitest.build.config.ts"])("%s collects from a folder of its own, never from .claude/", (file) => {
    const include = includeOf(file);
    expect(include.length, `Could not read the include list of ${file}. Keep it a plain array of string literals.`).toBeGreaterThan(0);
    expect(include.filter(pattern => !rooted(pattern)), `${file} includes a pattern that can reach .claude/worktrees/. Root it in a folder (tests/api/**) or exclude .claude/**.`).toEqual([]);
  });

  it("the Storybook stories are collected from one folder, never from .claude/", () => {
    // vitest.storybook.config.ts takes its test files from the Storybook plugin, which reads these globs.
    expect(storybookConfig.stories.filter(pattern => !rooted(pattern.replace(/^\.\.\//, ""))), "A stories glob can reach .claude/worktrees/. Root it in a folder (../stories/**).").toEqual([]);
  });
});
