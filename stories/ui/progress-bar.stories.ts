import type { Meta, StoryObj } from "@storybook/vue3-vite";
import type { VNode } from "vue";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { h, ref } from "vue";
import UiProgressBar from "../../app/components/ui/progress-bar.vue";
import { expectQuietAfter, finish } from "../support/component-checks";
import { chip, resolved } from "../support/html";
import { animations, frames, runningLoops, withMotion } from "../support/motion-play";
import { withMotionSurface } from "../support/motion-surface";
import { page } from "../support/ui-kit";

// The app's own UiProgressBar (#322): the handoff's `progress-bar` (03-components.md), the track of a Winnie's summary
// and of a shared card. R29 (the fill's spring) and A07 (the stripes' loop) run on two elements, so the stories prove
// that they never disturb each other. No screen uses it yet; R3 places it. The label is a story string: the real copy
// is R3's. The buttons of the stateful stories are story chrome, not product copy.
//
// The picture of a running bar: Playwright's screenshot cancels an infinite animation, so the stripes sit at their
// first keyframe, `translateX(0)`, which is the layer's own resting place (as the timer's gloss does). A finite
// animation must have finished before the shot, so every play that starts one ends after `anim.finished`. `Running`
// ends with the loop on and holds; `RunningChanging` ends with it cleared, as a shot with it on did not.

const LABEL = "Won Challenges";

// The rows of the handoff's frames, with the percent written out: the numbers come from the frames, never from the
// component's own rounding.
interface Row {
  id: string;
  won: number;
  total: number;
  percent: number;
}

const ROWS: Row[] = [
  {
    id: "0-of-0",
    won: 0,
    total: 0,
    percent: 0,
  },
  {
    id: "0-of-8",
    won: 0,
    total: 8,
    percent: 0,
  },
  {
    id: "1-of-50",
    won: 1,
    total: 50,
    percent: 2,
  },
  {
    id: "3-of-8",
    won: 3,
    total: 8,
    percent: 38,
  },
  {
    id: "1-of-1",
    won: 1,
    total: 1,
    percent: 100,
  },
  {
    id: "8-of-8",
    won: 8,
    total: 8,
    percent: 100,
  },
  {
    id: "50-of-50",
    won: 50,
    total: 50,
    percent: 100,
  },
];

// One bar on a card, with a chip that names what it shows. The card's width is the bar's: the parent sizes the bar.
function card(id: string, text: string, width: number, bar: VNode) {
  return h("div", {
    "data-case": id,
    "style": "display:flex;flex-direction:column;align-items:flex-start;gap:8px;padding:12px;"
      + "background:var(--color-surface);border-radius:var(--radius-md)",
  }, [
    h("div", {
      innerHTML: chip(text),
    }),
    h("div", { style: `width:${width}px` }, [bar]),
  ]);
}

// Story chrome: a native button on a surface of its own, so axe finds its contrast.
function control(text: string, onClick: () => void, id: string) {
  return h("button", {
    "type": "button",
    "data-control": id,
    "style": "font:800 var(--text-sm)/1.3 var(--font-display);padding:6px 12px;border-radius:var(--radius-sm);"
      + "border:2px solid var(--color-text);background:var(--color-surface);color:var(--color-text);cursor:pointer",
    "onClick": onClick,
  }, text);
}

