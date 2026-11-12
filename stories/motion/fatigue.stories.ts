import type { Meta, StoryObj } from "@storybook/vue3-vite";
import type { FatigueStage } from "../../app/utils/motion/types";
import { expect, waitFor, within } from "storybook/test";
import { defineComponent, ref } from "vue";
import { resolved } from "../support/html";
import { expectQuietWhenReduced } from "../support/motion-checks";
import { block, page, readout, reset, section } from "../support/motion-kit";
import { clickReplay, live, particleCount, withMotion } from "../support/motion-play";
import { useMotionStory, withMotionSurface } from "../support/motion-surface";

// Winniebert's fatigue (T07, T08, #305): the six beats a face plays on the tick, one per stage, and the jelly with a
// puff that a change of stage plays. The blocks are textless; the stage names sit in a chip beside them.

const STAGES: readonly FatigueStage[] = [0, 1, 2, 3, 4, 5];

const Fatigue = defineComponent({
  name: "FatigueStory",
  setup() {
    const { m } = useMotionStory();
    const faces = STAGES.map(() => ref<HTMLElement | null>(null));
    const face = ref<HTMLElement | null>(null);

    function beats() {
      reset(...faces.map(f => f.value));
      // The interval is 1000 ms at rate 1, so no stage is clamped or skipped.
      faces.forEach((f, i) => m.beat(f.value, STAGES[i]!));
    }
    function stage() {
      reset(face.value);
      m.stageChange(face.value);
    }

    return () => page("Fatigue", {
      replay: () => {
        beats();
        stage();
      },
    }, [
      section({
        id: "beats",
        title: "Beats",
        moment: "T07",
        replay: beats,
      }, [
        ...faces.map((f, i) => block({
          ref: f,
          w: 56,
          h: 56,
          round: true,
          tone: "gold",
          attrs: { "data-fbeat": i },
        })),
        readout("stages", () => "0 hop, 1 nod, 2 rock, 3 droop, 4 shiver, 5 vibrate"),
        readout("dialect", () => document.body.dataset.dialect ?? "workspace"),
        readout("gain", () => resolved("--motion-gain")),
      ]),
      section({
        id: "stage",
        title: "Stage change",
        moment: "T08",
        replay: stage,
      }, [
        block({
          ref: face,
          w: 56,
          h: 56,
          round: true,
          tone: "gold",
        }),
        readout("recipe", () => "jelly and a 6-particle puff"),
      ]),
    ]);
  },
});

const meta = {
  title: "Motion/Fatigue",
  decorators: [withMotionSurface],
  parameters: { motion: {} },
  render: () => Fatigue,
} satisfies Meta;

export default meta;

export const Default: StoryObj<typeof meta> = {
  async play({ canvasElement, step }) {
    // The story mounts one tick after the surface has read its tokens, so the first element has to be waited for.
    await within(canvasElement).findByRole("button", { name: "Replay" });

    await step("every stage plays its own beat", () => withMotion("full", async () => {
      await clickReplay(canvasElement, "beats");
      await waitFor(() => expect(live().length).toBe(STAGES.length));
    }));

    await step("a change of stage puffs, and the layer empties again", () => withMotion("full", async () => {
      await clickReplay(canvasElement, "stage");
      await waitFor(() => expect(particleCount()).toBe(6));
      await waitFor(() => expect(particleCount()).toBe(0), { timeout: 4000 });
    }));

    await step("a replay creates no animation when reduced", () => expectQuietWhenReduced(canvasElement));
  },
};
