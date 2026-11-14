import type { Meta, StoryObj } from "@storybook/vue3-vite";
import type { VNode } from "vue";
import type { TimerState, TimerVariant } from "../../app/utils/total-timer";
import type { TimerStatus } from "../../shared/utils/timer";
import { expect, waitFor, within } from "storybook/test";
import { h } from "vue";
import UiTotalTimer from "../../app/components/ui/total-timer.vue";
import { timerSpokenValue } from "../../app/utils/total-timer";
import { expectQuietAfter } from "../support/component-checks";
import { chip, headingCss } from "../support/html";
import { frames, isLoop, isRunningLoop, runningLoops, withMotion } from "../support/motion-play";
import { FAKE_START, withMotionSurface } from "../support/motion-surface";
import { colourOf } from "../support/ui-kit";

// The app's own UiTotalTimer in a real browser (#320): the Total Timer in the Workspace and the Overlay, and a
// Challenge Timer in a row, in every state and at the edges of the format. The clock is frozen at FAKE_START, so a
// running timer shows the same digits in every run and the baselines are deterministic; the gloss rests outside its
// clip when a screenshot cancels the infinite loop. What moves is in Motion/Total Timer.

// The Overlay's card is 616px wide: the Total Timer's well fills its parent.
const OVERLAY_W = 616;

interface Case {
  /** `data-case`, the play function's handle */
  id: string;
  label: string;
  variant: TimerVariant;
  state: TimerState;
  seconds: number;
  /** What the digits must say: written out, never computed */
  text: string;
  /** The surface a row sits on, by the state it belongs to */
  surface?: string;
}

const ROW_SURFACE: Record<TimerState, string> = {
  notStarted: "var(--color-surface)",
  paused: "var(--color-surface)",
  running: "var(--color-running-surface)",
  complete: "var(--color-won-surface)",
};

function timerOf(c: Case): TimerStatus {
  // A running timer counts from `runningSince`: against a frozen clock it reads exactly `seconds`.
  return c.state === "running"
    ? {
        accumulatedSeconds: 0,
        runningSince: new Date(FAKE_START - c.seconds * 1000).toISOString(),
      }
    : { accumulatedSeconds: c.seconds, runningSince: null };
}

// Text sits on a chip, never straight on the dialect backdrop: axe cannot judge contrast over it. The timer sits on a
// surface of its own, which is the one its state belongs to for a row.
function cell(c: Case): VNode {
  const timer = h(UiTotalTimer, {
    variant: c.variant,
    timer: timerOf(c),
    state: c.state,
  });
  return h("div", {
    "data-case": c.id,
    "style": "display:flex;flex-direction:column;align-items:flex-start;gap:8px;padding:12px;border-radius:var(--radius-md);"
      + `background:${c.variant === "row"
        ? ROW_SURFACE[c.state]
        : "var(--color-surface)"}`,
  }, [
    h("div", {
      innerHTML: chip(c.label),
    }),
    c.variant === "overlay"
      ? h("div", { style: `width:${OVERLAY_W}px` }, [timer])
      : timer,
  ]);
}

function sheet(title: string, cases: Case[]): () => VNode {
  return () => h("section", {
    "aria-label": title,
    "style": "display:flex;flex-direction:column;gap:24px;padding:24px",
  }, [
    h("h1", { style: `${headingCss};font-size:var(--text-4xl)` }, title),
    h("div", { style: "display:flex;flex-wrap:wrap;gap:16px;align-items:flex-start" }, cases.map(cell)),
  ]);
}

// The first case keeps the word `untouched` for its id and its chip: the chip is in the pictures. The state is `notStarted`.
const D = 14 * 3600 + 32 * 60 + 7;

