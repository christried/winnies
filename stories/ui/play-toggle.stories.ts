import type { Meta, StoryObj } from "@storybook/vue3-vite";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import { h, ref } from "vue";
import UiButton from "../../app/components/ui/button.vue";
import UiPlayToggle from "../../app/components/ui/play-toggle.vue";
import { expectQuietAfter, finish, freezeSpinners, parkPointer, repaint, settled } from "../support/component-checks";
import { resolved } from "../support/html";
import { animations, frames, isLoop, runningLoops, withMotion } from "../support/motion-play";
import { withMotionSurface } from "../support/motion-surface";
import { colourOf, cutMarkup, findButton, page, panel } from "../support/ui-kit";

// The app's own UiPlayToggle (#318): the handoff's play / pause toggle (03-components.md, `play-toggle`; R25 and A06 in
// 04-motion-and-sound.md; the play buttons of the row card, where the prototypes win). It is `UiIconButton` with the icon and
// the running ring in its slot. No screen uses it yet; R3's rows and the Winnie card swap their icon buttons for it. The
// three words on it are the component's own copy (`row.labels`); the headings and the chrome button are story strings.
//
// The pictures: no loop runs and no pointer rests on the canvas when one is taken. The ring's loop runs for the plays and is
// paused at its first frame after them (`freezeRing`, as `freezeStripes` of the progress bar), the spinners are frozen with
// the shared `freezeSpinners`, and `parkPointer` moves the runner's real mouse away.

const START = "Start";
const PAUSE = "Pause";
const WON = "Won";

interface Spied { onToggle: ReturnType<typeof fn> }
const spied = (args: unknown) => args as Spied;

