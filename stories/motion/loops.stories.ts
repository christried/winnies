import type { Meta, StoryObj } from "@storybook/vue3-vite";
import type { VNode, VNodeChild } from "vue";
import type { LoopName } from "../../app/utils/motion/types";
import { expect, waitFor, within } from "storybook/test";
import { defineComponent, h, nextTick, onBeforeUnmount, ref, withDirectives } from "vue";
import { useLoopDirective } from "../../app/composables/use-loop-directive";
import { LOOPS } from "../../app/utils/motion/loops";
import { resolved } from "../support/html";
import { block, onSwitches, page, readout, section, stage } from "../support/motion-kit";
import { animations, clickReplay, frames, live, withDialect, withMotion } from "../support/motion-play";
import { withMotionSurface } from "../support/motion-surface";

// Every ambient loop and the two Responsive ones (A01 to A11, face accents, spin, skel), one cell each, on the real
// `v-loop` directive. A loop that moves a layer sits in a clipped parent, as in the product. The two `breathe` probes
// of the Phase section are the proof of #301's shared start: the second starts 700 ms after the first and must still
// look in step with it.

const STAGGER = 110; // --stagger-wordmark, the handoff's wordmark and row stagger
const PROBE_DELAY = 700;

const Loops = defineComponent({
  name: "LoopsStory",
  setup() {
    // A directive cannot inject; the component asks for it here, from the surface the decorator provides.
    const vLoop = useLoopDirective();
    const running = ref(true);
    const probeBOn = ref(false);
    let probeTimer: ReturnType<typeof setTimeout> | undefined;

    function scheduleProbeB() {
      clearTimeout(probeTimer);
      probeBOn.value = false;
      probeTimer = setTimeout(() => {
        probeBOn.value = true;
      }, PROBE_DELAY);
    }
    scheduleProbeB();
    onBeforeUnmount(() => clearTimeout(probeTimer));

    // Takes every loop down and brings it back, which makes a new one of each: a loop bakes its amplitude when it
    // starts, so this is what a Replay shows after a toolbar switch.
    async function restart() {
      running.value = false;
      clearTimeout(probeTimer);
      probeBOn.value = false;
      await nextTick();
      running.value = true;
      scheduleProbeB();
    }
    onSwitches(restart);

    /** An element under the named loop, or under none while the story is taken down. */
    const looped = (el: VNode, name: LoopName, delay?: number, on = true) => withDirectives(el, [
      [
        vLoop,
        running.value && on && (delay === undefined
          ? name
          : { name, delay }),
      ],
    ]);
    const loopBlock = (name: LoopName, o: Parameters<typeof block>[0] = {}, delay?: number, children?: VNodeChild) =>
      looped(block({
        ...o,
        attrs: { ...o.attrs, "data-loop": name },
      }, children), name, delay);
    const cell = (name: LoopName, moment: string, body: VNodeChild[]) =>
      h("div", { "style": "display:flex;flex-direction:column;gap:6px;align-items:flex-start", "data-cell": name }, [
        readout(name, () => moment),
        ...body,
      ]);
    const row = (children: VNodeChild[]) => h("div", { style: "display:flex;gap:6px;align-items:flex-end" }, children as VNode[]);

    // The element a loop moves, in a clipped parent of its own.
    const clipped = (w: number, ht: number, children: VNodeChild[]) => stage({
      w,
      h: ht,
      clip: true,
      style: "border:2px solid var(--color-border);border-radius:var(--radius-md)",
    }, children);
    const probe = (id: "a" | "b") =>
      h("div", { "data-probe-wrap": id }, [
        looped(block({
          attrs: { "data-probe": id },
          tone: "accent",
        }), "breathe", undefined, id === "a" || probeBOn.value),
      ]);

    return () => page("Ambient loops", { replay: restart }, [
      section({
        id: "phase",
        title: "Phase",
        moment: "#301",
        replay: restart,
      }, [
        // The same name from the same origin: b starts later and looks in step.
        probe("a"),
        probe("b"),
        readout("b starts", () => `${PROBE_DELAY} ms after a`),
      ]),
      section({ id: "backdrop", title: "Backdrop", replay: restart }, [
        cell("drift", "A01", [
          clipped(96, 96, [
            loopBlock("drift", { w: 64, h: 64, tone: "muted" }),
          ]),
        ]),
        cell("blob1", "A02", [
          clipped(120, 96, [
            loopBlock("blob1", {
              w: 56,
              h: 56,
              round: true,
              tone: "accent",
            }),
          ]),
        ]),
        cell("blob2", "A02", [
          clipped(120, 96, [
            loopBlock("blob2", {
              w: 56,
              h: 56,
              round: true,
              tone: "gold",
            }),
          ]),
        ]),
      ]),
      section({ id: "presence", title: "Presence", replay: restart }, [
        cell("breathe", "A03", [
          loopBlock("breathe"),
        ]),
        cell("snooze", "A03", [
          loopBlock("snooze", { tone: "muted" }),
        ]),
        cell("shimmer", "A05", [
          clipped(140, 56, [
            loopBlock("shimmer", {
              w: 24,
              h: 52,
              tone: "gold",
              style: "position:absolute;left:0;top:0;border-radius:0",
            }),
          ]),
        ]),
        cell("sheen", "A06", [
          clipped(140, 56, [
            loopBlock("sheen", {
              w: 24,
              h: 52,
              tone: "gold",
              style: "position:absolute;left:0;top:0;border-radius:0",
            }),
          ]),
        ]),
        cell("ring", "A06", [
          loopBlock("ring", { style: "border:4px solid var(--color-highlight-gold)" }),
        ]),
        cell("stripes", "A07", [
          clipped(120, 32, [
          // One stripe period of 28.28 px, so the loop is seamless; the layer starts a period to the left.
            loopBlock("stripes", {
              w: 160,
              h: 32,
              tone: "muted",
              style: "position:absolute;left:-28.28px;top:0;border:0;border-radius:0;background:repeating-linear-gradient(45deg,var(--color-accent) 0 10px,var(--color-surface-raised) 10px 20px)",
            }),
          ]),
        ]),
        cell("float", "A11", [
          loopBlock("float"),
        ]),
      ]),
      section({ id: "motion", title: "Wave and wobble", replay: restart }, [
        cell("hop", "A08", [
          row(Array.from({ length: 7 }, (_, i) => loopBlock("hop", { w: 20, h: 28 }, i * STAGGER))),
        ]),
        cell("bob", "A10", [
          h("div", { style: "display:flex;flex-direction:column;gap:6px" }, Array.from({ length: 3 }, (_, i) => loopBlock("bob", { w: 120, h: 20 }, -i * STAGGER))),
        ]),
        cell("stick", "A09", [
          loopBlock("stick", { w: 40, h: 40, tone: "gold" }),
        ]),
        cell("wobble", "C04", [
          loopBlock("wobble", { w: 120, h: 40, tone: "complete" }),
        ]),
        cell("glow", "C04", [
          loopBlock("glow", { tone: "gold" }),
        ]),
        cell("twinkle", "C04", [
          loopBlock("twinkle", {
            w: 24,
            h: 24,
            round: true,
            tone: "gold",
          }),
        ]),
      ]),
      section({
        id: "accents",
        title: "Face accents",
        moment: "A04",
        replay: restart,
      }, [
        cell("drip", "A04", [
          loopBlock("drip", { w: 16, h: 24, tone: "accent" }),
        ]),
        cell("vein", "A04", [
          loopBlock("vein", {
            w: 20,
            h: 20,
            round: true,
            tone: "accent",
          }),
        ]),
        cell("steam", "A04", [
          loopBlock("steam", { w: 20, h: 28, tone: "muted" }),
        ]),
        cell("zzz", "A04", [
          loopBlock("zzz", { w: 20, h: 20, tone: "muted" }),
        ]),
      ]),
      section({ id: "responsive", title: "Responsive", replay: restart }, [
        cell("spin", "Responsive", [
          loopBlock("spin", { w: 32, h: 32, style: "border-top-color:var(--color-accent)" }),
        ]),
        cell("skel", "Responsive", [
          clipped(140, 24, [
            loopBlock("skel", {
              w: 140,
              h: 20,
              tone: "muted",
              style: "border:0;border-radius:0",
            }),
          ]),
        ]),
      ]),
    ]);
  },
});

