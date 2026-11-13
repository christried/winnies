import type { Meta, StoryObj } from "@storybook/vue3-vite";
import type { VNode } from "vue";
import type { TimerStatus } from "../../shared/utils/timer";
import { expect, waitFor, within } from "storybook/test";
import { defineComponent, h, onBeforeUnmount, onMounted, ref } from "vue";
import UiTotalTimer from "../../app/components/ui/total-timer.vue";
import { expectQuietAfter } from "../support/component-checks";
import { chip } from "../support/html";
import { page, readout, section } from "../support/motion-kit";
import { clickReplay, frames, ONE_FRAME, withMotion, worstOverlap } from "../support/motion-play";
import { FAKE_START, useMotionStory, withMotionSurface } from "../support/motion-surface";

// The Total Timer's ticks as the app's own component draws them (#320), on a clock at rate 4: a beat every 250 ms, so a
// run of six takes 1.5 s, and the rollovers keep their shape above a 120 ms interval (R1's ticks story says why). One
// running timer is shown four ways: the Workspace's Total, the Overlay's Total, a row, and a row in the Overlay. A
// Replay moves the clock to where a run starts and lets it count six beats; the component does the rest, so this is
// also the human's manual QA: it rolls a minute and an hour. Never shot: a still of motion shows its end state.

type Run = "second" | "minute" | "hour";
type Display = "workspace" | "overlay" | "row" | "ov-row";

/** Elapsed seconds where a run starts, and which digit slots (`pos`) must change over its six beats. */
const RUNS: Record<Run, { start: number; text: string; slots: number[] }> = {
  // 14:32:11 to 14:32:17: only the seconds' units.
  second: {
    start: 52_331,
    text: "14:32:11",
    slots: [0],
  },
  // 12:57 to 13:03: the rollover at 13:00 changes the seconds, the minutes' units and the seconds' tens.
  minute: {
    start: 777,
    text: "12:57",
    slots: [0, 1, 3],
  },
  // 59:57 to 1:00:03: the hour appears, and every other digit changes at 1:00:00.
  hour: {
    start: 3597,
    text: "59:57",
    slots: [0, 1, 3, 4, 6],
  },
};
const BEATS_PER_RUN = 6;
const DISPLAYS: Display[] = [
  "workspace",
  "overlay",
  "row",
  "ov-row",
];
const OVERLAY_W = 616;

