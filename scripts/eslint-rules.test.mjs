import { describe, expect, it } from "vitest";
import { lintPlanted } from "./lint-planted.mjs";

// The lint rules of this repository, each tested by linting a planted snippet through the repository's own config
// (`eslint.config.mjs`, which imports .nuxt/eslint.config.mjs, written by `nuxt prepare`, so by `pnpm install`). It fails,
// never skips, when .nuxt is missing. Loading antfu and Nuxt takes seconds. One describe per rule: each rule's batch adds its
// own (#360, #361, #363).
const loadTimeout = 60_000;
const rule = "no-restricted-syntax";
const storyPath = "stories/ui/planted.stories.ts";
const kept = /kept off needs a ticket/;

// The meta, a story, a const the tag is read from, and a template literal: each is one "!test" string in a story.
const taggedMeta = "const meta = { title: \"A\", tags: [\"!test\"] };\nexport default meta;";
const taggedStory = "export const A = { tags: [\"autodocs\", \"!test\"] };";
const taggedConst = "const OFF = [\"!test\"];\nexport const A = { tags: OFF };";
const taggedTemplate = "export const A = { tags: [`!test`] };";

describe("no \"!test\" tag in a story (#360)", () => {
  it.each([
    ["a tag in the meta", taggedMeta],
    ["a tag in one story", taggedStory],
    ["a const the tag is read from", taggedConst],
    ["a template literal", taggedTemplate],
  ])("reports %s once, with the ticket message", async (_name, text) => {
    const messages = await lintPlanted(text, storyPath, rule);

    expect(messages.filter(message => kept.test(message.message))).toHaveLength(1);
  }, loadTimeout);

  it.each([
    ["stories/support/planted.ts", "the support code of the stories"],
    ["app/utils/planted.ts", "the app"],
  ])("does not report the meta tag at %s (%s)", async (filePath, _where) => {
    expect(await lintPlanted(taggedMeta, filePath, rule)).toEqual([]);
  }, loadTimeout);

  it("does not report a story tagged autodocs only", async () => {
    expect(await lintPlanted("export const A = { tags: [\"autodocs\"] };", storyPath, rule)).toEqual([]);
  }, loadTimeout);

  it("keeps antfu's restrictions in a story: a const enum is still reported, not with the ticket message", async () => {
    const messages = await lintPlanted("const enum E { A }\nexport const B = E.A;", storyPath, rule);

    expect(messages).toHaveLength(1);
    expect(messages[0].message).not.toMatch(kept);
  }, loadTimeout);

  it.each([
    ["an unparsable snippet", "export const =", storyPath],
    ["a path ESLint ignores", "export const A = 1;", "docs/design_handoff_winnies/planted.ts"],
  ])("refuses to answer for %s instead of reporting nothing", async (_name, text, filePath) => {
    await expect(lintPlanted(text, filePath, rule)).rejects.toThrow();
  }, loadTimeout);
});

const asked = /runningLoops/;
const memberRead = "export const n = (a: Animation) => a.effect!.getComputedTiming().iterations;";
const destructure = "export const n = (t: any) => { const { iterations } = t; return iterations; };";

describe("no read of `iterations` in a story (#361)", () => {
  it.each([
    ["a member read", memberRead],
    ["a read through an optional chain", "export const n = (a: Animation) => a.effect?.getComputedTiming().iterations === Infinity;"],
    ["a computed literal read", "export const n = (t: any) => t[\"iterations\"];"],
    ["a destructure", destructure],
    ["a renamed destructure", "export const n = (t: any) => { const { iterations: count } = t; return count; };"],
  ])("reports %s once, pointing at runningLoops", async (_name, text) => {
    const messages = await lintPlanted(text, storyPath, rule);

    expect(messages.filter(message => asked.test(message.message))).toHaveLength(1);
  }, loadTimeout);

  it("reports each of two reads", async () => {
    const messages = await lintPlanted("export const same = (x: any, y: any) => x.iterations === y.iterations;", storyPath, rule);

    expect(messages.filter(message => asked.test(message.message))).toHaveLength(2);
  }, loadTimeout);

  it.each([
    ["a member read", memberRead],
    ["a destructure", destructure],
  ])("does not report %s in the support code of the stories", async (_name, text) => {
    expect(await lintPlanted(text, "stories/support/planted.ts", rule)).toEqual([]);
  }, loadTimeout);

  it.each([
    ["an options object, which makes a loop", "export const a = (el: HTMLElement) => el.animate([], { iterations: 2 });"],
    ["iterationStart", "export const s = (t: any) => t.iterationStart;"],
  ])("does not report %s in a story", async (_name, text) => {
    expect(await lintPlanted(text, storyPath, rule)).toEqual([]);
  }, loadTimeout);

  it("keeps the \"!test\" tag and antfu's restrictions beside it", async () => {
    const text = [
      memberRead,
      "export const A = { tags: [\"!test\"] };",
      "const enum E { A }",
      "export const B = E.A;",
    ].join("\n");
    const messages = await lintPlanted(text, storyPath, rule);

    expect(messages).toHaveLength(3);
    expect(messages.filter(message => asked.test(message.message))).toHaveLength(1);
    expect(messages.filter(message => kept.test(message.message))).toHaveLength(1);
  }, loadTimeout);
});
