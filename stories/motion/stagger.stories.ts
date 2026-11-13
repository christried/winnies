import type { Meta, StoryObj } from "@storybook/vue3-vite";
import { expect, waitFor, within } from "storybook/test";
import { defineComponent, nextTick, onBeforeUnmount, ref } from "vue";
import { resolved } from "../support/html";
import { expectQuietWhenReduced } from "../support/motion-checks";
import { block, page, readout, reset, section, stage } from "../support/motion-kit";
import { animations, clickReplay, live, withMotion } from "../support/motion-play";
import { useMotionStory, withMotionSurface } from "../support/motion-surface";

// Staggers (R26, R27, R29, R30, #305): a list that goes out and comes back in turn, a page that slides, a progress
// bar with its pill, and a skeleton that loads into rows. The shimmer a skeleton loops is the Loops story's.

const rowRefs = () => Array.from({ length: 4 }, () => ref<HTMLElement | null>(null));

const Stagger = defineComponent({
  name: "StaggerStory",
  setup() {
    const { m } = useMotionStory();
    const hero = ref<HTMLElement | null>(null);
    const switchRows = rowRefs();
    const pageEl = ref<HTMLElement | null>(null);
    const fill = ref<HTMLElement | null>(null);
    const pill = ref<HTMLElement | null>(null);
    const skeletonRows = rowRefs();
    const loaded = ref(true);

    // A Replay supersedes the one before it, and an unmounted story stops: the waits below are timers.
    const generations = { switch: 0, page: 0, skeleton: 0 };
    onBeforeUnmount(() => {
      generations.switch++;
      generations.page++;
      generations.skeleton++;
    });
    const nonNull = (refs: typeof switchRows) => refs.map(r => r.value).filter((el): el is HTMLElement => !!el);

    async function switchList() {
      const mine = ++generations.switch;
      reset(hero.value, ...nonNull(switchRows));
      await m.stagOut(nonNull(switchRows));
      if (mine !== generations.switch)
        return;
      m.stagIn(nonNull(switchRows));
      m.jelly("resp", hero.value, 0.4);
    }
    async function pageSlide() {
      const mine = ++generations.page;
      reset(pageEl.value);
      await m.pageOut(pageEl.value, 1);
      if (mine !== generations.page)
        return;
      m.pageIn(pageEl.value, 1);
    }
    function progress() {
      reset(fill.value, pill.value);
      m.progress(fill.value, -75, -25);
      m.pop(pill.value);
    }
    async function skeleton() {
      const mine = ++generations.skeleton;
      reset(...nonNull(skeletonRows));
      loaded.value = false;
      await m.wait(600);
      if (mine !== generations.skeleton)
        return;
      loaded.value = true;
      await nextTick();
      if (mine !== generations.skeleton)
        return;
      m.stagIn(nonNull(skeletonRows));
    }

    return () => page("Stagger", {
      replay: async () => {
        reset(hero.value, pageEl.value, fill.value, pill.value, ...nonNull(switchRows), ...nonNull(skeletonRows));
        await Promise.all([
          switchList(),
          pageSlide(),
          progress(),
          skeleton(),
        ]);
      },
    }, [
      section({
        id: "switch",
        title: "Switch",
        moment: "R26",
        replay: switchList,
      }, [
        block({
          ref: hero,
          w: 280,
          h: 56,
          tone: "accent",
        }),
        ...switchRows.map(r => block({
          ref: r,
          w: 280,
          h: 40,
        })),
        readout("dialect", () => document.body.dataset.dialect ?? "workspace"),
        readout("gain", () => resolved("--motion-gain")),
      ]),
      section({
        id: "page",
        title: "Page",
        moment: "R27",
        replay: pageSlide,
      }, [
        stage({
          clip: true,
          w: 320,
          h: 120,
        }, [
          block({
            ref: pageEl,
            w: 300,
            h: 96,
            style: "margin:12px 10px",
          }),
        ]),
      ]),
      section({
        id: "progress",
        title: "Progress",
        moment: "R29",
        replay: progress,
      }, [
        stage({
          clip: true,
          w: 240,
          h: 20,
        }, [
          // At rest the fill shows three quarters of the track; the recipe fills it up to there from a quarter.
          block({
            ref: fill,
            w: 240,
            h: 20,
            tone: "won",
            style: "transform:translateX(-25%)",
          }),
        ]),
        block({
          ref: pill,
          w: 56,
          h: 24,
          tone: "complete",
        }),
      ]),
      section({
        id: "skeleton",
        title: "Skeleton",
        moment: "R30",
        replay: skeleton,
      }, [
        ...skeletonRows.map(r => block({
          ref: r,
          w: 280,
          h: 32,
          tone: loaded.value ? "surface" : "muted",
        })),
      ]),
    ]);
  },
});

const meta = {
  title: "Motion/Stagger",
  decorators: [withMotionSurface],
  parameters: { motion: {} },
  render: () => Stagger,
} satisfies Meta;

export default meta;

export const Default: StoryObj<typeof meta> = {
  async play({ canvasElement, step }) {
    // The story mounts one tick after the surface has read its tokens, so the first element has to be waited for.
    await within(canvasElement).findByRole("button", { name: "Replay" });
    const shown = (selector: string) => [
      ...canvasElement.querySelectorAll<HTMLElement>(`[data-section="${selector}"] > div:last-child > *`),
    ];

    await step("a list goes out and comes back, and no row stays hidden", () => withMotion("full", async () => {
      await clickReplay(canvasElement, "switch");
      await waitFor(() => expect(live().length).toBeGreaterThanOrEqual(4));
      await waitFor(() => expect(animations()).toHaveLength(0), { timeout: 4000 });
      for (const el of shown("switch"))
        expect(getComputedStyle(el).opacity).toBe("1");
    }));

    await step("a page slides out and in, and is shown again", () => withMotion("full", async () => {
      await clickReplay(canvasElement, "page");
      await waitFor(() => expect(live().length).toBeGreaterThanOrEqual(1));
      await waitFor(() => expect(animations()).toHaveLength(0), { timeout: 4000 });
      for (const el of shown("page")[0]!.children)
        expect(getComputedStyle(el).opacity).toBe("1");
    }));

    await step("progress and pill animate, and the skeleton loads into rows that are shown", () => withMotion("full", async () => {
      await clickReplay(canvasElement, "progress");
      await waitFor(() => expect(live().length).toBe(2));
      await waitFor(() => expect(animations()).toHaveLength(0), { timeout: 4000 });
      await clickReplay(canvasElement, "skeleton");
      await waitFor(() => expect(live().length).toBe(4), { timeout: 3000 });
      await waitFor(() => expect(animations()).toHaveLength(0), { timeout: 4000 });
      for (const el of shown("skeleton"))
        expect(getComputedStyle(el).opacity).toBe("1");
    }));

    await step("a replay creates no animation when reduced", () => expectQuietWhenReduced(canvasElement));
  },
};