const TotalTimerMotion = defineComponent({
  name: "TotalTimerStory",
  setup() {
    const { clock, source } = useMotionStory();
    // It started when FAKE_START was the clock's reading: a Replay moves the source on, so `elapsed` is the run's.
    const timer: TimerStatus = {
      accumulatedSeconds: 0,
      runningSince: new Date(FAKE_START).toISOString(),
    };
    const stage = ref<HTMLElement | null>(null);

    let settle: ((completed: boolean) => void) | null = null;
    let running = false;
    let beatsLeft = 0;

    const setRun = (value: string) => {
      // Set on the element, not through a vnode prop: a play function waits for it right after the click.
      if (stage.value)
        stage.value.dataset.run = value;
    };
    // The previous run's animations, so a Replay starts from rest. Never the gloss loop: it is the component's own.
    const cancelTicks = () => {
      for (const root of stage.value?.querySelectorAll<HTMLElement>("[role=\"timer\"]") ?? []) {
        root.getAnimations().forEach(a => a.cancel());
        root.querySelectorAll<HTMLElement>("[data-pos]").forEach(el => el.getAnimations().forEach(a => a.cancel()));
      }
    };

    function finish(completed = true) {
      running = false;
      clock.stop();
      setRun("idle");
      settle?.(completed);
      settle = null;
    }

    /** One run of six beats on the clock: true when it ended by itself, false when a newer Replay superseded it. */
    function replay(id: Run): Promise<boolean> {
      if (running)
        finish(false);
      cancelTicks();
      // `stop()` then `start()`: `start()` reads the source again, so the clock can move back and forth between runs.
      clock.stop();
      source.set(FAKE_START + RUNS[id].start * 1000);
      clock.start();
      beatsLeft = BEATS_PER_RUN;
      running = true;
      setRun(id);
      return new Promise<boolean>((resolve) => {
        settle = resolve;
      });
    }

    const stopBeats = clock.onBeat(() => {
      if (!running)
        return;
      beatsLeft--;
      if (beatsLeft <= 0)
        finish();
    });

    onMounted(() => {
      // The decorator started the clock: read the first run's start and stand still until a Replay.
      clock.stop();
      source.set(FAKE_START + RUNS.second.start * 1000);
      clock.start();
      clock.stop();
    });
    onBeforeUnmount(() => {
      stopBeats();
      finish(false);
    });

    // A timer on the surface it belongs to; the text sits on a chip, because axe cannot judge it over the backdrop.
    function shown(id: Display, label: string, node: VNode, surface: string): VNode {
      return h("div", {
        "data-timer-case": id,
        "style": `display:flex;flex-direction:column;align-items:flex-start;gap:8px;padding:12px;border-radius:var(--radius-md);background:${surface}`,
      }, [
        h("div", {
          innerHTML: chip(label),
        }),
        node,
      ]);
    }
    const props = { timer, state: "running" } as const;

    return () => page("Total Timer", {
      replay: async () => {
        // The three runs in a row, each as long as it takes the clock to count its beats.
        for (const id of ["second", "minute", "hour"] as const) {
          if (!await replay(id))
            return;
        }
      },
    }, [
      section({ id: "timers", title: "Timers" }, [
        h("div", {
          "ref": stage,
          "data-run": "idle",
          "style": "display:flex;flex-direction:column;gap:12px;align-items:flex-start",
        }, [
          shown("workspace", "Workspace · T01 T03 T04", h(UiTotalTimer, { ...props, variant: "workspace" }), "var(--color-surface)"),
          shown("overlay", "Overlay · T05 T03 T04", h("div", { style: `width:${OVERLAY_W}px` }, [
            h(UiTotalTimer, { ...props, variant: "overlay" }),
          ]), "var(--color-surface)"),
          shown("row", "Row · T02", h(UiTotalTimer, { ...props, variant: "row" }), "var(--color-running-surface)"),
          shown("ov-row", "Row in the Overlay · T06", h(UiTotalTimer, { ...props, variant: "row", inOverlay: true }), "var(--color-running-surface)"),
        ]),
        readout("interval", () => `${1000 / source.rate} ms`),
        readout("dialect", () => document.body.dataset.dialect ?? "workspace"),
      ]),
      section({
        id: "second",
        title: "Second",
        moment: "T01 T02 T05 T06",
        replay: () => void replay("second"),
      }, [
        readout("starts", () => "14:32:11, six plain seconds"),
      ]),
      section({
        id: "minute",
        title: "Minute",
        moment: "T03",
        replay: () => void replay("minute"),
      }, [
        readout("starts", () => "12:57, the third beat is 13:00"),
      ]),
      section({
        id: "hour",
        title: "Hour",
        moment: "T04",
        replay: () => void replay("hour"),
      }, [
        readout("starts", () => "59:57, the third beat is 1:00:00"),
      ]),
    ]);
  },
});

const meta = {
  title: "Motion/Total Timer",
  decorators: [withMotionSurface],
  // A beat every 250 ms.
  parameters: {
    motion: { rate: 4 },
  },
  render: () => TotalTimerMotion,
} satisfies Meta;

export default meta;

const REPLAY: Record<Run, string> = { second: "second", minute: "minute", hour: "hour" };

const timerEl = (root: ParentNode, id: Display) => root.querySelector<HTMLElement>(`[data-timer-case="${id}"] [role="timer"]`)!;
function slotEls(el: HTMLElement) {
  return [
    ...el.querySelectorAll<HTMLElement>("[data-digits] [data-pos]"),
  ];
}
const digitsOf = (root: ParentNode, id: Display) => timerEl(root, id).querySelector("[data-digits]")!.textContent;
const spokenOf = (root: ParentNode, id: Display) => timerEl(root, id).lastElementChild!.textContent;

/** What the sampler saw of one timer during a run. */
interface Seen {
  /** Every `pos` whose slot had an animation in some frame. */
  slots: Set<number>;
  /** The well (the timer's own element) had an animation in some frame. */
  well: boolean;
  /** Every animation seen on a slot, by its `pos`. */
  animations: Map<number, Set<Animation>>;
}

