import type { Meta, StoryObj } from "@storybook/vue3-vite";
import { expect, waitFor, within } from "storybook/test";
import { defineComponent, ref } from "vue";
import { resolved } from "../support/html";
import { expectQuietWhenReduced } from "../support/motion-checks";
import { page, readout, section, stage } from "../support/motion-kit";
import { clickReplay, frames, particleCount, withMotion } from "../support/motion-play";
import { useMotionStory, withMotionSurface } from "../support/motion-surface";

// The theme wipe (R28, #305): a circle in the next page colour grows from the button that was pressed, the page swaps
// under it, and the circle fades. The wipe never touches `data-theme`; the stage here stands in for the page, so the
// toolbar's theme stays what the toolbar says.

const SURFACE = "var(--color-surface-raised)";
const ACCENT = "var(--color-accent)";

const Wipe = defineComponent({
  name: "WipeStory",
  setup() {
    const { m, layer } = useMotionStory();
    const swapped = ref(false);

    // The circle starts at the centre of the button that asked for it: the section's own, or the group's.
    function wipe(buttonId: string) {
      const button = document.querySelector<HTMLElement>(`button[data-replay="${buttonId}"]`);
      const r = button?.getBoundingClientRect();
      const next = !swapped.value;
      // The circle is the colour the stage is about to take, as the app's wipe is the next page colour.
      m.themeWipe(layer.value, r
        ? r.left + r.width / 2
        : 0, r
        ? r.top + r.height / 2
        : 0, next ? ACCENT : SURFACE, () => {
        swapped.value = next;
      });
    }

    return () => page("Wipe", {
      replay: () => wipe("all"),
    }, [
      section({
        id: "wipe",
        title: "Wipe",
        moment: "R28",
        replay: () => wipe("wipe"),
      }, [
        stage({
          w: 320,
          h: 160,
          style: `background:${swapped.value ? ACCENT : SURFACE};border:2px solid var(--color-border);border-radius:var(--radius-md)`,
          attrs: {
            "data-swapped": String(swapped.value),
          },
        }, []),
        readout("stage", () => swapped.value ? "accent" : "surface"),
        readout("dialect", () => document.body.dataset.dialect ?? "workspace"),
        readout("gain", () => resolved("--motion-gain")),
      ]),
    ]);
  },
});

const meta = {
  title: "Motion/Wipe",
  decorators: [withMotionSurface],
  parameters: { motion: {} },
  render: () => Wipe,
} satisfies Meta;

export default meta;

export const Default: StoryObj<typeof meta> = {
  async play({ canvasElement, step }) {
    // The story mounts one tick after the surface has read its tokens, so the first element has to be waited for.
    await within(canvasElement).findByRole("button", { name: "Replay" });
    const swapped = () => canvasElement.querySelector<HTMLElement>("[data-swapped]")?.dataset.swapped;

    await step("the wipe grows one circle, swaps the page under it and leaves the layer empty", () => withMotion("full", async () => {
      const before = swapped();
      const theme = document.documentElement.dataset.theme;
      await clickReplay(canvasElement, "wipe");
      await waitFor(() => expect(particleCount()).toBe(1));
      await waitFor(() => expect(particleCount()).toBe(0), { timeout: 4000 });
      expect(swapped()).not.toBe(before);
      expect(document.documentElement.dataset.theme).toBe(theme);
    }));

    await step("when reduced the swap happens at once and no circle is drawn", () => withMotion("reduce", async () => {
      const before = swapped();
      await clickReplay(canvasElement, "wipe");
      await frames(3);
      expect(swapped()).not.toBe(before);
      expect(particleCount()).toBe(0);
    }));

    await step("a replay creates no animation when reduced", () => expectQuietWhenReduced(canvasElement));
  },
};
