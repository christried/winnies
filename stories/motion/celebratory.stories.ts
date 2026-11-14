import type { Meta, StoryObj } from "@storybook/vue3-vite";
import { expect, waitFor, within } from "storybook/test";
import { defineComponent, h, ref } from "vue";
import { block, page, readout, reset, section, stage } from "../support/motion-kit";
import { animations, clickReplay, frames, live, particleCount, withMotion } from "../support/motion-play";
import { useMotionStory, withMotionSurface } from "../support/motion-surface";

// The Celebratory moments C01 to C05 and the Responsive hop S02 (handoff 04-motion-and-sound), one section each. The
// calls follow the handoff's playground (Winnies Motion Playground, won and complete): its arguments, not its look.

const elementRef = () => ref<HTMLElement | null>(null);

const Celebratory = defineComponent({
  name: "CelebratoryStory",
  setup() {
    const { m } = useMotionStory();

    const mid = elementRef();
    const face = elementRef();
    const jumper = elementRef();
    const hopper = elementRef();
    const unfurlBanner = elementRef();
    const bar = elementRef();
    const dropBanner = elementRef();

    const replays = {
      won: () => {
        reset(mid.value);
        m.won(mid.value, face.value);
      },
      jump: () => {
        reset(jumper.value);
        m.niniJump(jumper.value);
        m.burst("cel", jumper.value, {
          n: 50,
          size: 30,
          spread: 520,
          cone: 3,
          gravity: 160,
          dur: m.T().D.celebrate,
        });
      },
      // S02 is a Responsive moment: its burst is "resp" while niniHop itself is "cel".
      hop: () => {
        reset(hopper.value);
        m.niniHop(hopper.value);
        m.burst("resp", hopper.value, { n: 16 });
      },
      unfurl: () => {
        reset(unfurlBanner.value);
        m.unfurl(unfurlBanner.value);
      },
      flash: () => {
        reset(bar.value);
        m.flash(bar.value);
      },
      drop: () => {
        reset(dropBanner.value);
        m.bannerDrop(dropBanner.value);
      },
    };
    const all = () => {
      Object.values(replays).forEach(replay => replay());
    };

    return () => page("Celebratory moments", { replay: all }, [
      section({
        id: "won",
        title: "Won",
        moment: "C01",
        replay: replays.won,
      }, [
        block({
          ref: mid,
          w: 240,
          h: 72,
          tone: "won",
          style: "display:flex;align-items:center;padding:0 12px",
        }, [
          block({
            ref: face,
            w: 40,
            h: 40,
            round: true,
            tone: "gold",
          }),
        ]),
      ]),
      section({
        id: "jump",
        title: "Winniebert jump",
        moment: "C02",
        replay: replays.jump,
      }, [
        // Room above the block for the jump and the burst.
        h("div", { style: "padding-top:100px" }, [
          block({
            ref: jumper,
            w: 72,
            h: 110,
            round: true,
            tone: "accent",
          }),
        ]),
        readout("Winniebert", () => "round, 72 x 110"),
      ]),
      section({
        id: "hop",
        title: "Winniebert hop",
        moment: "S02",
        replay: replays.hop,
      }, [
        h("div", { style: "padding-top:40px" }, [
          block({
            ref: hopper,
            w: 72,
            h: 72,
            round: true,
            tone: "accent",
          }),
        ]),
      ]),
      section({
        id: "unfurl",
        title: "Banner unfurl",
        moment: "C02 C05",
        replay: replays.unfurl,
      }, [
        block({
          ref: unfurlBanner,
          w: 360,
          h: 48,
          tone: "complete",
        }),
      ]),
      section({
        id: "flash",
        title: "Progress flash",
        moment: "C02",
        replay: replays.flash,
      }, [
        block({
          ref: bar,
          w: 280,
          h: 20,
          tone: "accent",
        }),
      ]),
      section({
        id: "drop",
        title: "Banner drop",
        moment: "C03",
        replay: replays.drop,
      }, [
        stage({ w: 360, h: 200, clip: true }, [
          block({
            ref: dropBanner,
            w: 280,
            h: 56,
            tone: "complete",
            style: "position:absolute;left:40px;top:72px",
          }),
        ]),
      ]),
    ]);
  },
});

const meta = {
  title: "Motion/Celebratory",
  decorators: [withMotionSurface],
  parameters: { motion: {} },
  render: () => Celebratory,
} satisfies Meta;

export default meta;

export const Default: StoryObj<typeof meta> = {
  async play({ canvasElement, step }) {
    // The story mounts one tick after the surface has read its tokens, so the first element has to be waited for.
    await within(canvasElement).findByRole("button", { name: "Replay" });

    await step("a replay creates no animation when reduced", () => withMotion("reduce", async () => {
      await clickReplay(canvasElement);
      await frames(3);
      expect(animations()).toHaveLength(0);
      expect(particleCount()).toBe(0);
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
  },
};
