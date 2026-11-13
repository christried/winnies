import type { Meta, StoryObj } from "@storybook/vue3-vite";
import { expect, waitFor, within } from "storybook/test";
import { defineComponent, onBeforeUnmount, ref } from "vue";
import { resolved } from "../support/html";
import { expectQuietWhenReduced } from "../support/motion-checks";
import { block, page, readout, reset, section } from "../support/motion-kit";
import { clickReplay, live, withMotion } from "../support/motion-play";
import { useMotionStory, withMotionSurface } from "../support/motion-surface";

// The press and the jelly (R02, #305): a pressed control sinks onto its lip and springs back, and the generic jelly
// at three amplitudes. Every animation is an engine recipe (ADR-0003).

const Press = defineComponent({
  name: "PressStory",
  setup() {
    const { m } = useMotionStory();
    const button = ref<HTMLElement | null>(null);
    const small = ref<HTMLElement | null>(null);
    const normal = ref<HTMLElement | null>(null);
    const large = ref<HTMLElement | null>(null);
    const pressed = ref(false);

    // A Replay supersedes the one before it: the older one's wait must not release a press the newer one holds.
    let generation = 0;
    onBeforeUnmount(() => generation++);

    async function press() {
      const mine = ++generation;
      reset(button.value);
      pressed.value = true;
      await m.wait(160);
      if (mine !== generation)
        return;
      pressed.value = false;
      m.release(button.value);
    }
    function jelly() {
      reset(small.value, normal.value, large.value);
      m.jelly("resp", small.value, 0.5);
      m.jelly("resp", normal.value, 1);
      m.jelly("resp", large.value, 1.6);
    }

    return () => page("Press", {
      replay: async () => {
        reset(button.value, small.value, normal.value, large.value);
        await Promise.all([
          press(),
          jelly(),
        ]);
      },
    }, [
      section({
        id: "press",
        title: "Press",
        moment: "R02",
        replay: press,
      }, [
        // The static CSS is the resting frame; `pressed` is the sunken one, and the transition between them is a
        // stylesheet one (var(--dur-instant)), which is 0 ms under reduced motion.
        block({
          ref: button,
          w: 120,
          h: 44,
          tone: "accent",
          attrs: { "data-press": "" },
          style: pressed.value
            ? "transform:translateY(var(--lip-sm));box-shadow:0 0 0 var(--color-control-lip);transition:transform var(--dur-instant)"
            : "transform:none;box-shadow:0 var(--lip-sm) 0 var(--color-control-lip);transition:transform var(--dur-instant)",
        }),
        readout("dialect", () => document.body.dataset.dialect ?? "workspace"),
        readout("gain", () => resolved("--motion-gain")),
      ]),
      section({
        id: "jelly",
        title: "Jelly",
        moment: "R02 · generic jelly",
        replay: jelly,
      }, [
        block({
          ref: small,
          w: 64,
          h: 64,
          round: true,
          tone: "won",
        }),
        readout("amplitude", () => "0.5"),
        block({
          ref: normal,
          w: 64,
          h: 64,
          round: true,
          tone: "won",
        }),
        readout("amplitude", () => "1"),
        block({
          ref: large,
          w: 64,
          h: 64,
          round: true,
          tone: "won",
        }),
        readout("amplitude", () => "1.6"),
      ]),
    ]);
  },
});

const meta = {
  title: "Motion/Press",
  decorators: [withMotionSurface],
  parameters: { motion: {} },
  render: () => Press,
} satisfies Meta;

export default meta;

export const Default: StoryObj<typeof meta> = {
  async play({ canvasElement, step }) {
    // The story mounts one tick after the surface has read its tokens, so the first element has to be waited for.
    await within(canvasElement).findByRole("button", { name: "Replay" });

    await step("a replay animates when motion is full", () => withMotion("full", async () => {
      await clickReplay(canvasElement, "jelly");
      await waitFor(() => expect(live().length).toBeGreaterThanOrEqual(3));
      await clickReplay(canvasElement, "press");
      await waitFor(() => expect(live().length).toBeGreaterThan(0));
    }));

    await step("a replay creates no animation when reduced", () => expectQuietWhenReduced(canvasElement));
  },
};
