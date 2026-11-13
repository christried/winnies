import type { Meta, StoryObj } from "@storybook/vue3-vite";
import type { TooltipTrigger } from "../../app/utils/tooltip";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { defineComponent, h, ref } from "vue";
import UiButton from "../../app/components/ui/button.vue";
import UiIconButton from "../../app/components/ui/icon-button.vue";
import UiModal from "../../app/components/ui/modal.vue";
import UiTooltip from "../../app/components/ui/tooltip.vue";
import { expectQuietAfter, finish, parkPointer, repaint, settled } from "../support/component-checks";
import { chip, headingCss } from "../support/html";
import { animations, frames, withDialect, withMotion } from "../support/motion-play";
import { withMotionSurface } from "../support/motion-surface";
import { realPointer } from "../support/real-pointer";

// The app's own UiTooltip (#311): the handoff's cocoa bubble (03-components.md `tooltip`, R10 in 04-motion-and-sound.md;
// the screen prototype's bubble where the reference CSS differs) that a resting mouse or the keyboard's focus brings up
// over its trigger, and that every UiIconButton wears. The numbers below are the handoff's literals, 450 ms, a 10px gap
// and a 440px maximum, never the component's constants. Every string is story copy, not product copy.

const LONG_TEXT = "This is story copy: a tooltip with a long text that has to wrap, so its bubble stops at 440 pixels wide and "
  + "grows taller instead of running off the page, as the handoff asks.";

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

// Text sits on a chip, never straight on the dialect backdrop: axe cannot judge contrast over it.
function page(title: string, ...body: ReturnType<typeof h>[]) {
  return h("section", {
    "aria-label": title,
    "style": "display:flex;flex-direction:column;align-items:flex-start;gap:16px;padding:24px",
  }, [
    h("h1", { style: `${headingCss};font-size:var(--text-4xl)` }, title),
    ...body,
  ]);
}

// Every trigger on a surface panel with its story chip beside it.
function labelled(story: string, ...body: ReturnType<typeof h>[]) {
  return h("div", {
    style: "display:flex;align-items:center;flex-wrap:wrap;gap:16px;padding:16px;background:var(--color-surface);"
      + "border-radius:var(--radius-xl)",
  }, [
    ...body,
    h("div", {
      innerHTML: chip(story),
    }),
  ]);
}

/** The trigger of the hand-wrapped `UiTooltip`: a text button with a long bubble. */
const LONG_LABEL = "Long tip";
function longTip() {
  return h(UiTooltip, { text: LONG_TEXT }, {
    default: ({ trigger }: { trigger: TooltipTrigger }) => h(UiButton, { ...trigger }, () => LONG_LABEL),
  });
}

const ITEMS = [
  {
    label: "Add",
    icon: "add",
    variant: "default",
    size: "default",
  },
  {
    label: "More",
    icon: "more_vert",
    variant: "ghost",
    size: "default",
  },
  {
    label: "Close small",
    icon: "close",
    variant: "ghost",
    size: "sm",
  },
] as const;

/** The three icon buttons and the hand-wrapped text button, on one panel. */
function row(story: string) {
  return labelled(story, ...ITEMS.map(item => h(UiIconButton, { ...item })), longTip());
}

const meta = {
  title: "UI/Tooltip",
  decorators: [withMotionSurface],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const findButton = (canvasElement: HTMLElement, name: string) => within(canvasElement).findByRole("button", { name });

/** P, the popover: the bubble is the trigger's next sibling, whether or not the trigger is described by it. */
const popoverOf = (trigger: HTMLElement) => trigger.nextElementSibling as HTMLElement;
/** B, the bubble that looks and animates. */
const bubbleOf = (trigger: HTMLElement) => popoverOf(trigger).querySelector<HTMLElement>("[data-bubble]")!;
/** Shown means the popover is open and the bubble has a box. */
function isShown(trigger: HTMLElement) {
  const box = bubbleOf(trigger).getBoundingClientRect();
  return popoverOf(trigger).matches(":popover-open") && box.width > 0 && box.height > 0;
}
const expectShown = (trigger: HTMLElement) => waitFor(() => expect(isShown(trigger)).toBe(true), { timeout: 2000 });
const expectHidden = (trigger: HTMLElement) => waitFor(() => expect(isShown(trigger)).toBe(false), { timeout: 2000 });
const active = () => document.activeElement as HTMLElement;

/** The part of the runner's real browser `userEvent` that `realPointer` does not name: `Pick` left it out of the type, not out of the object. */
interface RealInput {
  click: (element: Element) => Promise<void>;
  tab: () => Promise<void>;
}

/**
 * A press, as the browser makes it. A synthetic click ends in a script `focus()`, which Chromium counts as `:focus-visible`
 * and so shows the bubble that a mouse never shows; only a real click proves the rule. Out of the runner, the press alone.
 * A real mouse press also sets the page to mouse modality for the stories after it, so a real Tab puts the keyboard back.
 * @param trigger the trigger to press
 */
async function press(trigger: HTMLElement) {
  const real = await realPointer() as unknown as RealInput | null;
  if (!real) {
    trigger.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerType: "mouse" }));
    return;
  }
  await real.click(trigger);
  await parkPointer();
  await real.tab();
  active().blur();
}
const openCount = () => document.querySelectorAll(":popover-open").length;

