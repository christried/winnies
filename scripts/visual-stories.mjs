// The stories Storybook indexes and their ids, read the way Storybook reads them (its static CSF reader and its
// own title rule), without importing a story. Shared by scripts/visual-variants.test.mjs, which ties the baselines to
// the stories, and scripts/visual-image.mjs, which tells which baselines an update with a file filter may change.
import { globSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { getStoryTitle } from "storybook/internal/common";
import { loadCsf } from "storybook/internal/csf-tools";

/**
 * Every story file, parsed the way Storybook's indexer parses it.
 *
 * @param {readonly string[]} stories the globs of `.storybook/main.ts`, relative to `.storybook`
 * @param {string} root the repository root
 * @returns {[string, object][]} story file (relative to the root, posix) and its parsed CSF
 */
function parseStoryFiles(stories, root) {
  const configDir = path.join(root, ".storybook");
  const files = stories.flatMap(pattern => globSync(pattern, { cwd: configDir }).map(file => path.resolve(configDir, file)));
  return files.map((file) => {
    const csf = loadCsf(readFileSync(file, "utf8"), {
      fileName: file,
      makeTitle: userTitle => getStoryTitle({
        storyFilePath: file,
        configDir,
        stories,
        workingDir: root,
        userTitle,
      }) ?? userTitle,
    }).parse();
    return [
      path.relative(root, file).replaceAll("\\", "/"),
      csf,
    ];
  });
}

/**
 * The id of every story of every story file.
 *
 * @param {readonly string[]} stories the globs of `.storybook/main.ts`, relative to `.storybook`
 * @param {string} [root] the repository root
 * @returns {Record<string, string[]>} story file (relative to the root, posix) to the ids of its stories
 */
export function storyIdsByFile(stories, root = process.cwd()) {
  return Object.fromEntries(parseStoryFiles(stories, root).map(([file, csf]) => [
    file,
    csf.stories.map(story => story.id),
  ]));
}
