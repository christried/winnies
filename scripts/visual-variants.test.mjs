import { globSync } from "node:fs";
import { describe, expect, it } from "vitest";
import storybookConfig from "../.storybook/main.ts";
import { baselinePath, contextOptions, shotIn, storyTags, UNSHOT_PREFIXES, VARIANTS } from "../.storybook/visual-variants.ts";
import { storyEntries, storyIdsByFile } from "./visual-stories.mjs";

// The variant table decides which story renders are compared with a baseline (.storybook/visual-variants.ts), and the
// baselines are PNG files in stories/__screenshots__/. Vitest fails a missing baseline in CI, and nothing else ties the
// two together: a story id that names no story turns an `only` into "shoot nothing" and a `skip` into "shoot
// everything", and a PNG no variant shoots any more stays on disk, never compared. This test is that tie.

const SCREENSHOTS = "stories/__screenshots__";
const posix = file => file.replaceAll("\\", "/");

/**
 * The id of every story Storybook indexes (scripts/visual-stories.mjs reads them without importing a story).
 * @returns {string[]} the ids, sorted
 */
function storyIds() {
  return Object.values(storyIdsByFile(storybookConfig.stories)).flat().toSorted();
}

/**
 * The id and the tags of every story Storybook indexes (the indexer's reading: the meta's tags and the story's own).
 * @returns {{ id: string, tags: string[] }[]} one entry per story
 */
function indexedStories() {
  return storyEntries(storybookConfig.stories);
}

/** The story ids a variant's `only` and `skip` name that are not stories, one problem each. */
function unknownIds(variants, ids) {
  return variants.flatMap(variant => [
    ...(variant.only ?? []).map(id => ({ list: "only", id })),
    ...(variant.skip ?? []).map(id => ({ list: "skip", id })),
  ].filter(({ id }) => !ids.includes(id)).map(({ list, id }) => `Variant ${variant.name} names the story id ${JSON.stringify(id)} in \`${list}\`, which is not a story. Fix the id in .storybook/visual-variants.ts (the stories are: ${ids.join(", ")}).`));
}

/**
 * The tags a variant selects stories by that no story carries, one problem each. A tag nothing carries makes the
 * variant's project run no test, and a project with no test passes.
 * @param {object[]} variants the table
 * @param {{ id: string, tags: string[] }[]} entries every story with its tags
 * @returns {string[]} the problems
 */
function variantTagProblems(variants, entries) {
  const carried = new Set(entries.flatMap(({ tags }) => tags));
  return variants.flatMap(variant => (variant.tags ?? [])
    .filter(tag => !carried.has(tag))
    .map(tag => `Variant ${variant.name} selects stories by the tag ${JSON.stringify(tag)}, which no story carries, so its project would run nothing and pass. Fix the tag in .storybook/visual-variants.ts or put it on a story.`));
}

/** The baseline files a table shoots: every variant, every story that variant shoots. */
function expectedBaselines(variants, ids) {
  return variants.flatMap(variant => ids.filter(id => shotIn(variant, id)).map(id => baselinePath(variant.name, id))).toSorted();
}

/** The baselines a table shoots that are not on disk, and those on disk that no variant shoots, one problem each. */
function baselineProblems(expected, onDisk) {
  return [
    ...expected
      .filter(file => !onDisk.includes(file))
      .map(file => `${file} is shot by its variant but is not on disk. Run \`pnpm test:visual:image --update\` and commit it.`),
    ...onDisk
      .filter(file => !expected.includes(file))
      .map(file => `${file} is on disk but no variant shoots that story. Delete it, or fix the variant that should shoot it (.storybook/visual-variants.ts).`),
  ];
}

const noProblems = problems => expect(problems, problems.join("\n")).toEqual([]);
const baselinesOnDisk = () => globSync(`${SCREENSHOTS}/**/*.png`).map(posix).toSorted();

