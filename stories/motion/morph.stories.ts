import type { Meta, StoryObj } from "@storybook/vue3-vite";
import { expect, waitFor, within } from "storybook/test";
import { defineComponent, h, ref } from "vue";
import { resolved } from "../support/html";
import { expectQuietWhenReduced } from "../support/motion-checks";
import { block, page, readout, reset, section } from "../support/motion-kit";
import { clickReplay, live, withMotion } from "../support/motion-play";
import { useMotionStory, withMotionSurface } from "../support/motion-surface";

// The morph (R25, #305): an icon that turns into another, the ring a selected card takes, and the two digit sweeps
// the timer plays on start and on pause. Blocks only; the digits are textless here.

const Morph = defineComponent({
  name: "MorphStory",
  setup() {
    const { m } = useMotionStory();
    const icon = ref<HTMLElement | null>(null);
    const ring = ref<HTMLElement | null>(null);
    const waveDigits = Array.from({ length: 6 }, () => ref<HTMLElement | null>(null));
    const droopDigits = Array.from({ length: 6 }, () => ref<HTMLElement | null>(null));
    const els = (refs: typeof waveDigits) => refs.map(r => r.value);

    const morph = () => {
      reset(icon.value);
      m.morph(icon.value);
    };
    const ringIn = () => {
      reset(ring.value);
      m.ringIn(ring.value);
    };
    const wave = () => {
      reset(...els(waveDigits));
      m.wave(els(waveDigits).filter((el): el is HTMLElement => !!el));
    };
    const droop = () => {
      reset(...els(droopDigits));
      m.droop(els(droopDigits).filter((el): el is HTMLElement => !!el));
    };

    const digit = (r: (typeof waveDigits)[number]) => block({
      ref: r,
      w: 24,
      h: 32,
      attrs: { "data-digit": "" },
    });

    return () => page("Morph", {
      replay: () => {
        morph();
        ringIn();
        wave();
        droop();
      },
    }, [
      section({
        id: "morph",
        title: "Morph",
        moment: "R25",
        replay: morph,
      }, [
        block({
          ref: icon,
          w: 32,
          h: 32,
          round: true,
          tone: "accent",
        }),
        readout("dialect", () => document.body.dataset.dialect ?? "workspace"),
        readout("gain", () => resolved("--motion-gain")),
      ]),
      section({
        id: "ring",
        title: "Ring",
        moment: "R25",
        replay: ringIn,
      }, [
        // The ring is a child of the card and fills it, so it comes in with the card's own corners.
        block({
          w: 120,
          h: 56,
          style: "position:relative",
        }, [
          h("div", {
            ref: ring,
            style: "position:absolute;inset:0;box-sizing:border-box;border:4px solid var(--color-accent);border-radius:var(--radius-md)",
          }),
        ]),
      ]),
      section({
        id: "wave",
        title: "Wave (start)",
        moment: "R25",
        replay: wave,
      }, waveDigits.map(digit)),
      section({
        id: "droop",
        title: "Droop (pause)",
        moment: "R25",
        replay: droop,
      }, droopDigits.map(digit)),
    ]);
  },
});

const meta = {
  title: "Motion/Morph",
  decorators: [withMotionSurface],
  parameters: { motion: {} },
  render: () => Morph,
} satisfies Meta;

export default meta;

export const Default: StoryObj<typeof meta> = {
  async play({ canvasElement, step }) {
    // The story mounts one tick after the surface has read its tokens, so the first element has to be waited for.
    await within(canvasElement).findByRole("button", { name: "Replay" });

    await step("each section animates its own blocks", () => withMotion("full", async () => {
      for (const [id, count] of [
        ["morph", 1],
        ["ring", 1],
        ["wave", 6],
        ["droop", 6],
      ] as const) {
        await clickReplay(canvasElement, id);
        await waitFor(() => expect(live().length).toBe(count));
        await waitFor(() => expect(live()).toHaveLength(0), { timeout: 4000 });
      }
    }));

    await step("a replay creates no animation when reduced", () => expectQuietWhenReduced(canvasElement));
  },
};