const meta = {
  title: "UI/Progress bar",
  decorators: [withMotionSurface],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

async function findBars(canvasElement: HTMLElement, count: number) {
  const bars = await within(canvasElement).findAllByRole("progressbar", { name: LABEL });
  await waitFor(() => expect(canvasElement.querySelectorAll("[role=progressbar]")).toHaveLength(count));
  return bars;
}

function partsOf(bar: HTMLElement) {
  return {
    fill: bar.querySelector<HTMLElement>("[data-fill]")!,
    clip: bar.querySelector<HTMLElement>("[data-clip]")!,
    stripes: bar.querySelector<HTMLElement>("[data-stripes]")!,
  };
}

// The same fact in pixels, for the tolerance the brief names (half a pixel).
function offsetPixels(bar: HTMLElement) {
  const { fill, clip } = partsOf(bar);
  return fill.getBoundingClientRect().left - clip.getBoundingClientRect().left;
}

function expectOffset(bar: HTMLElement, percent: number) {
  const { clip } = partsOf(bar);
  const want = (percent - 100) / 100 * clip.getBoundingClientRect().width;
  expect(Math.abs(offsetPixels(bar) - want)).toBeLessThan(0.5);
}

// Stops every stripes loop at its first frame, `translateX(0)`: the layer's own resting place. Local to this file, as
// `freezeSpinners` is for a spinner (the shared helper is not widened for it).
function freezeStripes(canvasElement: HTMLElement) {
  for (const stripes of canvasElement.querySelectorAll<HTMLElement>("[data-stripes]")) {
    for (const a of stripes.getAnimations()) {
      a.pause();
      a.currentTime = 0;
    }
  }
}

const seconds = (token: string) => Number.parseFloat(resolved(token));

export const Values: Story = {
  render: () => () => page(
    "Progress bar values",
    h("div", {
      style: "display:flex;flex-wrap:wrap;gap:16px;align-items:flex-start",
    }, [
      h("div", { style: "display:flex;flex-direction:column;gap:12px" }, ROWS.map(row => card(
        row.id,
        `${row.won} / ${row.total}`,
        360,
        h(UiProgressBar, {
          won: row.won,
          total: row.total,
          label: LABEL,
        }),
      ))),
      h("div", { style: "display:flex;flex-direction:column;gap:12px" }, [
        card("3-of-8-220", "3 / 8 at 220px", 220, h(UiProgressBar, {
          won: 3,
          total: 8,
          label: LABEL,
        })),
        card("3-of-8-160", "3 / 8 at 160px", 160, h(UiProgressBar, {
          won: 3,
          total: 8,
          label: LABEL,
        })),
      ]),
    ]),
  ),
  async play({ canvasElement }) {
    const bars = await findBars(canvasElement, ROWS.length + 2);
    // First: nothing started by a first render, in any variant.
    await expectQuietAfter(async () => {});

    await withMotion("full", async () => {
      for (const row of ROWS) {
        const bar = canvasElement.querySelector<HTMLElement>(`[data-case="${row.id}"] [role=progressbar]`)!;
        expect(bar, row.id).toHaveAttribute("aria-label", LABEL);
        expect(bar, row.id).toHaveAttribute("aria-valuemin", "0");
        expect(bar, row.id).toHaveAttribute("aria-valuemax", String(row.total));
        expect(bar, row.id).toHaveAttribute("aria-valuenow", String(row.won));
        expect(Math.abs(bar.getBoundingClientRect().height - 28), row.id).toBeLessThan(0.5);

        const { fill, clip } = partsOf(bar);
        // It moves by `translateX`, never by width: as wide as its clip, and no `width` in its style.
        expect(fill.getBoundingClientRect().width, row.id).toBeGreaterThanOrEqual(clip.getBoundingClientRect().width - 0.5);
        expect(fill.style.width, row.id).toBe("");
        expectOffset(bar, row.percent);
      }
      for (const bar of bars)
        expect(bar.getAnimations({ subtree: true })).toHaveLength(0);
      expect(animations()).toHaveLength(0);

      // The narrower bars keep the same share.
      for (const id of ["3-of-8-220", "3-of-8-160"]) {
        const bar = canvasElement.querySelector<HTMLElement>(`[data-case="${id}"] [role=progressbar]`)!;
        expectOffset(bar, 38);
      }
    });
  },
};

export const Running: Story = {
  render: () => {
    const running = ref(true);
    return () => page(
      "Progress bar running",
      control("Toggle running", () => {
        running.value = !running.value;
      }, "toggle"),
      h("div", { style: "display:flex;flex-direction:column;gap:12px" }, [
        ["0-of-8", 0, 8],
        ["3-of-8", 3, 8],
        ["8-of-8", 8, 8],
        ["50-of-50", 50, 50],
        ["0-of-0", 0, 0],
      ].map(([id, won, total]) => card(
        id as string,
        `running ${won} / ${total}`,
        360,
        h(UiProgressBar, {
          won: won as number,
          total: total as number,
          label: LABEL,
          running: running.value,
        }),
      ))),
    );
  },
  async play({ canvasElement, step }) {
    const bars = await findBars(canvasElement, 5);

    await step("full motion: one infinite linear loop on each stripes layer, none on the fill", () => withMotion("full", async () => {
      for (const bar of bars) {
        const { fill, stripes } = partsOf(bar);
        await waitFor(async () => expect(await runningLoops(stripes)).toHaveLength(1), { timeout: 4000 });
        const loop = stripes.getAnimations()[0]!;
        const effect = loop.effect as KeyframeEffect;
        expect(effect.target).toBe(stripes);
        const timing = effect.getTiming();
        expect(timing.easing).toBe("linear");
        expect(timing.duration).toBe(seconds("--dur-breathe"));
        expect(effect.getKeyframes().at(-1)!.transform).toBe("translateX(28.28px)");
        expect(fill.getAnimations()).toHaveLength(0);

        // It moves: the layer's left edge is not where it was.
        const before = stripes.getBoundingClientRect().left;
        await waitFor(() => expect(stripes.getBoundingClientRect().left).not.toBe(before));
      }
    }));

    await step("reduced motion: every loop is cancelled, and it comes back with the preference", async () => {
      await expectQuietAfter(async () => {});
      await withMotion("full", async () => {
        for (const bar of bars)
          await waitFor(async () => expect(await runningLoops(partsOf(bar).stripes)).toHaveLength(1), { timeout: 4000 });
      });
    });

    await step("the toggle clears the loop, and sets it again", () => withMotion("full", async () => {
      const toggle = canvasElement.querySelector<HTMLButtonElement>("[data-control=toggle]")!;
      const offsets = bars.map(offsetPixels);

      await userEvent.click(toggle);
      for (const [i, bar] of bars.entries()) {
        const { stripes } = partsOf(bar);
        await waitFor(() => expect(stripes.getAnimations()).toHaveLength(0));
        expect(getComputedStyle(stripes).transform).toBe("none");
        expect(Math.abs(offsetPixels(bar) - offsets[i]!)).toBeLessThan(0.5);
      }

      await userEvent.click(toggle);
      for (const bar of bars)
        await waitFor(async () => expect(await runningLoops(partsOf(bar).stripes)).toHaveLength(1), { timeout: 4000 });

      // The loop runs for the plays above; the picture needs it still. Playwright's screenshot is meant to cancel an
      // infinite animation, but CI caught the stripes a pixel off in some runs, so the loop is paused at its first frame.
      freezeStripes(canvasElement);
    }));

    await finish(canvasElement);
  },
};

// The stateful stories share a shape: a bar, a readout and the story-only buttons.
function changingPage(title: string, state: { won: number; total: number; running: boolean }, withTotal: boolean) {
  const won = ref(state.won);
  const total = ref(state.total);
  const running = ref(state.running);
  return () => page(
    title,
    h("div", { style: "display:flex;flex-wrap:wrap;gap:8px" }, [
      // Only where the loop runs: the play clears it last, so the shot has no animation in flight (see the header).
      ...state.running
        ? [
            control("Toggle running", () => {
              running.value = !running.value;
            }, "toggle"),
          ]
        : [],
      control("Win one", () => {
        won.value = Math.min(won.value + 1, total.value);
      }, "win"),
      control("Un-win one", () => {
        won.value = Math.max(won.value - 1, 0);
      }, "unwin"),
      ...withTotal
        ? [
            control("Add Challenge", () => {
              total.value += 1;
            }, "add"),
            control("Remove Challenge", () => {
              total.value = Math.max(total.value - 1, won.value);
            }, "remove"),
          ]
        : [],
    ]),
    card("bar", `${won.value} / ${total.value}`, 360, h(UiProgressBar, {
      won: won.value,
      total: total.value,
      label: LABEL,
      running: running.value,
    })),
  );
}

function control$(canvasElement: HTMLElement, id: string) {
  return canvasElement.querySelector<HTMLButtonElement>(`[data-control=${id}]`)!;
}

function barOf(canvasElement: HTMLElement) {
  return canvasElement.querySelector<HTMLElement>("[data-case=bar] [role=progressbar]")!;
}

// A click that must start R29 on the fill: waits for the one animation, checks its recipe and lets it finish.
async function clickAndLand(canvasElement: HTMLElement, id: string, from: number, to: number) {
  const bar = barOf(canvasElement);
  const { fill } = partsOf(bar);
  await userEvent.click(control$(canvasElement, id));
  await waitFor(() => expect(fill.getAnimations()).toHaveLength(1));
  const anim = fill.getAnimations()[0]!;
  const effect = anim.effect as KeyframeEffect;
  expect(effect.target).toBe(fill);
  const keys = effect.getKeyframes();
  expect(keys.map(k => k.transform)).toEqual([`translateX(${from - 100}%)`, `translateX(${to - 100}%)`]);
  expect(effect.getTiming().duration).toBe(seconds("--dur-land"));
  await anim.finished;
  await frames();
  expect(fill.getAnimations()).toHaveLength(0);
  expectOffset(bar, to);
}

export const Changing: Story = {
  render: () => changingPage("Progress bar changing", {
    won: 3,
    total: 8,
    running: false,
  }, true),
  async play({ canvasElement, step }) {
    const bar = await within(canvasElement).findByRole("progressbar", { name: LABEL });
    await waitFor(() => expect(control$(canvasElement, "win")).toBeTruthy());

    // Reduced first: a finished full-motion animation would stay in the document and fail the quiet check.
    await step("reduced: no animation, the fill lands at once", async () => {
      await expectQuietAfter(async () => {
        await userEvent.click(control$(canvasElement, "win"));
        await waitFor(() => expect(bar).toHaveAttribute("aria-valuenow", "4"));
      });
      expectOffset(bar, 50);
      await expectQuietAfter(async () => {
        await userEvent.click(control$(canvasElement, "unwin"));
        await waitFor(() => expect(bar).toHaveAttribute("aria-valuenow", "3"));
      });
      expectOffset(bar, 38);
    });

    await step("full motion: the spring runs on the fill, backwards too", () => withMotion("full", async () => {
      await clickAndLand(canvasElement, "win", 38, 50);
      expect(bar).toHaveAttribute("aria-valuenow", "4");
      await clickAndLand(canvasElement, "unwin", 50, 38);
      expect(bar).toHaveAttribute("aria-valuenow", "3");

      // A total that changes alone moves the fill at once, with no animation: 38 to 33 and back.
      const { fill } = partsOf(bar);
      await userEvent.click(control$(canvasElement, "add"));
      await waitFor(() => expect(bar).toHaveAttribute("aria-valuemax", "9"));
      await frames(3);
      expect(fill.getAnimations()).toHaveLength(0);
      expectOffset(bar, 33);
      await userEvent.click(control$(canvasElement, "remove"));
      await waitFor(() => expect(bar).toHaveAttribute("aria-valuemax", "8"));
      await frames(3);
      expect(fill.getAnimations()).toHaveLength(0);
      expectOffset(bar, 38);

      // To full, one win at a time: 38, 50, 63, 75, 88, 100.
      const steps = [38, 50, 63, 75, 88, 100];
      for (let i = 1; i < steps.length; i++)
        await clickAndLand(canvasElement, "win", steps[i - 1]!, steps[i]!);
      expect(bar).toHaveAttribute("aria-valuenow", "8");
      expectOffset(bar, 100);
    }));

    for (const id of ["win", "unwin", "add", "remove"])
      control$(canvasElement, id).blur();
  },
};

export const RunningChanging: Story = {
  render: () => changingPage("Progress bar running and changing", {
    won: 3,
    total: 8,
    running: true,
  }, false),
  async play({ canvasElement }) {
    const bar = await within(canvasElement).findByRole("progressbar", { name: LABEL });
    await waitFor(() => expect(control$(canvasElement, "win")).toBeTruthy());

    await withMotion("full", async () => {
      const { fill, stripes } = partsOf(bar);
      await waitFor(() => expect(stripes.getAnimations()).toHaveLength(1), { timeout: 4000 });
      const loop = stripes.getAnimations()[0]!;

      await clickAndLand(canvasElement, "win", 38, 50);

      // The spring on the fill did not touch the loop on the stripes: the same animation, still running.
      expect(stripes.getAnimations()).toHaveLength(1);
      expect(stripes.getAnimations()[0]).toBe(loop);
      expect(loop.playState).toBe("running");
      expect(fill.getAnimations()).toHaveLength(0);
      expectOffset(bar, 50);

      // The loop is cleared last: two green compares of a shot with the loop still running did not hold (a few pixels
      // at the buttons' corners differ, as the compositor rasters with an animation in flight).
      await userEvent.click(control$(canvasElement, "toggle"));
      await waitFor(() => expect(stripes.getAnimations()).toHaveLength(0));
      await frames();
    });

    for (const id of ["win", "toggle"])
      control$(canvasElement, id).blur();
  },
};

export const Fifty: Story = {
  render: () => changingPage("Progress bar at fifty", {
    won: 49,
    total: 50,
    running: false,
  }, false),
  async play({ canvasElement, step }) {
    const bar = await within(canvasElement).findByRole("progressbar", { name: LABEL });
    await waitFor(() => expect(control$(canvasElement, "win")).toBeTruthy());

    await step("reduced: the last win lands at once", async () => {
      await expectQuietAfter(async () => {
        await userEvent.click(control$(canvasElement, "win"));
        await waitFor(() => expect(bar).toHaveAttribute("aria-valuenow", "50"));
      });
      expectOffset(bar, 100);
      await expectQuietAfter(async () => {
        await userEvent.click(control$(canvasElement, "unwin"));
        await waitFor(() => expect(bar).toHaveAttribute("aria-valuenow", "49"));
      });
      expectOffset(bar, 98);
    });

    await step("full motion: 98 to 100 is one small spring", () => withMotion("full", async () => {
      await clickAndLand(canvasElement, "win", 98, 100);
      await clickAndLand(canvasElement, "unwin", 100, 98);
      await clickAndLand(canvasElement, "win", 98, 100);
      expect(bar).toHaveAttribute("aria-valuenow", "50");
    }));

    control$(canvasElement, "win").blur();
    control$(canvasElement, "unwin").blur();
  },
};