/** The animations the bubble starts from now on; `stop` puts its own `animate` back. */
function recordAnimations(bubble: HTMLElement) {
  const started: Animation[] = [];
  const original = bubble.animate.bind(bubble);
  bubble.animate = (keyframes, options) => {
    const animation = original(keyframes, options);
    started.push(animation);
    return animation;
  };
  return {
    started,
    stop: () => {
      // The own property goes, and the prototype's method is back.
      delete (bubble as { animate?: unknown }).animate;
    },
  };
}

/**
 * R10 starts exactly one animation, on B, and it rests where the recipe's last keyframe is: with the animation held at its
 * end and with it cancelled, the bubble is at the same place. So P's counter-translate and B's rest transform cancel.
 * @param bubble the bubble
 * @param started what `recordAnimations` caught
 */
async function expectRestsAtRecipeEnd(bubble: HTMLElement, started: Animation[]) {
  expect(started).toHaveLength(1);
  const animation = started[0]!;
  expect((animation.effect as KeyframeEffect).target).toBe(bubble);
  // Held at the end: the last keyframe applies, as the recipe has it.
  animation.effect!.updateTiming({ fill: "forwards" });
  await animation.finished;
  const atEnd = bubble.getBoundingClientRect();
  animation.cancel();
  const atRest = bubble.getBoundingClientRect();
  expect(atRest.left).toBeCloseTo(atEnd.left, 0);
  expect(atRest.top).toBeCloseTo(atEnd.top, 0);
  expect(atRest.width).toBeCloseTo(atEnd.width, 0);
}

/**
 * Where a shown bubble is: inside the viewport and never on its trigger. The same checks hold on the anchored path and
 * on the fallback.
 * @param trigger the trigger whose bubble is shown
 * @returns the side of the trigger it went to
 */
function expectPlacement(trigger: HTMLElement) {
  const t = trigger.getBoundingClientRect();
  const b = bubbleOf(trigger).getBoundingClientRect();
  // The handoff's 8px margin sideways, and at least inside the viewport above and below.
  expect(b.left).toBeGreaterThanOrEqual(8);
  expect(b.top).toBeGreaterThanOrEqual(0);
  expect(b.right).toBeLessThanOrEqual(window.innerWidth - 8);
  expect(b.bottom).toBeLessThanOrEqual(window.innerHeight);
  expect(b.left < t.right && b.right > t.left && b.top < t.bottom && b.bottom > t.top).toBe(false);
  return b.top >= t.bottom
    ? "below"
    : "above";
}

export const Default: Story = {
  render: () => () => page("Tooltip", row("resting")),
  async play({ canvasElement }) {
    const long = await findButton(canvasElement, LONG_LABEL);
    const triggers = [
      ...await Promise.all(ITEMS.map(item => findButton(canvasElement, item.label))),
      long,
    ];
    await withDialect(null, async () => {
      for (const trigger of triggers) {
        const label = trigger === long
          ? LONG_LABEL
          : trigger.getAttribute("aria-label")!;
        const text = trigger === long
          ? LONG_TEXT
          : label;
        const tooltip = popoverOf(trigger);
        expect(tooltip).toHaveAttribute("role", "tooltip");
        expect(tooltip.textContent?.trim()).toBe(text);
        expect(trigger).toHaveAccessibleName(label);
        if (trigger === long) {
          // A hand-wrapped trigger takes the bubble as its description: its text is not the trigger's own.
          expect(trigger).toHaveAccessibleDescription(text);
          expect(tooltip).not.toHaveAttribute("aria-hidden");
        }
        else {
          // An icon button's bubble repeats its `aria-label`: it names the button and does not describe it, and a screen
          // reader never hears the label twice.
          expect(trigger).not.toHaveAttribute("aria-describedby");
          expect(trigger).toHaveAccessibleDescription("");
          expect(tooltip).toHaveAttribute("aria-hidden", "true");
        }
        // No `title`: the bubble replaced it, and the browser's own would show beside it.
        expect(trigger).not.toHaveAttribute("title");
        expect(isShown(trigger)).toBe(false);
        // The bubble is no Tab stop.
        expect(tooltip.tabIndex).toBe(-1);
        expect(tooltip.querySelector("[tabindex]")).toBeNull();
      }
      expect(openCount()).toBe(0);
    });
    await finish(canvasElement);
  },
};