const meta = {
  title: "Motion/Loops",
  decorators: [withMotionSurface],
  parameters: { motion: {} },
  render: () => Loops,
} satisfies Meta;

export default meta;

const names = Object.keys(LOOPS).toSorted();
function loopEls(root: HTMLElement) {
  return [
    ...root.querySelectorAll<HTMLElement>("[data-loop]"),
  ];
}
const probeEl = (root: HTMLElement, id: "a" | "b") => root.querySelector<HTMLElement>(`[data-probe="${id}"]`)!;
const wrapEl = (root: HTMLElement, id: "a" | "b") => root.querySelector<HTMLElement>(`[data-probe-wrap="${id}"]`)!;
const animOf = (el: HTMLElement) => el.getAnimations()[0]!;
const progress = (a: Animation) => a.effect!.getComputedTiming().progress!;
const breatheAmplitude = (a: Animation) => Number.parseFloat(/scale\(([\d.]+)/.exec(String((a.effect as KeyframeEffect).getKeyframes()[1]!.transform))![1]!);

export const Default: StoryObj<typeof meta> = {
  async play({ canvasElement, step }) {
    // The story mounts one tick after the surface has read its tokens, so the first element has to be waited for.
    await within(canvasElement).findByRole("button", { name: "Replay" });
    const everyLoopRuns = () => {
      const els = loopEls(canvasElement);
      expect([
        ...new Set(els.map(el => el.dataset.loop)),
      ].toSorted()).toEqual(names);
      els.forEach(el => expect(el.getAnimations(), el.dataset.loop).toHaveLength(1));
    };
    // Both probes exist and run: b starts 700 ms after a.
    const probesRun = () => {
      expect(probeEl(canvasElement, "a").getAnimations()).toHaveLength(1);
      expect(probeEl(canvasElement, "b").getAnimations()).toHaveLength(1);
    };

    await step("a replay creates no animation when reduced", () => withMotion("reduce", async () => {
      await clickReplay(canvasElement);
      await waitFor(() => expect(animations()).toHaveLength(0));
      await frames(3);
      expect(animations()).toHaveLength(0);
    }));

    await step("reduce cancels every running loop and leaving it restarts them", () => withMotion("full", async () => {
      await waitFor(everyLoopRuns, { timeout: 4000 });
      await withMotion("reduce", async () => {
        await waitFor(() => expect(live()).toHaveLength(0));
      });
      await waitFor(everyLoopRuns, { timeout: 4000 });
    }));

    await step("same-named loops share one start", () => withMotion("full", async () => {
      await waitFor(probesRun, { timeout: 4000 });
      const a = animOf(probeEl(canvasElement, "a"));
      const b = animOf(probeEl(canvasElement, "b"));
      expect(a.startTime).toBe(0);
      expect(b.startTime).toBe(0);
      // Read in one task, so the timeline has not moved between the two.
      expect(progress(b)).toBeCloseTo(progress(a), 3);
    }));

    await step("a dialect switch rebuilds a running loop at the new amplitude and rate, in phase", () => withMotion("full", async () => {
      await waitFor(probesRun, { timeout: 4000 });
      const other = document.body.dataset.dialect === "showcase"
        ? null
        : "showcase";
      await withDialect(other, async () => {
        const gain = () => Number(resolved("--motion-gain"));
        const rate = () => Number(resolved("--amb-rate"));
        await waitFor(() => {
          const a = animOf(probeEl(canvasElement, "a"));
          const b = animOf(probeEl(canvasElement, "b"));
          expect(a.playbackRate).toBeCloseTo(rate(), 5);
          expect(b.playbackRate).toBeCloseTo(rate(), 5);
          expect(breatheAmplitude(a)).toBeCloseTo(1 + 0.04 * gain(), 5);
          expect(breatheAmplitude(b)).toBeCloseTo(1 + 0.04 * gain(), 5);
          expect(progress(b)).toBeCloseTo(progress(a), 3);
        });
      });
    }));

    await step("a loop paused off-screen resumes at the right phase", () => withMotion("full", async () => {
      await waitFor(probesRun, { timeout: 4000 });
      const wrap = wrapEl(canvasElement, "b");
      wrap.style.display = "none";
      try {
        await waitFor(() => {
          expect(animOf(probeEl(canvasElement, "b")).playState).toBe("paused");
          expect(animOf(probeEl(canvasElement, "a")).playState).toBe("running");
        });
        await new Promise(resolve => setTimeout(resolve, 400));
      }
      finally {
        wrap.style.display = "";
      }
      await waitFor(() => {
        const a = animOf(probeEl(canvasElement, "a"));
        const b = animOf(probeEl(canvasElement, "b"));
        expect(b.playState).toBe("running");
        expect(b.startTime).toBe(0);
        expect(progress(b)).toBeCloseTo(progress(a), 3);
      });
    }));

    await step("a loop paused off-screen stays paused through a dialect switch", () => withMotion("full", async () => {
      await waitFor(probesRun, { timeout: 4000 });
      const wrap = wrapEl(canvasElement, "b");
      wrap.style.display = "none";
      try {
        await waitFor(() => expect(animOf(probeEl(canvasElement, "b")).playState).toBe("paused"));
        const other = document.body.dataset.dialect === "showcase"
          ? null
          : "showcase";
        await withDialect(other, async () => {
          await frames(3);
          expect(animOf(probeEl(canvasElement, "b")).playState).toBe("paused");
          await waitFor(() => expect(animOf(probeEl(canvasElement, "a")).playbackRate).toBeCloseTo(Number(resolved("--amb-rate")), 5));
          expect(animOf(probeEl(canvasElement, "b")).playState).toBe("paused");
        });
      }
      finally {
        wrap.style.display = "";
      }
      await waitFor(() => expect(animOf(probeEl(canvasElement, "b")).playState).toBe("running"));
    }));
  },
};
