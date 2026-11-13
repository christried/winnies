import type { Meta, StoryObj } from "@storybook/vue3-vite";
import { expect, userEvent, within } from "storybook/test";
import { h } from "vue";
import UiIcon from "../../app/components/ui/icon.vue";
import { MATERIAL_ICON_NAMES } from "../../app/utils/material-icons";
import { expectQuietAfter } from "../support/component-checks";
import { chip, headingCss } from "../support/html";

// The app's own UiIcon in a real browser (#308): every shipped name in each of the four handoff cuts, the two
// combos the handoff has no cut for (they snap, and the human judges the snap here), and the four sizes. A name added to
// MATERIAL_ICON_NAMES shows up here without an edit. The markup is inline in the page: nothing is fetched.

// The props that give each cut, as the component's own table says.
const CUTS = [
  ["w500", {}],
  [
    "w500-fill",
    { fill: true },
  ],
  [
    "w600",
    { weight: 600 },
  ],
  [
    "w700-fill",
    { weight: 700, fill: true },
  ],
] as const;

// The two pairs with no cut of their own, and the cut each snaps to.
const SNAPS = [
  [
    "weight 600 + fill",
    "w500-fill",
    { weight: 600, fill: true },
  ],
  [
    "weight 700, no fill",
    "w600",
    { weight: 700 },
  ],
] as const;

const SIZES = ["sm", "md", "lg", "xl"] as const;

// Text sits on a chip, never straight on the dialect backdrop: axe cannot judge contrast over it. A long name
// (`control_point_duplicate`) has no break opportunity of its own, so the chip may break anywhere.
function cell(attrs: Record<string, string>, props: Record<string, unknown>, label: string) {
  return h("div", {
    ...attrs,
    style: "display:flex;flex-direction:column;align-items:flex-start;gap:8px;width:120px;padding:8px;"
      + "background:var(--color-surface);color:var(--color-text);border-radius:var(--radius-md);overflow-wrap:anywhere",
  }, [
    h(UiIcon, props),
    h("div", {
      innerHTML: chip(label),
    }),
  ]);
}

function section(heading: string, attrs: Record<string, string>, cells: ReturnType<typeof cell>[]) {
  return h("div", {
    ...attrs,
    style: "display:flex;flex-direction:column;gap:12px",
  }, [
    h("h3", { style: `${headingCss};font-size:var(--text-xl)` }, heading),
    h("div", { style: "display:flex;flex-wrap:wrap;gap:16px" }, cells),
  ]);
}

const meta = {
  title: "UI/Icon",
  render: () => () => h("section", {
    "aria-label": "Icon",
    "style": "display:flex;flex-direction:column;gap:24px;padding:24px",
  }, [
    h("h1", { style: `${headingCss};font-size:var(--text-4xl)` }, "Icon"),
    h("h2", { style: `${headingCss};font-size:var(--text-2xl)` }, "Cuts"),
    ...CUTS.map(([cut, props]) => section(cut, { "data-cut": cut }, MATERIAL_ICON_NAMES.map(name => cell({ "data-icon": name }, { name, ...props }, name)))),
    h("h2", { style: `${headingCss};font-size:var(--text-2xl)` }, "Snapped"),
    section("No cut of its own", { "data-snapped": "" }, SNAPS.map(([label, cut, props]) => cell({ "data-snap": cut }, { name: "check_circle", ...props }, `${label} is ${cut}`))),
    h("h2", { style: `${headingCss};font-size:var(--text-2xl)` }, "Sizes"),
    section("check_circle", { "data-sizes": "" }, [
      ...SIZES.map(size => cell({ "data-size": size }, { name: "check_circle", size }, size)),
      // The default size is left to the component's own default.
      cell({ "data-size": "default" }, { name: "check" }, "no size"),
    ]),
  ]),
} satisfies Meta;

export default meta;

export const Default: StoryObj<typeof meta> = {
  async play({ canvasElement, step }) {
    await within(canvasElement).findByRole("heading", { name: "Icon", level: 1 });
    const cutEl = (cut: string) => canvasElement.querySelector<HTMLElement>(`[data-cut="${cut}"]`)!;
    const pathOf = (root: HTMLElement, selector: string) => root.querySelector(`${selector} path`)!.getAttribute("d");
    const circle = (cut: string) => pathOf(cutEl(cut), "[data-icon=\"check_circle\"]");
    const snap = (cut: string) => pathOf(canvasElement.querySelector<HTMLElement>("[data-snapped]")!, `[data-snap="${cut}"]`);
    const sized = (size: string) => canvasElement.querySelector<HTMLElement>(`[data-size="${size}"] svg`)!;

    await step("every cut holds every name, drawn and hidden from assistive technology", () => {
      for (const [cut] of CUTS) {
        expect(cutEl(cut).querySelectorAll("[data-icon]"), cut).toHaveLength(MATERIAL_ICON_NAMES.length);
        for (const name of MATERIAL_ICON_NAMES) {
          const svg = cutEl(cut).querySelector(`[data-icon="${name}"] svg`);
          expect(svg, `${cut} ${name}`).not.toBeNull();
          expect(svg!.children.length, `${cut} ${name}`).toBeGreaterThan(0);
          expect(svg!.getAttribute("aria-hidden"), `${cut} ${name}`).toBe("true");
        }
      }
    });

    await step("the cut is the one asked for, and the two combos without a cut snap", () => {
      const paths = CUTS.map(([cut]) => circle(cut));
      expect(new Set(paths).size).toBe(4);
      expect(snap("w500-fill")).toBe(circle("w500-fill"));
      expect(snap("w600")).toBe(circle("w600"));
    });

    await step("the size names are --icon-sm|md|lg|xl, 22px by default", () => {
      expect(SIZES.map(size => getComputedStyle(sized(size)).fontSize)).toEqual(["18px", "22px", "28px", "30px"]);
      expect(getComputedStyle(sized("default")).fontSize).toBe("22px");
    });

    await step("the icon takes its cell's colour", () => {
      for (const cellEl of canvasElement.querySelectorAll<HTMLElement>("[data-icon], [data-snap], [data-size]")) {
        const svg = cellEl.querySelector("svg")!;
        expect(getComputedStyle(svg).color).toBe(getComputedStyle(cellEl).color);
        // Drawn with `currentColor`, so no glyph hard-codes a colour of its own.
        expect(svg.outerHTML).toContain("currentColor");
      }
    });

    await step("nothing is fetched: no image, no use, no link in an icon", () => {
      expect(canvasElement.querySelectorAll("img")).toHaveLength(0);
      for (const svg of canvasElement.querySelectorAll("svg")) {
        expect(svg.querySelectorAll("use, image, [href]")).toHaveLength(0);
      }
    });

    await step("quiet when reduced", () => expectQuietAfter(async () => {
      const first = canvasElement.querySelector<HTMLElement>("[data-icon]")!;
      await userEvent.hover(first);
      await userEvent.unhover(first);
    }));
  },
};