describe("the screenshot variants against the stories and the baselines on disk", () => {
  const ids = storyIds();

  it("finds the stories it checks against (an empty list must not make a rule pass on nothing)", () => {
    expect(ids).toContain("tokens-switches--default");
    expect(ids).toContain("tokens-spacing--default");
    // The motion stories (#305, #306): rendered and run in every variant, never shot.
    expect(ids).toContain("motion-particles--default");
    for (const name of [
      "ticks",
      "fatigue",
      "press",
      "popups",
      "edit",
      "rows",
      "drag",
      "counter",
      "morph",
      "stagger",
      "wipe",
    ])
      expect(ids).toContain(`motion-${name}--default`);
    expect(ids).toContain("motion-broadcast--default");
    expect(ids).toContain("motion-celebratory--default");
    expect(ids).toContain("motion-loops--default");
  });

  it("a story whose id starts with an unshot prefix is shot in no variant", () => {
    expect(UNSHOT_PREFIXES).toContain("motion-");
    const motion = ids.filter(id => UNSHOT_PREFIXES.some(prefix => id.startsWith(prefix)));
    expect(motion).toContain("motion-particles--default");
    for (const variant of VARIANTS) {
      for (const id of motion)
        expect(shotIn(variant, id), `${id} in ${variant.name}`).toBe(false);
    }
    // A variant with neither `only` nor `skip` shoots every other story, and still not these.
    expect(shotIn({}, "motion-particles--default")).toBe(false);
    expect(shotIn({}, "motion-broadcast--default")).toBe(false);
    for (const variant of VARIANTS)
      expect(shotIn(variant, "motion-broadcast--default"), variant.name).toBe(false);
    expect(shotIn({}, "tokens-colours--default")).toBe(true);
  });

  it("every story id in `only` and `skip` is a story", () => {
    noProblems(unknownIds(VARIANTS, ids));
  });

  it("the baselines on disk are exactly the ones the variants shoot", () => {
    const onDisk = baselinesOnDisk();
    expect(onDisk.length).toBeGreaterThan(0);
    noProblems(baselineProblems(expectedBaselines(VARIANTS, ids), onDisk));
  });
});

describe("catches a table that and the disk do not agree on", () => {
  const ids = [
    "a-one--default",
    "a-two--default",
  ];
  const variants = [
    {
      name: "all",
      globals: {},
    },
    {
      name: "one-only",
      globals: {},
      only: ["a-one--default"],
    },
    {
      name: "not-two",
      globals: {},
      skip: ["a-two--default"],
    },
  ];
  const shot = [
    `${SCREENSHOTS}/all/a-one-default.png`,
    `${SCREENSHOTS}/all/a-two-default.png`,
    `${SCREENSHOTS}/one-only/a-one-default.png`,
    `${SCREENSHOTS}/not-two/a-one-default.png`,
  ];

  it("a table and a disk that agree", () => {
    expect(unknownIds(variants, ids)).toEqual([]);
    expect(expectedBaselines(variants, ids)).toEqual(shot.toSorted());
    expect(baselineProblems(expectedBaselines(variants, ids), shot)).toEqual([]);
  });

  it("a story id renamed in `only` or in `skip`", () => {
    const renamed = [
      {
        ...variants[1],
        only: ["a-one--primary"],
      },
      {
        ...variants[2],
        skip: ["a-two--renamed"],
      },
    ];
    const problems = unknownIds(renamed, ids);
    expect(problems).toHaveLength(2);
    expect(problems[0]).toContain("one-only");
    expect(problems[0]).toContain("a-one--primary");
    expect(problems[0]).toContain("`only`");
    expect(problems[1]).toContain("not-two");
    expect(problems[1]).toContain("a-two--renamed");
    expect(problems[1]).toContain("`skip`");
  });

  it("a baseline no variant shoots", () => {
    const problems = baselineProblems(expectedBaselines(variants, ids), [...shot, `${SCREENSHOTS}/not-two/a-two-default.png`]);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain(`${SCREENSHOTS}/not-two/a-two-default.png`);
    expect(problems[0]).toContain("no variant shoots");
  });

  it("a shot story with no baseline", () => {
    const problems = baselineProblems(expectedBaselines(variants, ids), shot.slice(1));
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain(`${SCREENSHOTS}/all/a-one-default.png`);
    expect(problems[0]).toContain("not on disk");
  });
});