export const Hover: Story = {
  render: () => () => page("Tooltip hover", row("hover")),
  async play({ canvasElement }) {
    const add = await findButton(canvasElement, "Add");
    const long = await findButton(canvasElement, LONG_LABEL);

    // Reduced first: the bubble shows and nothing animates.
    await expectQuietAfter(() => withDialect(null, async () => {
      await userEvent.hover(add);
      await expectShown(add);
      await userEvent.unhover(add);
      await expectHidden(add);
    }));

    await withMotion("full", async () => {
      await withDialect(null, async () => {
        const bubble = bubbleOf(add);
        const recording = recordAnimations(bubble);
        try {
          const start = performance.now();
          await userEvent.hover(add);
          await sleep(250);
          // The pause is R10's 450 ms: nothing at 250.
          expect(isShown(add)).toBe(false);
          await expectShown(add);
          expect(performance.now() - start).toBeGreaterThanOrEqual(440);
          expect(bubble.textContent?.trim()).toBe("Add");

          await expectRestsAtRecipeEnd(bubble, recording.started);
          await settled();
          const t = add.getBoundingClientRect();
          const b = bubble.getBoundingClientRect();
          // Over the trigger, never on it, centred.
          expect(b.bottom).toBeLessThanOrEqual(t.top);
          expect(b.left < t.right && b.right > t.left && b.top < t.bottom && b.bottom > t.top).toBe(false);
          expect(Math.abs((b.left + b.right) / 2 - (t.left + t.right) / 2)).toBeLessThanOrEqual(1);

          // Leaving takes it away at once, and its animation with it.
          await userEvent.unhover(add);
          await frames(2);
          expect(isShown(add)).toBe(false);
          expect(animations()).toHaveLength(0);
        }
        finally {
          recording.stop();
        }

        // Leaving before the pause is over shows nothing.
        await userEvent.hover(add);
        await sleep(200);
        await userEvent.unhover(add);
        await sleep(700);
        expect(isShown(add)).toBe(false);

        // A press hides it and keeps it hidden while the pointer stays: a menu or a modal is opening.
        await userEvent.hover(add);
        await expectShown(add);
        await press(add);
        await expectHidden(add);
        await sleep(700);
        expect(isShown(add)).toBe(false);
        // Out and in again: shown again.
        await userEvent.unhover(add);
        await userEvent.hover(add);
        await expectShown(add);
        await userEvent.unhover(add);
        await expectHidden(add);

        // Touch never hovers.
        add.dispatchEvent(new PointerEvent("pointerenter", { pointerType: "touch" }));
        await sleep(700);
        expect(isShown(add)).toBe(false);

        // A long text wraps at 440px.
        await userEvent.hover(long);
        await expectShown(long);
        await settled();
        const longBox = bubbleOf(long).getBoundingClientRect();
        expect(longBox.width).toBeLessThanOrEqual(440);
        expect(longBox.height).toBeGreaterThan(40);
        await userEvent.unhover(long);
        await expectHidden(long);

        // The tokens: the bubble is the cocoa one, inverted in dark by the token.
        const probe = document.createElement("div");
        probe.style.background = "var(--tooltip-bg)";
        canvasElement.append(probe);
        try {
          await userEvent.hover(add);
          await expectShown(add);
          expect(getComputedStyle(bubble).backgroundColor).toBe(getComputedStyle(probe).backgroundColor);
        }
        finally {
          probe.remove();
          await userEvent.unhover(add);
        }
      });

      // Showcase shows it too.
      await withDialect("showcase", async () => {
        await userEvent.hover(add);
        await expectShown(add);
        await userEvent.unhover(add);
        await expectHidden(add);
      });

      // Broadcast shows nothing: the Overlay has no tooltip (R10).
      await withDialect("broadcast", async () => {
        await userEvent.hover(add);
        await sleep(700);
        expect(isShown(add)).toBe(false);
        await userEvent.unhover(add);
      });

      // The runner's real mouse, once: the whole chain from the browser's own pointer events.
      const pointer = await realPointer();
      if (pointer) {
        await withDialect(null, async () => {
          await pointer.hover(add);
          await expectShown(add);
          await pointer.unhover(add);
          await expectHidden(add);
        });
      }
    });
    await parkPointer();
    await finish(canvasElement);
  },
};

