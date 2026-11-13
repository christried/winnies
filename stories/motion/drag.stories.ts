import type { Meta, StoryObj } from "@storybook/vue3-vite";
import type { VNode } from "vue";
import { expect, waitFor, within } from "storybook/test";
import { defineComponent, h, onBeforeUnmount, ref } from "vue";
import { resolved } from "../support/html";
import { expectQuietWhenReduced } from "../support/motion-checks";
import { block, page, readout, reset, section } from "../support/motion-kit";
import { animations, clickReplay, live, withMotion } from "../support/motion-play";
import { useMotionStory, withMotionSurface } from "../support/motion-surface";

// Dragging a row (R19 to R22, #305): the pick up, the siblings making room (a stylesheet transition, as the handoff
// has it), the drop and the revert. A row is an outer box that moves and a `data-mid` block that tilts and squashes.

const ROW_W = 280;
const ROW_H = 44;

const Drag = defineComponent({
  name: "DragStory",
  setup() {
    const { m } = useMotionStory();
    const pickMid = ref<HTMLElement | null>(null);
    const dropOuter = ref<HTMLElement | null>(null);
    const dropMid = ref<HTMLElement | null>(null);
    const revertOuter = ref<HTMLElement | null>(null);
    const revertMid = ref<HTMLElement | null>(null);
    const siblings = Array.from({ length: 3 }, () => ref<HTMLElement | null>(null));
    const shifted = ref(false);

    // A Replay supersedes the one before it, and an unmounted story stops: the holds below are timers.
    let pickRun = 0;
    let overRun = 0;
    onBeforeUnmount(() => {
      pickRun++;
      overRun++;
    });

    async function pick() {
      const mine = ++pickRun;
      reset(pickMid.value);
      const a = m.pick(pickMid.value);
      await m.wait(900);
      if (mine !== pickRun)
        return;
      a?.cancel();
      m.drop(pickMid.value);
    }
    async function over() {
      const mine = ++overRun;
      reset(...siblings.map(s => s.value));
      shifted.value = true;
      await m.wait(900);
      if (mine !== overRun)
        return;
      shifted.value = false;
    }
    function drop() {
      reset(dropOuter.value, dropMid.value);
      m.play("resp", dropOuter.value, [
        { transform: "translateY(40px)" },
        { transform: "none" },
      ], {
        duration: m.T().D.travel,
        easing: m.T().E.snappy,
      });
      m.drop(dropMid.value);
    }
    function revert() {
      reset(revertOuter.value, revertMid.value);
      m.revert(revertOuter.value, revertMid.value, 60);
    }

    // A row: the outer box, and the block inside it that carries `data-mid`.
    const row = (outer: typeof dropOuter | null, mid: typeof dropMid): VNode => h("div", {
      ref: outer ?? undefined,
      style: `display:block;position:relative;width:${ROW_W}px;max-width:100%`,
    }, [
      block({
        ref: mid,
        w: ROW_W,
        h: ROW_H,
        attrs: { "data-mid": "" },
        style: "max-width:100%",
      }),
    ]);

    return () => page("Drag", {
      replay: () => {
        reset(pickMid.value, dropOuter.value, dropMid.value, revertOuter.value, revertMid.value, ...siblings.map(s => s.value));
        void pick();
        void over();
        drop();
        revert();
      },
    }, [
      section({
        id: "pick",
        title: "Pick up",
        moment: "R19",
        replay: pick,
      }, [
        row(null, pickMid),
        readout("dialect", () => document.body.dataset.dialect ?? "workspace"),
        readout("gain", () => resolved("--motion-gain")),
      ]),
      section({
        id: "over",
        title: "Over",
        moment: "R20",
        replay: over,
      }, [
        h("div", { style: "display:flex;flex-direction:column;gap:8px;max-width:100%" }, siblings.map(s => block({
          ref: s,
          w: ROW_W,
          h: ROW_H,
          tone: "muted",
          style: `max-width:100%;transition:transform var(--dur-base) var(--spring-snappy);transform:${shifted.value ? "translateY(52px)" : "none"}`,
        }))),
      ]),
      section({
        id: "drop",
        title: "Drop",
        moment: "R21",
        replay: drop,
      }, [
        row(dropOuter, dropMid),
      ]),
      section({
        id: "revert",
        title: "Revert",
        moment: "R22",
        replay: revert,
      }, [
        row(revertOuter, revertMid),
      ]),
    ]);
  },
});

const meta = {
  title: "Motion/Drag",
  decorators: [withMotionSurface],
  parameters: { motion: {} },
  render: () => Drag,
} satisfies Meta;

export default meta;

export const Default: StoryObj<typeof meta> = {
  async play({ canvasElement, step }) {
    // The story mounts one tick after the surface has read its tokens, so the first element has to be waited for.
    await within(canvasElement).findByRole("button", { name: "Replay" });
    const mid = (id: string) => canvasElement.querySelector<HTMLElement>(`[data-section="${id}"] [data-mid]`)!;

    await step("a picked row is put down again, with nothing held", () => withMotion("full", async () => {
      await clickReplay(canvasElement, "pick");
      await waitFor(() => expect(live().length).toBeGreaterThan(0));
      await waitFor(() => expect(animations()).toHaveLength(0), { timeout: 4000 });
      expect(getComputedStyle(mid("pick")).transform).toBe("none");
    }));

    await step("the siblings make room with a transition and close up again", () => withMotion("full", async () => {
      await clickReplay(canvasElement, "over");
      await waitFor(() => expect(animations().some(a => a instanceof CSSTransition)).toBe(true));
      await waitFor(() => expect(animations()).toHaveLength(0), { timeout: 4000 });
    }));

    await step("a drop and a revert settle on their resting place", () => withMotion("full", async () => {
      await clickReplay(canvasElement, "drop");
      await waitFor(() => expect(live().length).toBeGreaterThan(0));
      await waitFor(() => expect(animations()).toHaveLength(0), { timeout: 4000 });
      await clickReplay(canvasElement, "revert");
      await waitFor(() => expect(live().length).toBeGreaterThan(0));
      await waitFor(() => expect(animations()).toHaveLength(0), { timeout: 4000 });
      for (const id of ["drop", "revert"])
        expect(getComputedStyle(mid(id).parentElement!).transform).toBe("none");
    }));

    await step("a replay creates no animation when reduced", () => expectQuietWhenReduced(canvasElement));
  },
};