describe("the story reader the update's file-filter check uses (#367)", () => {
  it("keys the ids by story file, relative to the root, and a file's title decides the id, not its name", () => {
    const byFile = storyIdsByFile(storybookConfig.stories);
    expect(byFile["stories/tokens/colors.stories.ts"]).toContain("tokens-colours--default");
    expect(byFile["stories/tokens/radii.stories.ts"]).toContain("tokens-radii--default");
    expect(Object.keys(byFile).every(file => file.startsWith("stories/") && file.endsWith(".stories.ts"))).toBe(true);
  });
});

describe("the component stories (#307)", () => {
  const ids = storyIds();

  it("finds the UiIcon story and the plumbing story", () => {
    expect(ids).toContain("ui-icon--default");
    expect(ids).toContain("storybook-auto-imports--default");
  });

  it("a story under stories/ui is shot in every variant that has no `only`, with no edit to the table", () => {
    for (const variant of VARIANTS.filter(({ only }) => !only))
      expect(shotIn(variant, "ui-icon--default"), variant.name).toBe(true);
    for (const variant of VARIANTS.filter(({ only }) => only))
      expect(shotIn(variant, "ui-icon--default"), variant.name).toBe(false);
  });

  it("the plumbing story is rendered, played and checked by axe in every variant and shot in none", () => {
    expect(UNSHOT_PREFIXES).toContain("storybook-");
    for (const variant of VARIANTS)
      expect(shotIn(variant, "storybook-auto-imports--default"), variant.name).toBe(false);
    expect(shotIn({}, "storybook-auto-imports--default")).toBe(false);
  });
});

describe("the browser's preference for reduced motion (#345)", () => {
  const entries = indexedStories();
  const ids = entries.map(({ id }) => id);
  const variant = VARIANTS.find(({ name }) => name === "browser-prefers-reduced");
  const others = VARIANTS.filter(({ name }) => name !== "browser-prefers-reduced");

  it("has a variant that emulates the preference, keeps the toolbar at full motion and shoots nothing", () => {
    expect(variant).toBeDefined();
    // The toolbar stays at "full" on purpose: with "reduce" the attribute alone would reduce, and only the media query
    // is the case this variant exists for.
    expect(variant.globals.motion).toBe("full");
    expect(variant.emulateReducedMotion).toBe(true);
    for (const id of ids)
      expect(shotIn(variant, id), id).toBe(false);
  });

  it("hands the emulation and the tag to the one variant, and nothing to the other variants", () => {
    expect(contextOptions(variant)).toEqual({ reducedMotion: "reduce" });
    expect(storyTags(variant)).toEqual({
      include: ["reduced-preference"],
    });
    expect(others.length).toBeGreaterThan(0);
    for (const other of others) {
      expect(contextOptions(other), other.name).toBeUndefined();
      expect(storyTags(other), other.name).toBeUndefined();
    }
  });

  it("the tag is on the motion press story and the switch's toggling story, and on no other", () => {
    const tagged = entries.filter(({ tags }) => tags.includes("reduced-preference")).map(({ id }) => id);
    // The exact list is the decision: a third story grows the job, and a missing tag makes the project run nothing.
    expect(tagged.toSorted()).toEqual(["motion-press--default", "ui-switch--toggling"]);
    noProblems(variantTagProblems(VARIANTS, entries));
  });

  it("a variant whose tag no story carries is one problem", () => {
    const typo = [
      {
        name: "typo",
        globals: {},
        tags: ["reduced-prefrence"],
      },
      { name: "plain", globals: {} },
    ];
    const problems = variantTagProblems(typo, entries);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("typo");
    expect(problems[0]).toContain("reduced-prefrence");
  });
});