export const Focus: Story = {
  render: () => () => page("Tooltip focus", row("focus")),
  async play({ canvasElement }) {
    const add = await findButton(canvasElement, "Add");
    const more = await findButton(canvasElement, "More");
    const events: KeyboardEvent[] = [];
    const record = (event: KeyboardEvent) => events.push(event);
    window.addEventListener("keydown", record, true);
    try {
      // Reduced first: the keyboard shows it and nothing animates.
      await expectQuietAfter(() => withDialect(null, async () => {
        await userEvent.tab();
        await expectShown(add);
        active().blur();
        await expectHidden(add);
      }));

      await withMotion("full", async () => {
        await withDialect(null, async () => {
          // At once: two frames, not 450 ms.
          await userEvent.tab();
          expect(add).toHaveFocus();
          expect(add.matches(":focus-visible")).toBe(true);
          await frames(2);
          expect(isShown(add)).toBe(true);
          expect(popoverOf(add)).toHaveAttribute("data-placement", "anchored");

          // One bubble at a time.
          await userEvent.tab();
          expect(more).toHaveFocus();
          await frames(2);
          expect(isShown(add)).toBe(false);
          expect(isShown(more)).toBe(true);
          expect(openCount()).toBe(1);

          // A blur takes it away at once.
          active().blur();
          await frames(1);
          expect(isShown(more)).toBe(false);
          expect(openCount()).toBe(0);

          // A mouse click shows nothing by its focus: the press hides it, and the focus is not `:focus-visible`.
          await press(add);
          await sleep(700);
          expect(isShown(add)).toBe(false);

          // Esc: the bubble goes, the trigger keeps the focus, and the key was taken.
          await userEvent.tab();
          await expectShown(add);
          events.length = 0;
          await userEvent.keyboard("{Escape}");
          expect(events.at(-1)?.key).toBe("Escape");
          expect(events.at(-1)?.defaultPrevented).toBe(true);
          expect(isShown(add)).toBe(false);
          expect(add).toHaveFocus();
          await sleep(700);
          expect(isShown(add)).toBe(false);
          // Away and back: shown again.
          await userEvent.tab({ shift: true });
          await userEvent.tab();
          expect(add).toHaveFocus();
          await expectShown(add);

          // A scroll hides it.
          document.dispatchEvent(new Event("scroll"));
          await expectHidden(add);
          active().blur();
        });

        // Broadcast: the keyboard shows nothing either.
        await withDialect("broadcast", async () => {
          await userEvent.tab();
          expect(add).toHaveFocus();
          await sleep(300);
          expect(isShown(add)).toBe(false);
          active().blur();
        });
      });
    }
    finally {
      window.removeEventListener("keydown", record, true);
    }

    // The picture, in the variant's own dialect: the bubble is up in Workspace and Showcase, light and dark; Broadcast
    // shows the focus ring alone. No `finish()`: it blurs, and the bubble would go with the focus.
    active().blur();
    await userEvent.tab();
    expect(add).toHaveFocus();
    await settled();
    await parkPointer();
    await repaint(canvasElement);
  },
};

/** Three icon buttons placed so the page does not scroll: top left, mid width, and at the right edge. */
const EDGE_LABELS = ["Back to the first Winnie", "Mid", "Next to the last Winnie, at the right edge"] as const;

const EDGES_NOTE = "edges-note";