const WORKSPACE: Case[] = [
  {
    id: "untouched",
    label: "untouched",
    variant: "workspace",
    state: "notStarted",
    seconds: 0,
    text: "00:00",
  },
  {
    id: "paused",
    label: "paused",
    variant: "workspace",
    state: "paused",
    seconds: D,
    text: "14:32:07",
  },
  {
    id: "running",
    label: "running",
    variant: "workspace",
    state: "running",
    seconds: D,
    text: "14:32:07",
  },
  {
    id: "complete",
    label: "complete",
    variant: "workspace",
    state: "complete",
    seconds: D,
    text: "14:32:07",
  },
  {
    id: "edge-59-59",
    label: "edge 59:59",
    variant: "workspace",
    state: "paused",
    seconds: 3599,
    text: "59:59",
  },
  {
    id: "edge-1h",
    label: "edge 1:00:00",
    variant: "workspace",
    state: "paused",
    seconds: 3600,
    text: "1:00:00",
  },
  {
    id: "edge-100h",
    label: "edge 100:00:00",
    variant: "workspace",
    state: "paused",
    seconds: 360_000,
    text: "100:00:00",
  },
  // Two texts of one length, whose digits are as unlike as they get.
  {
    id: "wide-a",
    label: "1:11:11",
    variant: "workspace",
    state: "paused",
    seconds: 4271,
    text: "1:11:11",
  },
  {
    id: "wide-b",
    label: "8:08:08",
    variant: "workspace",
    state: "paused",
    seconds: 29_288,
    text: "8:08:08",
  },
];

const OVERLAY: Case[] = [
  {
    id: "untouched",
    label: "untouched",
    variant: "overlay",
    state: "notStarted",
    seconds: 0,
    text: "00:00",
  },
  {
    id: "paused",
    label: "paused",
    variant: "overlay",
    state: "paused",
    seconds: D,
    text: "14:32:07",
  },
  {
    id: "running",
    label: "running",
    variant: "overlay",
    state: "running",
    seconds: D,
    text: "14:32:07",
  },
  {
    id: "complete",
    label: "complete",
    variant: "overlay",
    state: "complete",
    seconds: D,
    text: "14:32:07",
  },
  {
    id: "edge-100h",
    label: "edge 100:00:00",
    variant: "overlay",
    state: "paused",
    seconds: 360_000,
    text: "100:00:00",
  },
];

const ROW: Case[] = [
  {
    id: "untouched",
    label: "untouched",
    variant: "row",
    state: "notStarted",
    seconds: 0,
    text: "00:00",
  },
  {
    id: "paused",
    label: "paused",
    variant: "row",
    state: "paused",
    seconds: 52 * 60 + 40,
    text: "0:52:40",
  },
  {
    id: "running",
    label: "running",
    variant: "row",
    state: "running",
    seconds: 52 * 60 + 40,
    text: "0:52:40",
  },
  {
    id: "complete",
    label: "won",
    variant: "row",
    state: "complete",
    seconds: 52 * 60 + 40,
    text: "0:52:40",
  },
  {
    id: "edge-0",
    label: "edge 0:00:00",
    variant: "row",
    state: "paused",
    seconds: 0,
    text: "0:00:00",
  },
  {
    id: "edge-3h",
    label: "edge 3:12:36",
    variant: "row",
    state: "paused",
    seconds: 3 * 3600 + 12 * 60 + 36,
    text: "3:12:36",
  },
  {
    id: "edge-100h",
    label: "edge 100:00:00",
    variant: "row",
    state: "paused",
    seconds: 360_000,
    text: "100:00:00",
  },
];

const meta = {
  title: "UI/Total Timer",
  decorators: [withMotionSurface],
  // So slow that the clock reads FAKE_START for the whole run.
  parameters: {
    motion: { rate: 0.000001 },
  },
} satisfies Meta;

export default meta;