/** Looks at the timers every frame until stopped: a tick lasts at least 100 ms, so none is missed. */
function sample(root: ParentNode) {
  const seen = Object.fromEntries(DISPLAYS.map(id => [
    id,
    {
      slots: new Set<number>(),
      well: false,
      animations: new Map<number, Set<Animation>>(),
    },
  ])) as Record<Display, Seen>;
  let frame = 0;
  const look = () => {
    for (const id of DISPLAYS) {
      const el = timerEl(root, id);
      if (!el)
        continue;
      if (el.getAnimations().length)
        seen[id].well = true;
      for (const slot of slotEls(el)) {
        const own = slot.getAnimations();
        if (own.length) {
          seen[id].slots.add(Number(slot.dataset.pos));
          const pos = Number(slot.dataset.pos);
          const set = seen[id].animations.get(pos) ?? new Set<Animation>();
          for (const a of own)
            set.add(a);
          seen[id].animations.set(pos, set);
        }
      }
    }
    frame = requestAnimationFrame(look);
  };
  frame = requestAnimationFrame(look);
  return () => {
    cancelAnimationFrame(frame);
    return seen;
  };
}

/** Clicks a Replay, and returns what the timers did until its run ended. */
async function runAndSample(canvasElement: HTMLElement, id: Run): Promise<Record<Display, Seen>> {
  const runState = () => canvasElement.querySelector<HTMLElement>("[data-run]")?.dataset.run;
  const stop = sample(canvasElement);
  let seen: Record<Display, Seen> | undefined;
  try {
    await clickReplay(canvasElement, REPLAY[id]);
    await waitFor(() => expect(runState()).toBe(id));
    await waitFor(() => expect(runState()).toBe("idle"), { timeout: 6000 });
    // The last beat's animation starts in the same moment as `idle`: give the sampler its frames.
    await frames(2);
  }
  finally {
    // Also when a check threw: the sampler is a requestAnimationFrame loop.
    seen = stop();
  }
  return seen;
}

/** Waits for the story: the decorator mounts it one tick late. */
async function ready(canvasElement: HTMLElement) {
  await within(canvasElement).findByRole("button", { name: "Replay" });
  await waitFor(() => expect(DISPLAYS.map(id => timerEl(canvasElement, id))).not.toContain(null));
}

export const Reduced: StoryObj<typeof meta> = {
  async play({ canvasElement }) {
    await ready(canvasElement);
    const runState = () => canvasElement.querySelector<HTMLElement>("[data-run]")?.dataset.run;
    // Before any full-motion step (`expectQuietAfter`'s own note).
    await expectQuietAfter(async () => {
      await clickReplay(canvasElement, "second");
      // Three beats on: the digits change in place, and nothing animates.
      for (const id of DISPLAYS)
        await waitFor(() => expect(digitsOf(canvasElement, id)! >= "14:32:14", id).toBe(true), { timeout: 6000 });
    });
    // The run is still counting its beats: let it end, so no timer is left.
    await waitFor(() => expect(runState()).toBe("idle"), { timeout: 6000 });
  },
};

export const OnlyChangedSlots: StoryObj<typeof meta> = {
  async play({ canvasElement, step }) {
    await ready(canvasElement);
    for (const id of ["second", "minute", "hour"] as const) {
      await step(`a ${id} run animates only the slots that changed, in all four timers`, () => withMotion("full", async () => {
        const seen = await runAndSample(canvasElement, id);
        const expected = RUNS[id].slots;
        for (const display of DISPLAYS) {
          // The union over the run, ascending: the same set in every timer, and never a colon (`pos` 2 and 5).
          expect([...seen[display].slots].toSorted((a, b) => a - b), display).toEqual(expected);
          expect(seen[display].slots.has(2) || seen[display].slots.has(5), `${display} colon`).toBe(false);
        }
        // The wells swell at a rollover; a second and a row never touch one.
        expect(seen.workspace.well, "workspace well").toBe(id !== "second");
        expect(seen.overlay.well, "overlay well").toBe(id !== "second");
        expect(seen.row.well, "row").toBe(false);
        expect(seen["ov-row"].well, "row in the Overlay").toBe(false);
      }));
    }
  },
};

