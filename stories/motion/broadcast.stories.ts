import type { Meta, StoryObj } from "@storybook/vue3-vite";
import type { Ref, VNodeChild } from "vue";
import { expect, waitFor, within } from "storybook/test";
import { defineComponent, h, ref } from "vue";
import { block, page, reset, section, stage } from "../support/motion-kit";
import { animations, clickReplay, frames, withMotion } from "../support/motion-play";
import { useMotionStory, withMotionSurface } from "../support/motion-surface";

// Broadcast's moments B01 to B07 (handoff 04-motion-and-sound), one section each. Every Replay resets its elements and
// then calls the recipe, as the handoff's playground does (Winnies Motion Playground, B01-B07); the static CSS of an
// element is its recipe's resting frame, so a reduced-motion run shows that frame and nothing moves.

const elementRef = () => ref<HTMLElement | null>(null);

const Broadcast = defineComponent({
  name: "BroadcastStory",
  setup() {
    const { m } = useMotionStory();

    const ring = elementRef();
    const banner = elementRef();
    const content = elementRef();
    const rows = Array.from({ length: 5 }, elementRef); // the Overlay's page size
    const enterCard = elementRef();
    const stamp = elementRef();
    const hopCard = elementRef();

    const rowEls = () => rows.map(r => r.value).filter(el => el !== null);

    const replays = {
      highlight: () => {
        reset(ring.value);
        m.highlight(ring.value);
      },
      banner: async () => {
        reset(banner.value);
        m.bannerIn(banner.value);
        await m.wait(m.T().D.toast + 600);
        await m.bannerOut(banner.value);
      },
      mute: async () => {
        reset(content.value);
        m.mute(content.value, true);
        await m.wait(1400);
        m.mute(content.value, false);
      },
      flip: async () => {
        reset(...rowEls());
        await m.pageFlipOut(rowEls());
        m.pageFlipIn(rowEls());
      },
      card: () => {
        reset(enterCard.value);
        m.cardEnter(enterCard.value);
      },
      stamp: async () => {
        reset(stamp.value);
        m.stampIn(stamp.value);
        await m.wait(m.T().D.cheer);
        await m.stampOut(stamp.value);
      },
      hop: () => {
        reset(hopCard.value);
        m.cardHop(hopCard.value);
      },
    };
    const all = async () => {
      await Promise.all(Object.values(replays).map(replay => replay()));
    };

    const card = (children?: VNodeChild[], style = "", r?: Ref<HTMLElement | null>) =>
      block({ ref: r, w: 240, h: 120, style }, children);

    return () => page("Broadcast moments", { replay: all }, [
      section({
        id: "highlight",
        title: "Highlight ring",
        moment: "B01",
        replay: replays.highlight,
      }, [
        // The ring rests at opacity 1: the reduced end state is "the ring stays".
        card([
          h("div", {
            ref: ring,
            style: "position:absolute;inset:0;box-sizing:border-box;border:4px solid var(--color-highlight-gold);border-radius:var(--radius-md)",
          }),
        ], "position:relative"),
      ]),
      section({
        id: "banner",
        title: "Reconnect banner",
        moment: "B02 B03",
        replay: replays.banner,
      }, [
        stage({ w: 360, h: 64, clip: true }, [
          block({
            ref: banner,
            w: 360,
            h: 64,
            tone: "accent",
            attrs: { "data-banner": "" },
          }),
        ]),
      ]),
      section({
        id: "mute",
        title: "Mute",
        moment: "B02",
        replay: replays.mute,
      }, [
        block({
          ref: content,
          w: 240,
          h: 64,
          tone: "accent",
        }),
      ]),
      section({
        id: "flip",
        title: "Page flip",
        moment: "B04",
        replay: replays.flip,
      }, [
        // rotateX needs a perspective on the parent.
        h("div", { style: "display:flex;flex-direction:column;gap:8px;perspective:600px" }, rows.map(r =>
          block({ ref: r, w: 240, h: 40 }))),
      ]),
      section({
        id: "card",
        title: "Card enter",
        moment: "B07",
        replay: replays.card,
      }, [
        stage({ w: 240, h: 120, clip: true }, [
          card([], "", enterCard),
        ]),
      ]),
      section({
        id: "stamp",
        title: "Won stamp",
        moment: "B05",
        replay: replays.stamp,
      }, [
        // The stamp's CSS is the recipe's last frame.
        card([
          block({
            ref: stamp,
            w: 120,
            h: 56,
            tone: "won",
            style: "position:absolute;left:50%;top:50%;transform:translate(-50%,-50%) rotate(-8deg)",
          }),
        ], "position:relative"),
      ]),
      section({
        id: "hop",
        title: "Card hop",
        moment: "B05",
        replay: replays.hop,
      }, [
        card([], "", hopCard),
      ]),
    ]);
  },
});

const meta = {
  title: "Motion/Broadcast",
  decorators: [withMotionSurface],
  parameters: { motion: {} },
  render: () => Broadcast,
} satisfies Meta;

export default meta;

export const Default: StoryObj<typeof meta> = {
  async play({ canvasElement, step }) {
    // The story mounts one tick after the surface has read its tokens, so the first element has to be waited for.
    await within(canvasElement).findByRole("button", { name: "Replay" });
    const banner = () => canvasElement.querySelector<HTMLElement>("[data-banner]")!;

    await step("a replay creates no animation when reduced", () => withMotion("reduce", async () => {
      await clickReplay(canvasElement);
      await frames(3);
      expect(animations()).toHaveLength(0);
    }));

    await step("a finished fill-forwards animation is not cancelled by reduce", () => withMotion("full", async () => {
      await clickReplay(canvasElement, "banner");
      // bannerIn has no fill and is gone when it ends; bannerOut holds its last frame, so it is the one left.
      await waitFor(() => {
        const held = banner().getAnimations();
        expect(held).toHaveLength(1);
        expect(held[0]!.playState).toBe("finished");
      }, { timeout: 4000 });
      await withMotion("reduce", async () => {
        const held = banner().getAnimations();
        expect(held).toHaveLength(1);
        expect(held[0]!.playState).toBe("finished");
        expect(getComputedStyle(banner()).transform).not.toBe("none");
      });
    }));
  },
};
