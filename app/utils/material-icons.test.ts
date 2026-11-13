import type { MaterialCut } from "./material-icons";
import { describe, expect, it } from "vitest";
import { MATERIAL_ICON_NAMES, materialCut, materialIconBody } from "./material-icons";

// The files again, read by this test's own glob: the invariants below are about what is committed, not about what the
// module made of it. The path is relative so Nuxt, Vitest and Storybook all expand it alike.
const FILES = import.meta.glob<string>("../assets/icons/*/*.svg", { query: "?raw", import: "default", eager: true });
const CUTS: MaterialCut[] = [
  "w500",
  "w500-fill",
  "w600",
  "w700-fill",
];
const entries = Object.entries(FILES);
const inCut = (cut: string) => entries.filter(([path]) => path.split("/").at(-2) === cut);
const names = (cut: string) => inCut(cut).map(([path]) => path.split("/").at(-1)!.replace(".svg", "")).toSorted();

describe("materialCut", () => {
  // The handoff has four cuts: no w600-fill and no w700 outline. Those two pairs snap to the nearest cut, a tie lighter.
  it.each([
    [500, false, "w500"],
    [500, true, "w500-fill"],
    [600, false, "w600"],
    [600, true, "w500-fill"],
    [700, false, "w600"],
    [700, true, "w700-fill"],
  ] as const)("weight %i, fill %s is %s", (weight, fill, cut) => {
    expect(materialCut(weight, fill)).toBe(cut);
  });
});

describe("materialIconBody", () => {
  it("is four different markups for the four cuts of one icon", () => {
    const bodies = CUTS.map(cut => materialIconBody("check_circle", cut));
    expect(new Set(bodies).size).toBe(4);
  });

  it("a weight 600 filled icon and a weight 700 outline are the bodies of the cuts they snap to", () => {
    expect(materialIconBody("check_circle", materialCut(600, true))).toBe(materialIconBody("check_circle", "w500-fill"));
    expect(materialIconBody("check_circle", materialCut(700, false))).toBe(materialIconBody("check_circle", "w600"));
  });

  it("is the one path between the svg tags", () => {
    expect(materialIconBody("add", "w500")).toMatch(/^<path d="[^"]+"><\/path>$/);
  });

  it("throws on a name that is not shipped, and the message names it and the cut", () => {
    expect(() => materialIconBody("not_an_icon" as never, "w500")).toThrow(/not_an_icon.*w500/);
  });
});

describe("the shipped files", () => {
  it("the glob finds 36 names in four cuts (a wrong path must not pass on nothing)", () => {
    expect(entries).toHaveLength(144);
    expect(MATERIAL_ICON_NAMES).toHaveLength(36);
  });

  it("the list of names is the names in each cut's folder", () => {
    const expected = [...MATERIAL_ICON_NAMES].toSorted();
    expect(CUTS.map(names)).toEqual(CUTS.map(() => expected));
  });

  it("every file has the handoff's viewBox and currentColor on its root", () => {
    const bad = entries.filter(([, raw]) => !/^<svg [^>]*viewBox="0 -960 960 960"/.test(raw) || !/^<svg [^>]*fill="currentColor"/.test(raw));
    expect(bad.map(([path]) => path)).toEqual([]);
  });

  it("every file has exactly one path", () => {
    const bad = entries.filter(([, raw]) => raw.split("<path").length !== 2);
    expect(bad.map(([path]) => path)).toEqual([]);
  });

  it("no file has a style, a script, an image, a link or a hard-coded fill", () => {
    const bad = entries.filter(([, raw]) => /<style|<script|<image|href|fill="#/.test(raw));
    expect(bad.map(([path]) => path)).toEqual([]);
  });

  it("no body mentions a URL", () => {
    const bad = MATERIAL_ICON_NAMES.flatMap(name => CUTS.map(cut => [name, cut] as const))
      .filter(([name, cut]) => materialIconBody(name, cut).includes("http"));
    expect(bad).toEqual([]);
  });
});
