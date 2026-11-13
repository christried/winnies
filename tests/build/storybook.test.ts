import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { STORYBOOK_ROUTE } from "../../stage";

// Storybook is served at /storybook on staging only (#298): the production build must carry neither its files
// nor a route to them. Run `pnpm build` first, then `pnpm test:build`; CI builds production, and its `check`
// job has built storybook-static just before, so a build that went by "the directory exists" would fail here.
// Which builds carry it is buildsStorybook in stage.ts, covered in stage.test.ts.
const OUTPUT = resolve(import.meta.dirname, "../../.output");
const SERVER = join(OUTPUT, "server");

const WHAT_TO_CHECK = `Was it built with WINNIES_STAGE=staging (in the shell or in .env)? That build carries Storybook on purpose: unset it and run \`pnpm build\` again.`;

describe("storybook in the production build", () => {
  it(`has no ${STORYBOOK_ROUTE} folder in .output/public`, () => {
    // A missing build must fail loudly, never pass on nothing.
    expect(existsSync(join(OUTPUT, "public")), "no .output/public: run `pnpm build` first").toBe(true);

    expect(existsSync(join(OUTPUT, "public", STORYBOOK_ROUTE)), `${STORYBOOK_ROUTE} is in .output/public. ${WHAT_TO_CHECK}`).toBe(false);
  });

  // The quote makes it a path of its own: the traced node_modules of the server hold package.json files with
  // "github.com/storybookjs/storybook/issues" in them, which is not a route.
  it.each([`"${STORYBOOK_ROUTE}/`])("carries no %s anywhere in .output/server", (marker) => {
    // Every file, whatever its extension: the public-asset manifest lists each file's path, quoted.
    const files = readdirSync(SERVER, { recursive: true, encoding: "utf8" })
      .filter(file => statSync(join(SERVER, file)).isFile());
    expect(files.length).toBeGreaterThan(0);

    const carriers = files.filter(file => readFileSync(join(SERVER, file), "utf8").includes(marker));
    expect(carriers, `${marker} is in the build. ${WHAT_TO_CHECK}`).toEqual([]);
  });
});
