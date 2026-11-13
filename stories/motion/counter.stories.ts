import type { Meta, StoryObj } from "@storybook/vue3-vite";
import { expect, waitFor, within } from "storybook/test";
import { defineComponent, ref } from "vue";
import { resolved } from "../support/html";
import { expectQuietWhenReduced } from "../support/motion-checks";
import { block, page, readout, reset, section } from "../support/motion-kit";
import { clickReplay, live, particleCount, withMotion } from "../support/motion-play";
import { useMotionStory, withMotionSurface } from "../support/motion-surface";

// The counter (R23, R24, #305): a step rolls the digit up or down, and a full counter wells over with a burst on the
// page and without one in the Overlay.

const Counter = defineComponent({
  name: "CounterStory",
  setup() {
    const { m } = useMotionStory();
    const up = ref<HTMLElement | null>(null);
    const down = ref<HTMLElement | null>(null);
    const well = ref<HTMLElement | null>(null);
    const wellOv = ref<HTMLElement | null>(null);

    const step = () => {
      reset(up.value, down.value);
      m.roll(up.value, 1);
      m.roll(down.value, -1);
    };
    const full = () => {
      reset(well.value, wellOv.value);
      m.full(well.value);
      m.full(wellOv.value, true);
    };

    return () => page("Counter", {
      replay: () => {
        step();
        full();
      },
    }, [
      section({
        id: "step",
        title: "Step",
        moment: "R23",
        replay: step,
      }, [
        block({ ref: up, w: 24, h: 32 }),
        readout("up", () => "+ rolls up"),
        block({ ref: down, w: 24, h: 32 }),
        readout("down", () => "- rolls down"),
        readout("dialect", () => document.body.dataset.dialect ?? "workspace"),
        readout("gain", () => resolved("--motion-gain")),
      ]),
      section({
        id: "full",
        title: "Full",
        moment: "R24",
        replay: full,
      }, [
        block({
          ref: well,
          w: 120,
          h: 48,
          tone: "complete",
        }),
        readout("well", () => "Workspace"),
        block({
          ref: wellOv,
          w: 120,
          h: 48,
          tone: "complete",
        }),
        readout("well", () => "Overlay"),
      ]),
    ]);
  },
});

const meta = {
  title: "Motion/Counter",
  decorators: [withMotionSurface],
  parameters: { motion: {} },
  render: () => Counter,
} satisfies Meta;

export default meta;

export const Default: StoryObj<typeof meta> = {
  async play({ canvasElement, step }) {
    // The story mounts one tick after the surface has read its tokens, so the first element has to be waited for.
    await within(canvasElement).findByRole("button", { name: "Replay" });

    await step("a step rolls two digits", () => withMotion("full", async () => {
      await clickReplay(canvasElement, "step");
      await waitFor(() => expect(live().length).toBe(2));
    }));

    await step("a full counter bursts on the page only, and the layer empties again", () => withMotion("full", async () => {
      await clickReplay(canvasElement, "full");
      // Eight particles from the page well; the Overlay's well makes none.
      await waitFor(() => expect(particleCount()).toBe(8));
      await waitFor(() => expect(particleCount()).toBe(0), { timeout: 4000 });
    }));

    await step("a replay creates no animation when reduced", () => expectQuietWhenReduced(canvasElement));
  },
};
