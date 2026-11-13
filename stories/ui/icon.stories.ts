import type { Meta, StoryObj } from "@storybook/vue3-vite";
import { expect, userEvent, within } from "storybook/test";
import { h } from "vue";
import UiIcon from "../../app/components/ui/icon.vue";
import { ICONS } from "../../app/utils/icons";
import { expectQuietAfter } from "../support/component-checks";
import { chip, headingCss } from "../support/html";

// The app's own UiIcon in a real browser (#307): every key of ICONS at the default size and at 32. A key added to ICONS
// shows up here without an edit. `UiIcon` imports `Icon` from `#components`; Storybook's stub for it draws the same
// tabler body offline (.storybook/nuxt/components-module.ts).

const SIZES = [16, 32] as const;
const keys = Object.keys(ICONS) as (keyof typeof ICONS)[];

// Text sits on a chip, never straight on the dialect backdrop: axe cannot judge contrast over it.
function cell(key: keyof typeof ICONS, size: number) {
  return h("div", {
    "data-icon": key,
    "style": "display:flex;flex-direction:column;align-items:flex-start;gap:8px;width:120px;padding:8px;"
      + "background:var(--color-surface);color:var(--color-text);border-radius:var(--radius-md)",
  }, [
  // The default size is left to the component's own default.
    h(UiIcon, size === SIZES[0]
      ? { name: key }
      : { name: key, size }),
    h("div", {
      innerHTML: chip(key),
    }),
  ]);
}

function group(size: number) {
  return h("div", {
    "data-size": size,
    "style": "display:flex;flex-direction:column;gap:12px",
  }, [
    h("h2", { style: `${headingCss};font-size:var(--text-xl)` }, `${size}px`),
    h("div", { style: "display:flex;flex-wrap:wrap;gap:16px" }, keys.map(key => cell(key, size))),
  ]);
}

const meta = {
  title: "UI/Icon",
  render: () => () => h("section", {
    "aria-label": "Icon",
    "style": "display:flex;flex-direction:column;gap:24px;padding:24px",
  }, [
    h("h1", { style: `${headingCss};font-size:var(--text-4xl)` }, "Icon"),
    ...SIZES.map(group),
  ]),
} satisfies Meta;

export default meta;

export const Default: StoryObj<typeof meta> = {
  async play({ canvasElement, step }) {
    await within(canvasElement).findByRole("heading", { name: "Icon", level: 1 });
    const small = canvasElement.querySelector<HTMLElement>(`[data-size="${SIZES[0]}"]`)!;
    const large = canvasElement.querySelector<HTMLElement>(`[data-size="${SIZES[1]}"]`)!;

    await step("every key is drawn, hidden from assistive technology", () => {
      for (const group of [small, large]) {
        expect(group.querySelectorAll("[data-icon]")).toHaveLength(keys.length);
        for (const key of keys) {
          const svg = group.querySelector(`[data-icon="${key}"] svg`);
          expect(svg, key).not.toBeNull();
          expect(svg!.children.length, key).toBeGreaterThan(0);
          expect(svg!.getAttribute("aria-hidden"), key).toBe("true");
        }
      }
    });

    await step("the size is the font size, 16px by default", () => {
      expect(getComputedStyle(small.querySelector("svg")!).fontSize).toBe("16px");
      expect(getComputedStyle(large.querySelector("svg")!).fontSize).toBe("32px");
    });

    await step("the icon takes its cell's colour", () => {
      for (const key of keys) {
        const cellEl = large.querySelector<HTMLElement>(`[data-icon="${key}"]`)!;
        const svg = cellEl.querySelector("svg")!;
        expect(getComputedStyle(svg).color, key).toBe(getComputedStyle(cellEl).color);
        // Drawn with `currentColor`, so no glyph hard-codes a colour of its own.
        expect(svg.outerHTML, key).toContain("currentColor");
      }
    });

    await step("quiet when reduced", () => expectQuietAfter(async () => {
      const first = small.querySelector<HTMLElement>("[data-icon]")!;
      await userEvent.hover(first);
      await userEvent.unhover(first);
    }));
  },
};
