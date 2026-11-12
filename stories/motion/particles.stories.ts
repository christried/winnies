import type { Meta, StoryObj } from "@storybook/vue3-vite";
import { expect, waitFor, within } from "storybook/test";
import { defineComponent, ref } from "vue";
import { resolved } from "../support/html";
import { block, page, readout, section } from "../support/motion-kit";
import { animations, clickReplay, frames, live, particleCount, withMotion } from "../support/motion-play";
import { useMotionStory, withMotionSurface } from "../support/motion-surface";

// The particle layer in a real browser (#306): a burst whose count is the toolbar dialect's token, and a rain of twice
// that. Every Replay and every check here goes through the engine's recipes, never `animate()` (ADR-0003).

const Particles = defineComponent({
  name: "ParticlesStory",
  setup() {
    const { m } = useMotionStory();
    const target = ref<HTMLElement | null>(null);

    // No `n`: the count is the token's, so the toolbar's dialect gives each dialect's count.
    const burst = () => m.burst("cel", target.value);
    const rain = () => m.rain("cel");

    return () => page("Particles", {
      replay: () => {
        burst();
        rain();
      },
    }, [
      section({ id: "burst", title: "Burst", replay: burst }, [
        block({
          ref: target,
          w: 72,
          h: 72,
          round: true,
          tone: "won",
        }),
        readout("particles", () => resolved("--particle-count")),
        readout("by dialect", () => "Workspace 24 · Broadcast 28 · Showcase 48 · reduced 0"),
      ]),
      section({ id: "rain", title: "Rain", replay: rain }, [
        readout("rain pieces", () => String(2 * Number(resolved("--particle-count")))),
      ]),
    ]);
  },
});

const meta = {
  title: "Motion/Particles",
  decorators: [withMotionSurface],
  parameters: { motion: {} },
  render: () => Particles,
} satisfies Meta;

export default meta;

export const Default: StoryObj<typeof meta> = {
  async play({ canvasElement, step }) {
    // The story mounts one tick after the surface has read its tokens, so the first element has to be waited for.
    await within(canvasElement).findByRole("button", { name: "Replay" });
    const token = () => Number(resolved("--particle-count"));

    await step("after a burst finishes the layer is empty", () => withMotion("full", async () => {
      await clickReplay(canvasElement, "burst");
      await waitFor(() => expect(particleCount()).toBe(token()));
      expect(token()).toBeGreaterThan(0);
      await waitFor(() => expect(particleCount()).toBe(0), { timeout: 4000 });
    }));

    await step("after rain finishes the layer is empty", () => withMotion("full", async () => {
      await clickReplay(canvasElement, "rain");
      await waitFor(() => expect(particleCount()).toBe(2 * token()));
      // The worst case is about 5.3 s: the longest delay, plus the longest duration.
      await waitFor(() => expect(particleCount()).toBe(0), { timeout: 9000 });
    }));

    await step("reduce cancels running one-shots and empties the layer", () => withMotion("full", async () => {
      await clickReplay(canvasElement);
      await waitFor(() => expect(particleCount()).toBeGreaterThan(0));
      await waitFor(() => expect(live().length).toBeGreaterThan(0));
      await withMotion("reduce", async () => {
        await waitFor(() => expect(live()).toHaveLength(0));
        expect(particleCount()).toBe(0);
      });
    }));

    await step("a replay creates no animation when reduced", () => withMotion("reduce", async () => {
      await clickReplay(canvasElement);
      await frames(3);
      expect(animations()).toHaveLength(0);
      expect(particleCount()).toBe(0);
    }));
  },
};