export const HiddenValue: StoryObj<typeof meta> = {
  async play({ canvasElement, step }) {
    await ready(canvasElement);
    const SPOKEN: Record<Run, { start: string; changes: number }> = {
      second: { start: "14 hours 32 minutes, running", changes: 0 },
      minute: { start: "12 minutes, running", changes: 1 },
      hour: { start: "59 minutes, running", changes: 1 },
    };
    for (const id of ["second", "minute", "hour"] as const) {
      await step(`the spoken value changes ${SPOKEN[id].changes} time${SPOKEN[id].changes === 1
        ? ""
        : "s"} over a ${id} run`, () => withMotion("full", async () => {
        const runState = () => canvasElement.querySelector<HTMLElement>("[data-run]")?.dataset.run;
        await clickReplay(canvasElement, REPLAY[id]);
        // The start text shows; the first rollover is two beats later, so the observer is in time.
        await waitFor(() => expect(spokenOf(canvasElement, "workspace")).toBe(SPOKEN[id].start));
        const changes = Object.fromEntries(DISPLAYS.map(d => [d, 0])) as Record<Display, number>;
        const observers = DISPLAYS.map((d) => {
          const observer = new MutationObserver((records) => {
            changes[d] += records.length;
          });
          observer.observe(timerEl(canvasElement, d).lastElementChild!, { characterData: true, childList: true, subtree: true });
          return [d, observer] as const;
        });
        try {
          await waitFor(() => expect(runState()).toBe("idle"), { timeout: 6000 });
          await frames(2);
        }
        finally {
          for (const [d, observer] of observers) {
            changes[d] += observer.takeRecords().length;
            observer.disconnect();
          }
        }
        for (const d of DISPLAYS)
          expect(changes[d], d).toBe(SPOKEN[id].changes);
      }));
    }
  },
};

export const HiddenTab: StoryObj<typeof meta> = {
  async play({ canvasElement }) {
    await ready(canvasElement);
    const runState = () => canvasElement.querySelector<HTMLElement>("[data-run]")?.dataset.run;
    const setHidden = (hidden: boolean) => {
      if (hidden) {
        Object.defineProperty(document, "hidden", {
          configurable: true,
          get: () => true,
        });
      }
      else {
        delete (document as { hidden?: boolean }).hidden;
      }
      document.dispatchEvent(new Event("visibilitychange"));
    };
    await withMotion("full", async () => {
      setHidden(true);
      const stop = sample(canvasElement);
      let seen: Record<Display, Seen> | undefined;
      try {
        await clickReplay(canvasElement, "second");
        await waitFor(() => expect(runState()).toBe("second"));
        await waitFor(() => expect(runState()).toBe("idle"), { timeout: 6000 });
        await frames(2);
      }
      finally {
        seen = stop();
        // The clock has stopped by now, so this wakes nothing.
        setHidden(false);
      }
      // The clock kept running in the hidden tab: the digits advanced, in silence.
      for (const id of DISPLAYS) {
        // Six beats from 14:32:11; a late timer under load may read a second more, so only "at least three on".
        expect(digitsOf(canvasElement, id)! >= "14:32:14", id).toBe(true);
        expect(seen[id].slots.size, `${id} slots`).toBe(0);
        expect(seen[id].well, `${id} well`).toBe(false);
      }
    });
  },
};

// #337: a rollover's staggered last digit ran into its next tick, so a slot held two animations at once. The fix is in the
// engine, and this story holds it: no tick runs into the next one by more than a frame (see `ONE_FRAME`).
export const FastRolloverNoDoubleTick: StoryObj<typeof meta> = {
  async play({ canvasElement, step }) {
    await ready(canvasElement);
    for (const id of ["minute", "hour"] as const) {
      await step(`no slot holds two animations at once over a ${id} run`, () => withMotion("full", async () => {
        const seen = await runAndSample(canvasElement, id);
        for (const display of DISPLAYS)
          expect(worstOverlap(seen[display].animations), display).toBeLessThanOrEqual(ONE_FRAME);
      }));
    }
  },
};
