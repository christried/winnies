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

// A bare control outside the UI components fails the lint (#363). The rule reads the template, so the snippets are a
// `.vue` file with a template only: the planted path decides which block of the config applies.
const bareRule = "vue/no-restricted-html-elements";
const bareButton = "<template>\n  <button type=\"button\">Go</button>\n</template>\n";
const bareInput = "<template>\n  <input type=\"text\">\n</template>\n";

describe("a bare <button> or <input> outside the UI components (#363)", () => {
  it.each([
    ["a button in a component", bareButton, "app/components/winnie/planted.vue"],
    ["an input in a component", bareInput, "app/components/planted.vue"],
    ["a button in a page", bareButton, "app/pages/planted.vue"],
    ["an input in a layout", bareInput, "app/layouts/planted.vue"],
  ])("reports %s once", async (_name, text, filePath) => {
    expect(await lintPlanted(text, filePath, bareRule)).toHaveLength(1);
  }, loadTimeout);

  it.each([
    ["button", bareButton, /UiButton/],
    ["input", bareInput, /UiTextInput/],
  ])("names what to use instead of a bare %s", async (_element, text, replacement) => {
    const messages = await lintPlanted(text, "app/components/planted.vue", bareRule);

    expect(messages[0].message).toMatch(replacement);
  }, loadTimeout);

  it.each([
    ["button", bareButton],
    ["input", bareInput],
  ])("does not report a %s in the UI components", async (_element, text) => {
    expect(await lintPlanted(text, "app/components/ui/planted.vue", bareRule)).toEqual([]);
  }, loadTimeout);

  it.each([
    ["the rename button", bareButton, "app/components/winnie/winnie-card-name.vue"],
    ["the Counter pill's input", bareInput, "app/components/counter-pill.vue"],
  ])("does not report %s, a known exception until R3", async (_name, text, filePath) => {
    expect(await lintPlanted(text, filePath, bareRule)).toEqual([]);
  }, loadTimeout);

  it.each([
    ["an input in the rename button's file", bareInput, "app/components/winnie/winnie-card-name.vue"],
    ["a button in the Counter pill's file", bareButton, "app/components/counter-pill.vue"],
  ])("still reports %s: an exception covers one control", async (_name, text, filePath) => {
    expect(await lintPlanted(text, filePath, bareRule)).toHaveLength(1);
  }, loadTimeout);
});

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