function edges(story: string) {
  const fixed = (css: string, label: string, attrs: Record<string, string> = {}) =>
    h(UiIconButton, {
      icon: "add",
      label,
      style: `position:fixed;${css}`,
      ...attrs,
    });
  return h("section", {
    "aria-label": story,
    "style": "display:flex;flex-direction:column;align-items:flex-start;gap:16px;padding:24px;padding-top:88px",
  }, [
    h("h1", { style: `${headingCss};font-size:var(--text-4xl)` }, story),
    h("div", {
      id: EDGES_NOTE,
      style: "padding:16px;background:var(--color-surface);border-radius:var(--radius-xl)",
      innerHTML: chip("edges"),
    }),
    fixed("top:8px;left:8px", EDGE_LABELS[0]),
    // The middle one is described by the page, as a caller's row can: the bubble must still find its trigger.
    fixed("top:240px;left:calc(50% - 26px)", EDGE_LABELS[1], { "aria-describedby": EDGES_NOTE }),
    fixed("top:240px;right:8px", EDGE_LABELS[2]),
  ]);
}

/** Tab to each of the three, check where its bubble went, and leave the first one focused for the picture. */
async function walkEdges(canvasElement: HTMLElement, placementOf: "anchored" | "fixed") {
  const [first, mid, last] = await Promise.all(EDGE_LABELS.map(label => findButton(canvasElement, label)));
  const recording = recordAnimations(bubbleOf(mid!));
  try {
    await withMotion("full", async () => {
      await withDialect(null, async () => {
        await userEvent.tab();
        expect(first).toHaveFocus();
        await expectShown(first!);
        await settled();
        expect(popoverOf(first!)).toHaveAttribute("data-placement", placementOf);
        // The header's buttons sit 12px from the page top: no room above, so it goes below.
        expect(expectPlacement(first!)).toBe("below");

        await userEvent.tab();
        expect(mid).toHaveFocus();
        await expectShown(mid!);
        await settled();
        // The caller's own `aria-describedby` stays, and the bubble does not replace it.
        expect(mid).toHaveAccessibleDescription("edges");
        expect(popoverOf(mid!)).toHaveAttribute("data-placement", placementOf);
        expect(expectPlacement(mid!)).toBe("above");
        const t = mid!.getBoundingClientRect();
        const b = bubbleOf(mid!).getBoundingClientRect();
        if (placementOf === "fixed") {
          // Placed by `tooltipPlacement`: centred, with the gap, to the pixel.
          expect(Math.abs((b.left + b.right) / 2 - (t.left + t.right) / 2)).toBeLessThanOrEqual(1);
          expect(Math.abs(t.top - b.bottom - 10)).toBeLessThanOrEqual(1);
        }
        await expectRestsAtRecipeEnd(bubbleOf(mid!), recording.started);

        await userEvent.tab();
        expect(last).toHaveFocus();
        await expectShown(last!);
        await settled();
        expect(popoverOf(last!)).toHaveAttribute("data-placement", placementOf);
        expectPlacement(last!);
        active().blur();
      });
    });
  }
  finally {
    recording.stop();
  }
  // The picture: the first trigger last, so the bubble below is the one pictured.
  await userEvent.tab();
  expect(first).toHaveFocus();
  await settled();
  await parkPointer();
  await repaint(canvasElement);
}

export const Edges: Story = {
  render: () => () => edges("Tooltip edges"),
  async play({ canvasElement }) {
    await walkEdges(canvasElement, "anchored");
  },
};

// Firefox has no anchor positioning yet, and a Chromium run can only prove that path by asking the component the question
// the way it does: `CSS.supports("position-area", …)`, the property its style uses. The stub answers `false` for that
// property and passes every other, so a check of `anchor-name` alone would still say yes.
let restoreSupports: (() => void) | undefined;
function stubAnchorSupport() {
  const original = CSS.supports.bind(CSS);
  CSS.supports = ((...args: [string, string?]) => args[0] === "position-area"
    ? false
    : original(...args as [string, string])) as typeof CSS.supports;
  restoreSupports = () => {
    CSS.supports = original;
    restoreSupports = undefined;
  };
}

export const Fallback: Story = {
  // Before the component mounts, and put back in the cleanup: a stub left behind would break every later story.
  beforeEach: () => {
    stubAnchorSupport();
    return () => restoreSupports?.();
  },
  render: () => () => edges("Tooltip fallback"),
  async play({ canvasElement }) {
    await walkEdges(canvasElement, "fixed");
  },
};