const SIZE: Record<TimerVariant, string> = { workspace: "66px", overlay: "68px", row: "22px" };
const WELL_H: Partial<Record<TimerVariant, number>> = { workspace: 100, overlay: 96 };
// Digit and colon slot widths in em: a row's are slightly tighter in the prototype.
const SLOT_EM: Record<TimerVariant, { digit: number; colon: number }> = {
  workspace: { digit: 0.7, colon: 0.36 },
  overlay: { digit: 0.7, colon: 0.36 },
  row: { digit: 0.66, colon: 0.34 },
};

const INK: Record<TimerState, string> = {
  notStarted: "--color-text-muted",
  paused: "--color-text",
  running: "--color-running-text",
  complete: "--color-won-text",
};

const DISC: Record<TimerState, string> = {
  notStarted: "--color-control",
  paused: "--color-control",
  running: "--color-accent",
  complete: "--color-complete",
};

function play(cases: Case[]): NonNullable<StoryObj<typeof meta>["play"]> {
  return async ({ canvasElement, step }) => {
    // The decorator mounts the story one tick late.
    const timers = await within(canvasElement).findAllByRole("timer");
    expect(timers).toHaveLength(cases.length);
    const timerOf = (c: Case) => canvasElement.querySelector<HTMLElement>(`[data-case="${c.id}"] [role="timer"]`)!;
    const slotsOf = (el: HTMLElement) => [
      ...el.querySelectorAll<HTMLElement>("[data-digits] [data-pos]"),
    ];
    const slotWidth = (el: HTMLElement) => slotsOf(el).reduce((sum, s) => sum + s.getBoundingClientRect().width, 0);

    // Before any full-motion step: a loop the page starts for itself is cancelled by the preference, and nothing else
    // may be running.
    await step("quiet when reduced", () => expectQuietAfter(async () => {
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    }));

    await step("every timer is role=timer with its static name, aria-hidden digits and a spoken value", () => {
      for (const c of cases) {
        const el = timerOf(c);
        expect(el.getAttribute("aria-label"), c.id).toBe(c.variant === "row"
          ? "Challenge Timer"
          : "Total Timer");
        const digits = el.querySelector("[data-digits]")!;
        expect(digits.getAttribute("aria-hidden"), c.id).toBe("true");
        expect(digits.textContent, c.id).toBe(c.text);
        // The last child is the visually hidden text.
        expect(el.lastElementChild!.textContent, c.id).toBe(timerSpokenValue(c.seconds, c.state, c.variant));
      }
    });

    await step("sizes: 66, 68 and 22px, in wells 100 and 96px tall", () => {
      for (const c of cases) {
        const el = timerOf(c);
        expect(getComputedStyle(el).fontSize, c.id).toBe(SIZE[c.variant]);
        const wellH = WELL_H[c.variant];
        if (wellH)
          expect(el.getBoundingClientRect().height, c.id).toBeCloseTo(wellH, 0);
      }
    });

    await step("fixed slots: equal-length texts have equal widths, and a digit and a colon have their own em", () => {
      for (const c of cases) {
        const el = timerOf(c);
        const px = Number.parseFloat(getComputedStyle(el).fontSize);
        const { digit, colon } = SLOT_EM[c.variant];
        for (const slot of slotsOf(el)) {
          const sep = slot.textContent === ":";
          expect(slot.getBoundingClientRect().width, `${c.id} pos ${slot.dataset.pos}`).toBeCloseTo((sep
            ? colon
            : digit) * px, 0);
        }
        // Every slot sits inside the well, nine of them included: nothing is squeezed or pushed out.
        const well = el.getBoundingClientRect();
        for (const slot of slotsOf(el)) {
          const r = slot.getBoundingClientRect();
          expect(r.left, `${c.id} pos ${slot.dataset.pos}`).toBeGreaterThanOrEqual(well.left - 0.5);
          expect(r.right, `${c.id} pos ${slot.dataset.pos}`).toBeLessThanOrEqual(well.right + 0.5);
        }
      }
      for (const a of cases) {
        for (const b of cases) {
          if (a.text.length === b.text.length)
            expect(slotWidth(timerOf(a)), `${a.id} against ${b.id}`).toBeCloseTo(slotWidth(timerOf(b)), 1);
        }
      }
    });

    await step("ink: each state has its colour, and a colon is muted in every state", () => {
      const muted = colourOf("--color-text-muted");
      for (const c of cases) {
        const el = timerOf(c);
        const digit = slotsOf(el).find(s => s.textContent !== ":")!;
        expect(getComputedStyle(digit).color, c.id).toBe(colourOf(INK[c.state]));
        for (const colon of slotsOf(el).filter(s => s.textContent === ":"))
          expect(getComputedStyle(colon).color, c.id).toBe(muted);
      }
    });

    if (cases.some(c => c.variant === "overlay")) {
      await step("the Overlay's disc has its state's fill, and a 34px glyph", () => {
        for (const c of cases) {
          const disc = timerOf(c).querySelector<HTMLElement>("[data-disc]")!;
          expect(disc.getAttribute("aria-hidden"), c.id).toBe("true");
          expect(getComputedStyle(disc).backgroundColor, c.id).toBe(colourOf(DISC[c.state]));
          expect(disc.getBoundingClientRect().width, c.id).toBe(58);
          expect(getComputedStyle(disc.querySelector("svg")!).fontSize, c.id).toBe("34px");
        }
      });
    }

    // A paused loop counts as an animation too, so the count alone passed while the host paused the gloss for good (#355):
    // the band rests outside its clip, and a host that asked about the band itself found it off-screen.
    await step("the gloss: one infinite loop in a running Total Timer, running; none anywhere else", () => withMotion("full", async () => {
      const loopsOf = (el: HTMLElement) => el.getAnimations({ subtree: true }).filter(isLoop);
      const gloss = (c: Case) => c.state === "running" && c.variant !== "row";
      // The observer reports after a frame, so `running` is waited for, not read.
      await waitFor(async () => {
        for (const c of cases.filter(gloss)) {
          expect(loopsOf(timerOf(c)), c.id).toHaveLength(1); // one infinite loop, in any state
          expect(await runningLoops(timerOf(c)), c.id).toHaveLength(1); // and it runs
        }
      }, { timeout: 4000 });
      for (const c of cases.filter(c => !gloss(c)))
        expect(loopsOf(timerOf(c)), c.id).toHaveLength(0);

      // With the band on the loop's first keyframe, outside the clip, the loop still runs: the host watches the clip. Not at
      // the middle of the cycle: the band rests there at +350% of its own width, which still overlaps the clip, so a host
      // that watched the band would pass until the cycle wraps to this keyframe, up to 9 s on.
      const loops = await Promise.all(cases.filter(gloss).map(async c => (await runningLoops(timerOf(c)))[0]!));
      const started = loops.map(loop => loop.startTime);
      try {
        for (const loop of loops)
          loop.currentTime = 0;
        // Long enough for an observer callback to arrive, if the move were to provoke one.
        const until = performance.now() + 600;
        while (performance.now() < until) {
          await frames(1);
          loops.forEach((loop, i) => expect(isRunningLoop(loop), cases.filter(gloss)[i]!.id).toBe(true));
        }
        for (const c of cases.filter(gloss))
          expect(await runningLoops(timerOf(c)), c.id).toHaveLength(1);
      }
      finally {
        // Back on the shared origin the host gave it, so `finish` and the screenshot find the loop as before.
        loops.forEach((loop, i) => {
          loop.startTime = started[i]!;
        });
      }
    }));
  };
}

export const Workspace: StoryObj<typeof meta> = {
  render: sheet("Workspace Total Timer", WORKSPACE),
  play: play(WORKSPACE),
};

export const Overlay: StoryObj<typeof meta> = {
  render: sheet("Overlay Total Timer", OVERLAY),
  play: play(OVERLAY),
};

export const Row: StoryObj<typeof meta> = {
  render: sheet("Challenge Timer in a row", ROW),
  play: play(ROW),
};