const meta = {
  title: "UI/Play toggle",
  decorators: [withMotionSurface],
  args: {
    onToggle: fn(),
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

// A panel wide enough for the ring's glow, which reaches past the button.
const labelled = panel({ gap: 32, padding: 24 });

const ringOf = (button: HTMLElement) => button.querySelector<HTMLElement>("[data-ring]");
const iconWrapOf = (button: HTMLElement) => button.querySelector<HTMLElement>("[data-icon]");

const ms = (token: string) => Number.parseFloat(resolved(token));

/** The animations that act on one element, whatever the rest of the page runs. */
const onEl = (el: HTMLElement) => animations().filter(a => (a.effect as KeyframeEffect | null)?.target === el);

// Stops every ring loop at its first frame. The breathe loop never ends, so a picture of a running toggle would catch it at
// a different opacity each run: the pictures show the ring dim, the plays check that it breathes. Local to this file, as
// `freezeStripes` is for the progress bar (the shared helpers are not widened for it).
function freezeRing(canvasElement: HTMLElement) {
  for (const ring of canvasElement.querySelectorAll<HTMLElement>("[data-ring]")) {
    for (const a of ring.getAnimations()) {
      a.pause();
      a.currentTime = 0;
    }
  }
}

export const Idle: Story = {
  render: args => () => page("Play toggle idle", labelled("running false", h(UiPlayToggle, {
    running: false,
    onToggle: spied(args).onToggle,
  }))),
  async play({ canvasElement, args }) {
    const spy = spied(args).onToggle;
    spy.mockClear();
    const el = await findButton(canvasElement, START);

    // The name is the word alone: the icon is decorative. A toggle whose name changes is not `aria-pressed`.
    expect(el).toHaveAccessibleName(START);
    expect(el).not.toHaveAttribute("aria-pressed");
    expect(el).not.toBeDisabled();
    expect(el.querySelectorAll("svg")).toHaveLength(1);
    expect(el.querySelector("svg")!.innerHTML).toBe(cutMarkup("play_arrow", "w500-fill"));
    expect(ringOf(el)).toBeNull();

    // Reduced first: a finished full-motion animation stays in the document and would fail the quiet check.
    await expectQuietAfter(async () => {
      await userEvent.click(el);
    });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenLastCalledWith(true);
    // Asked for, not done: the parent did not take the prop, so the toggle holds no state of its own.
    expect(el).toHaveAccessibleName(START);

    // The click left the focus on the toggle, so Enter and Space are key presses on it.
    await userEvent.keyboard("{Enter}");
    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy).toHaveBeenLastCalledWith(true);
    await userEvent.keyboard(" ");
    expect(spy).toHaveBeenCalledTimes(3);
    expect(spy).toHaveBeenLastCalledWith(true);
    expect(el).toHaveAccessibleName(START);

    await parkPointer();
    await finish(canvasElement);
  },
};

export const Running: Story = {
  render: args => () => page("Play toggle running", labelled("running true", h(UiPlayToggle, {
    running: true,
    onToggle: spied(args).onToggle,
  }))),
  async play({ canvasElement, args }) {
    const spy = spied(args).onToggle;
    spy.mockClear();
    const el = await findButton(canvasElement, PAUSE);

    expect(el).toHaveAccessibleName(PAUSE);
    expect(el).not.toHaveAttribute("aria-pressed");
    expect(el).not.toBeDisabled();
    expect(el.querySelectorAll("svg")).toHaveLength(1);
    expect(el.querySelector("svg")!.innerHTML).toBe(cutMarkup("pause", "w500-fill"));

    // Bubblegum fill: the accent, as the running state of the handoff's play button.
    await settled();
    expect(getComputedStyle(el).backgroundColor).toBe(colourOf("--color-accent", "backgroundColor"));

    // The ring is decorative and takes no click.
    const ring = ringOf(el)!;
    expect(ring).not.toBeNull();
    expect(ring).toHaveAttribute("aria-hidden", "true");
    expect(getComputedStyle(ring).pointerEvents).toBe("none");

    // Reduced first: nothing runs and the ring is still drawn, at rest.
    await expectQuietAfter(async () => {
      expect(getComputedStyle(ring).opacity).toBe("0.5");
      await userEvent.click(el);
    });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenLastCalledWith(false);
    // Asked for, not done: it still runs.
    expect(el).toHaveAccessibleName(PAUSE);
    expect(ringOf(el)).toBe(ring);

    await withMotion("full", async () => {
      // A06: the ring is the one thing that loops, on the engine's breathe loop; the button itself moves nowhere.
      await waitFor(async () => expect(await runningLoops(ring)).toHaveLength(1), { timeout: 4000 });
      expect(ring.getAnimations()).toHaveLength(1);
      const timing = (ring.getAnimations()[0]!.effect as KeyframeEffect).getTiming();
      expect(timing.duration).toBe(ms("--dur-breathe"));
      expect(el.getAnimations()).toHaveLength(0);

      // The loop runs for the checks above; the picture needs it still.
      freezeRing(canvasElement);
    });

    await parkPointer();
    await finish(canvasElement);
  },
};

export const Won: Story = {
  render: args => () => page(
    "Play toggle won",
    labelled("won true", h(UiPlayToggle, {
      won: true,
      onToggle: spied(args).onToggle,
    })),
    // A Won Challenge shows as Won whatever the timer says.
    labelled("won true, running true", h(UiPlayToggle, {
      won: true,
      running: true,
      onToggle: spied(args).onToggle,
    })),
  ),
  async play({ canvasElement, args }) {
    const spy = spied(args).onToggle;
    spy.mockClear();
    const all = await within(canvasElement).findAllByRole("button", { name: WON });
    expect(all).toHaveLength(2);

    for (const el of all) {
      expect(el).toHaveAccessibleName(WON);
      expect(el).toBeDisabled();
      expect(getComputedStyle(el).opacity).toBe("0.45");
      expect(el.querySelectorAll("svg")).toHaveLength(1);
      expect(el.querySelector("svg")!.innerHTML).toBe(cutMarkup("play_arrow", "w500-fill"));
      expect(ringOf(el)).toBeNull();
      await userEvent.click(el);
    }
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard(" ");
    // No Tab stop at all: the focus never lands on one of them.
    for (let i = 0; i < all.length + 1; i++) {
      await userEvent.tab();
      expect(all.includes(document.activeElement as HTMLElement)).toBe(false);
    }
    expect(spy).not.toHaveBeenCalled();

    await parkPointer();
    await finish(canvasElement);
  },
};

export const Busy: Story = {
  render: args => () => page(
    "Play toggle busy",
    labelled("busy, running false", h(UiPlayToggle, {
      busy: true,
      onToggle: spied(args).onToggle,
    })),
    labelled("busy, running true", h(UiPlayToggle, {
      busy: true,
      running: true,
      onToggle: spied(args).onToggle,
    })),
  ),
  async play({ canvasElement, args }) {
    const spy = spied(args).onToggle;
    spy.mockClear();
    const idle = await findButton(canvasElement, START);
    const running = await findButton(canvasElement, PAUSE);
    const both = [idle, running];

    // Reduced first: the end state is the still spinner icon, and nothing is started.
    await expectQuietAfter(async () => {
      for (const el of both)
        expect(el.querySelector("svg")).not.toBeNull();
    });

    for (const el of both) {
      expect(el).toHaveAttribute("aria-busy", "true");
      // A busy toggle stays focusable, and keeps its name: there is no busy word.
      expect(el).not.toBeDisabled();
      el.focus();
      expect(el).toHaveFocus();
      // The spinner stands alone: `UiButton` draws no slot while an icon-only button is busy, so neither the icon nor the
      // ring is there.
      const icons = el.querySelectorAll("svg");
      expect(icons).toHaveLength(1);
      expect(icons[0]!.innerHTML).not.toBe(cutMarkup("play_arrow", "w500-fill"));
      expect(icons[0]!.innerHTML).not.toBe(cutMarkup("pause", "w500-fill"));
      expect(ringOf(el)).toBeNull();
      expect(iconWrapOf(el)).toBeNull();
    }
    expect(idle).toHaveAccessibleName(START);
    expect(running).toHaveAccessibleName(PAUSE);

    await withMotion("full", async () => {
      // R35: the spinner turns on the engine's `spin` loop, one animation on each icon.
      for (const el of both) {
        await waitFor(() => expect(el.querySelector("svg")!.getAnimations().filter(a => a.playState === "running")).toHaveLength(1));
        expect(el.querySelector("svg")!.getAnimations()).toHaveLength(1);
      }
      freezeSpinners(canvasElement);

      // Clicks, Enter and Space take no effect.
      for (const el of both) {
        await userEvent.click(el);
        el.focus();
        expect(el).toHaveFocus();
        await userEvent.keyboard("{Enter}");
        await userEvent.keyboard(" ");
      }
    });
    expect(spy).not.toHaveBeenCalled();

    await parkPointer();
    await finish(canvasElement);
  },
};

export const Focus: Story = {
  render: args => () => page(
    "Play toggle focus",
    labelled("idle, real focus", h(UiPlayToggle, {
      onToggle: spied(args).onToggle,
    })),
    // The second one's ring is forced, so one picture shows both rings, and the ring layer sits next to the outline.
    labelled("running, forced focus", h(UiPlayToggle, {
      running: true,
      class: "is-focus",
      onToggle: spied(args).onToggle,
    })),
  ),
  async play({ canvasElement }) {
    const idle = await findButton(canvasElement, START);
    const running = await findButton(canvasElement, PAUSE);
    const focusColour = colourOf("--color-focus", "backgroundColor");

    // Reduced first: the running toggle's ring loop is the one animation the page would otherwise have.
    await withMotion("reduce", async () => {
      // Tab, so the focus is keyboard-driven and `:focus-visible` matches.
      await userEvent.tab();
      expect(idle).toHaveFocus();
      expect(idle.matches(":focus-visible")).toBe(true);
      const ring = getComputedStyle(idle);
      expect(ring.outlineStyle).toBe("solid");
      expect(ring.outlineWidth).toBe(resolved("--focus-width"));
      expect(ring.outlineColor).toBe(focusColour);
      // R32: the ring is never animated, so neither `outline` nor `all` is a transitioned property, and nothing is running.
      expect(ring.transitionProperty).not.toMatch(/outline|\ball\b/);
      await frames();
      expect(animations()).toHaveLength(0);
    });

    // The running toggle draws the ring layer round its disc, and the focus ring is not hidden by it.
    await withMotion("full", async () => {
      expect(ringOf(running)).not.toBeNull();
      const forced = getComputedStyle(running);
      expect(forced.outlineStyle).toBe("solid");
      expect(forced.outlineWidth).toBe(resolved("--focus-width"));
      expect(forced.outlineColor).toBe(focusColour);
      expect(running.matches(":focus-visible")).toBe(false);
      await waitFor(() => expect(ringOf(running)!.getAnimations().filter(a => a.playState === "running")).toHaveLength(1), { timeout: 4000 });
      freezeRing(canvasElement);
    });

    // The loop is paused wherever the preference ended (reduced motion cancels it), the focus stays for the picture, and the
    // canvas is painted anew: `finish` would drop the focus.
    freezeRing(canvasElement);
    expect(idle).toHaveFocus();
    await settled();
    await parkPointer();
    await repaint(canvasElement);
  },
};

export const Toggling: Story = {
  render: (args) => {
    // What a screen does: the parent holds the running state, the toggle only asks for the next one.
    const running = ref(false);
    const spy = spied(args);
    return () => page(
      "Play toggle toggling",
      labelled("held by a ref", h(UiPlayToggle, {
        running: running.value,
        onToggle: (next: boolean) => {
          spy.onToggle(next);
          running.value = next;
        },
      })),
      // Story chrome, the Manual QA control: the same ref moves from outside, with no click on the toggle.
      labelled("story control", h(UiButton, {
        size: "sm",
        onClick: () => {
          running.value = true;
        },
      }, () => "Start from outside")),
    );
  },
  async play({ canvasElement, args, step }) {
    const spy = spied(args).onToggle;
    spy.mockClear();
    const toggle = await findButton(canvasElement, START);
    const outside = await findButton(canvasElement, "Start from outside");

    // Both recipes at once: the morph on the icon wrapper and the ring's two animations (its loop and `ringIn`), caught in
    // one poll, so neither can finish between two reads.
    const caught = async () => {
      let seen: { morph: Animation; ring: Animation[] } | undefined;
      await waitFor(() => {
        const icon = onEl(iconWrapOf(toggle)!);
        const ring = ringOf(toggle)!.getAnimations();
        expect(icon).toHaveLength(1);
        expect(ring).toHaveLength(2);
        seen = { morph: icon[0]!, ring };
      });
      return seen!;
    };
    const timingOf = (a: Animation) => (a.effect as KeyframeEffect).getTiming();

    await step("reduced: the prop changes, the ring comes and goes, and nothing runs", () => expectQuietAfter(async () => {
      await userEvent.click(toggle);
      await waitFor(() => expect(toggle).toHaveAccessibleName(PAUSE));
      expect(ringOf(toggle)).not.toBeNull();
      await userEvent.click(toggle);
      await waitFor(() => expect(toggle).toHaveAccessibleName(START));
      expect(ringOf(toggle)).toBeNull();
    }));
    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy).toHaveBeenNthCalledWith(1, true);
    expect(spy).toHaveBeenNthCalledWith(2, false);
    spy.mockClear();

    await step("full: a click morphs the icon, then the ring arrives and breathes", () => withMotion("full", async () => {
      await settled();
      // The first render started nothing.
      expect(animations()).toHaveLength(0);

      await userEvent.click(toggle);
      await waitFor(() => expect(toggle).toHaveAccessibleName(PAUSE));
      const start = await caught();
      expect(timingOf(start.morph).duration).toBe(ms("--dur-flick"));
      // The loop was created first, and `ringIn` after it: the loop is not cancelled, it runs on once `ringIn` is done.
      const loop = start.ring.find(isLoop)!;
      const land = start.ring.find(a => !isLoop(a))!;
      expect(loop).toBeDefined();
      expect(timingOf(loop).duration).toBe(ms("--dur-breathe"));
      expect(timingOf(land).duration).toBe(ms("--dur-land"));

      await land.finished;
      await waitFor(() => expect(ringOf(toggle)!.getAnimations()).toHaveLength(1));
      expect(await runningLoops(ringOf(toggle)!)).toHaveLength(1);
      expect(spy).toHaveBeenLastCalledWith(true);

      // A second click: the morph plays on the icon again, the ring goes, and no loop is left in the document.
      await userEvent.click(toggle);
      await waitFor(() => expect(toggle).toHaveAccessibleName(START));
      await waitFor(() => {
        const icon = onEl(iconWrapOf(toggle)!);
        expect(icon).toHaveLength(1);
        expect(icon[0]).not.toBe(start.morph);
        expect(timingOf(icon[0]!).duration).toBe(ms("--dur-flick"));
      });
      expect(ringOf(toggle)).toBeNull();
      await waitFor(() => expect(animations().filter(isLoop)).toHaveLength(0));
      expect(spy).toHaveBeenLastCalledWith(false);
      await settled();
    }));

    await step("full: a start from outside plays the same morph and ring, with no click on the toggle", () => withMotion("full", async () => {
      spy.mockClear();
      await userEvent.click(outside);
      await waitFor(() => expect(toggle).toHaveAccessibleName(PAUSE));
      const start = await caught();
      expect(timingOf(start.morph).duration).toBe(ms("--dur-flick"));
      expect(start.ring.map(a => timingOf(a).duration).sort()).toEqual([
        ms("--dur-land"),
        ms("--dur-breathe"),
      ].sort());
      // The toggle was never pressed.
      expect(spy).not.toHaveBeenCalled();

      await userEvent.click(toggle);
      await waitFor(() => expect(toggle).toHaveAccessibleName(START));
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenLastCalledWith(false);
      expect(ringOf(toggle)).toBeNull();
    }));

    // It ends idle, as it began, so its picture equals the first render.
    await settled();
    await parkPointer();
    await finish(canvasElement);
  },
};