/** The state of the unmount case: the story flips it from its play. */
let setPresent: ((value: boolean) => void) | undefined;
/** A trigger that is there and then not. */
const Vanishing = defineComponent({
  setup() {
    const present = ref(true);
    setPresent = (value) => {
      present.value = value;
    };
    return () => present.value
      ? h(UiIconButton, { icon: "add", label: "Vanishing" })
      : h("span", { style: "font:var(--font-weight-strong) var(--text-xs) var(--font-body)" }, "Gone");
  },
});

/** A label that flips on a press, as a timer's Start and Pause do. */
const Flipping = defineComponent({
  setup() {
    const running = ref(false);
    return () => h(UiIconButton, {
      icon: "play_arrow",
      label: running.value
        ? "Pause timer"
        : "Start timer",
      onClick: () => {
        running.value = !running.value;
      },
    });
  },
});

let modal: { open: () => void; close: () => void } | null = null;
function hold(instance: unknown) {
  modal = instance as typeof modal;
}

export const Dismiss: Story = {
  render: () => () => page(
    "Tooltip dismiss",
    labelled(
      "modal",
      h(UiButton, {
        onClick: () => modal?.open(),
      }, () => "Open modal"),
      h(UiModal, { ref: hold, title: "Dismiss story", actionLabel: "Save" }, () => "Story copy inside a dialog."),
    ),
    labelled("unmount", h(Vanishing)),
    labelled("label", h(Flipping)),
  ),
  async play({ canvasElement }) {
    const opener = await findButton(canvasElement, "Open modal");
    const dialogOf = () => canvasElement.querySelector("dialog")!;

    /** Opens the modal with its trigger and Tabs to the Close icon button, the last stop. */
    async function toClose() {
      await userEvent.click(opener);
      await within(canvasElement).findByRole("dialog", { name: "Dismiss story" });
      const close = await within(canvasElement).findByRole("button", { name: "Close" });
      for (let i = 0; i < 6 && active() !== close; i++)
        await userEvent.tab();
      expect(close).toHaveFocus();
      return close;
    }

    /** Esc with a bubble up closes the bubble only; the second Esc closes the dialog and gives the focus back. */
    async function expectEscapeOrder() {
      const close = await toClose();
      await expectShown(close);
      await userEvent.keyboard("{Escape}");
      await expectHidden(close);
      expect(dialogOf().open).toBe(true);
      await userEvent.keyboard("{Escape}");
      await waitFor(() => expect(dialogOf().open).toBe(false), { timeout: 2000 });
      expect(opener).toHaveFocus();
    }

    await expectQuietAfter(() => withDialect(null, expectEscapeOrder));
    await withMotion("full", async () => {
      await withDialect(null, expectEscapeOrder);
    });
    active().blur();

    await withMotion("full", async () => {
      await withDialect(null, async () => {
        // Unmounted before the pause is over: it never shows, and nothing throws.
        const failures: unknown[] = [];
        const onError = (event: ErrorEvent | PromiseRejectionEvent) => failures.push(event);
        window.addEventListener("error", onError);
        window.addEventListener("unhandledrejection", onError);
        try {
          const vanishing = await findButton(canvasElement, "Vanishing");
          const popoverId = popoverOf(vanishing).id;
          await userEvent.hover(vanishing);
          await sleep(200);
          setPresent!(false);
          await sleep(700);
          expect(openCount()).toBe(0);
          expect(document.getElementById(popoverId)).toBeNull();
          expect(failures).toHaveLength(0);
        }
        finally {
          window.removeEventListener("error", onError);
          window.removeEventListener("unhandledrejection", onError);
          setPresent!(true);
        }
        await frames(2);

        // A label that changes while the bubble is up: the bubble's text follows.
        const flip = await findButton(canvasElement, "Start timer");
        for (let i = 0; i < 6 && active() !== flip; i++)
          await userEvent.tab();
        expect(flip).toHaveFocus();
        await expectShown(flip);
        expect(bubbleOf(flip).textContent?.trim()).toBe("Start timer");
        await userEvent.keyboard("{Enter}");
        await waitFor(() => expect(bubbleOf(flip).textContent?.trim()).toBe("Pause timer"));
        expect(isShown(flip)).toBe(true);
        expect(flip).toHaveAccessibleName("Pause timer");
        await userEvent.keyboard("{Enter}");
        await waitFor(() => expect(bubbleOf(flip).textContent?.trim()).toBe("Start timer"));
      });
    });
    await parkPointer();
    await finish(canvasElement);
  },
};
