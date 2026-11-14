import type { Meta, StoryObj } from "@storybook/vue3-vite";
import type { StatePillVariant } from "../../app/utils/state-pill";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { h, ref } from "vue";
import UiStatePill from "../../app/components/ui/state-pill.vue";
import { STATE_PILL_VARIANTS } from "../../app/utils/state-pill";
import { expectQuietAfter, finish } from "../support/component-checks";
import { chip } from "../support/html";
import { animations, runningLoops, withMotion } from "../support/motion-play";
import { withMotionSurface } from "../support/motion-surface";
import { labelled, page } from "../support/ui-kit";

// The app's own UiStatePill (#321): the handoff's `state-pill` (03-components.md; `.w-status` in the reference CSS and
// the status card, where the prototypes win: the Shared View's summary pill is 34px with `--text-sm` and has its lip on
// Running and Complete). No screen uses it yet: R3 and R4 compose it. The words below are written out, as the handoff
// has them (06-copy.md A4 and section B, the status card); "Gone" and "Error" are the human's copy decision (#321).
// Story strings (`Running · 2`, "Next") are story copy, not product copy.

const WORDS: Record<StatePillVariant, string> = {
  running: "Running",
  paused: "Paused",
  complete: "Complete",
  won: "Won",
  pinned: "Pinned",
  gone: "Gone",
  error: "Error",
  offline: "Offline",
  loading: "Loading…",
};

function row(...body: ReturnType<typeof h>[]) {
  return h("div", { style: "display:flex;flex-wrap:wrap;gap:16px" }, body);
}

const meta = {
  title: "UI/State pill",
  decorators: [withMotionSurface],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** The pill that shows `word`: the `<span>` that holds the text, found by it. */
const pillOf = (canvasElement: HTMLElement, word: string) => within(canvasElement).findByText(word);

const iconOf = (pill: HTMLElement) => pill.querySelector("svg")!;

export const Default: Story = {
  render: () => () => page("State pill", row(
    ...STATE_PILL_VARIANTS.map(variant => labelled(variant, h(UiStatePill, { variant }))),
  )),
  async play({ canvasElement }) {
    const bodies: string[] = [];
    for (const variant of STATE_PILL_VARIANTS) {
      const pill = await pillOf(canvasElement, WORDS[variant]);
      expect(pill.tagName).toBe("SPAN");
      expect(pill).toHaveAttribute("data-state", variant);
      // The icon is aria-hidden, so the pill's text is the word alone: it never reads "timer Running".
      expect(iconOf(pill)).toHaveAttribute("aria-hidden", "true");
      expect(pill.textContent).toBe(WORDS[variant]);
      bodies.push(iconOf(pill).innerHTML);
      // The prototype's size, the same for all nine.
      expect(getComputedStyle(pill).height).toBe("34px");
      // A label, not a control: nothing to focus and no role.
      expect(pill).not.toHaveAttribute("tabindex");
      expect(pill).not.toHaveAttribute("role");
      // Only the loading pill turns, and `Loading` checks that.
      if (variant !== "loading")
        expect(pill.getAnimations({ subtree: true })).toHaveLength(0);
    }
    // Every state has its own icon: none reads by colour alone.
    expect(new Set(bodies).size).toBe(STATE_PILL_VARIANTS.length);

    // The two shape cues: Gone is dashed, Paused has its ring.
    expect(getComputedStyle(await pillOf(canvasElement, WORDS.gone)).outlineStyle).toBe("dashed");
    expect(getComputedStyle(await pillOf(canvasElement, WORDS.paused)).boxShadow).not.toBe("none");
    // The lip is drawn on Running and Complete only, as in the prototype.
    for (const variant of ["running", "complete"] as const)
      expect(getComputedStyle(await pillOf(canvasElement, WORDS[variant])).boxShadow).not.toBe("none");
    for (const variant of [
      "won",
      "pinned",
      "error",
      "offline",
      "loading",
    ] as const)
      expect(getComputedStyle(await pillOf(canvasElement, WORDS[variant])).boxShadow).toBe("none");

    await finish(canvasElement);
  },
};

export const Loading: Story = {
  render: () => () => page("State pill loading", row(
    labelled("loading", h(UiStatePill, { variant: "loading" })),
    labelled("running", h(UiStatePill, { variant: "running" })),
  )),
  async play({ canvasElement }) {
    // Reduced first: the toggle cancels the spinner that is already running, so the document then holds no animation,
    // and the icon is still with the word "Loading…" beside it (R35, Reduced).
    await expectQuietAfter(async () => {});

    const loading = await pillOf(canvasElement, WORDS.loading);
    const running = await pillOf(canvasElement, WORDS.running);
    await withMotion("full", async () => {
      // R35: the spinner is the engine's `spin` loop, one animation on the icon of the loading pill and none elsewhere.
      await waitFor(async () => expect(await runningLoops(iconOf(loading))).toHaveLength(1));
      expect(iconOf(loading).getAnimations()).toHaveLength(1);
      expect(animations()).toHaveLength(1);
      const spin = iconOf(loading).getAnimations()[0]!;
      const effect = spin.effect as KeyframeEffect;
      expect(effect.target).toBe(iconOf(loading));
      // The engine writes `rotate(0)`; the browser hands the keyframes back with the unit.
      expect(effect.getKeyframes().map(k => k.transform)).toEqual(["rotate(0deg)", "rotate(360deg)"]);
      expect(effect.getComputedTiming().duration).toBe(900);
      expect(effect.getTiming().easing).toBe("linear");
      expect(running.getAnimations({ subtree: true })).toHaveLength(0);
    });

    expect(loading).toHaveAttribute("aria-busy", "true");
    expect(running).not.toHaveAttribute("aria-busy");
    // A picture of a spinner would catch it at a different angle each run: `finish` holds it at its first frame.
    await finish(canvasElement);
  },
};

export const Switching: Story = {
  render: () => {
    const index = ref(0);
    return () => page(
      "State pill switching",
      labelled(
        "stateful",
        h(UiStatePill, { variant: STATE_PILL_VARIANTS[index.value]! }),
        h("button", {
          type: "button",
          style: "font:inherit;padding:4px 12px",
          onClick: () => {
            index.value = (index.value + 1) % STATE_PILL_VARIANTS.length;
          },
        }, "Next"),
      ),
    );
  },
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const next = await canvas.findByRole("button", { name: "Next" });
    const pill = canvasElement.querySelector<HTMLElement>("[data-state]")!;
    const icon = iconOf(pill);
    const step = async (variant: StatePillVariant) => {
      await userEvent.click(next);
      await waitFor(() => expect(pill).toHaveAttribute("data-state", variant));
      // The same two nodes keep a pill that changes: its text and its icon change, so `v-loop` can stop the spin.
      expect(pill.isConnected).toBe(true);
      expect(iconOf(pill)).toBe(icon);
      expect(pill.textContent).toBe(WORDS[variant]);
    };
    // Steps `n` times through the nine from the pill's current place, and checks each.
    const advance = async (n: number) => {
      const from = STATE_PILL_VARIANTS.indexOf(pill.dataset.state as StatePillVariant);
      for (let i = 1; i <= n; i++)
        await step(STATE_PILL_VARIANTS[(from + i) % STATE_PILL_VARIANTS.length]!);
    };
    expect(pill).toHaveAttribute("data-state", "running");

    // Reduced first: it ends on Loading with the new icon and word and nothing started.
    const before = new Set<string>();
    await expectQuietAfter(async () => {
      for (let i = 0; i < STATE_PILL_VARIANTS.length - 1; i++) {
        before.add(icon.innerHTML);
        await advance(1);
        expect(before.has(icon.innerHTML)).toBe(false);
      }
      expect(pill).toHaveAttribute("data-state", "loading");
      expect(pill).toHaveAttribute("aria-busy", "true");
    });

    await withMotion("full", async () => {
      // Away from Loading and back: the spin starts on Loading, and the next step ends it (`v-loop`'s falsy value).
      await advance(1);
      expect(pill).toHaveAttribute("data-state", "running");
      expect(pill).not.toHaveAttribute("aria-busy");
      await advance(STATE_PILL_VARIANTS.length - 1);
      expect(pill).toHaveAttribute("data-state", "loading");
      await waitFor(() => expect(icon.getAnimations().filter(a => a.playState === "running")).toHaveLength(1));
      expect(animations()).toHaveLength(1);
      await advance(1);
      expect(pill).toHaveAttribute("data-state", "running");
      await waitFor(() => expect(animations()).toHaveLength(0));
    });

    // The click focused the button: the picture shows the pill alone.
    await finish(canvasElement);
  },
};

export const Overrides: Story = {
  render: () => () => page(
    "State pill overrides",
    // The slot replaces the word, as the summary's "N running" does. 50 is the Challenge limit.
    labelled("slot, 2", h(UiStatePill, { variant: "running" }, () => "Running · 2")),
    labelled("slot, 50", h(UiStatePill, { variant: "running" }, () => "Running · 50")),
    // The longest built-in word in a box that cuts what does not fit: the pill must not wrap or grow past it.
    h("div", { style: "display:flex;flex-direction:column;align-items:flex-start;gap:8px" }, [
      h("div", {
        "data-narrow": "",
        "style": "box-sizing:border-box;width:160px;overflow:hidden;padding:8px;background:var(--color-surface);"
          + "border-radius:var(--radius-xl)",
      }, [
        h(UiStatePill, { variant: "loading" }),
      ]),
      h("div", {
        innerHTML: chip("loading, 160px wide"),
      }),
    ]),
  ),
  async play({ canvasElement }) {
    const narrow = canvasElement.querySelector<HTMLElement>("[data-narrow]")!;
    for (const text of ["Running · 2", "Running · 50", WORDS.loading]) {
      const pill = await pillOf(canvasElement, text);
      // The text is the slot's alone: the icon is aria-hidden.
      expect(pill.textContent).toBe(text);
      expect(iconOf(pill)).toHaveAttribute("aria-hidden", "true");
      // One line, at the same height as every other pill.
      expect(getComputedStyle(pill).height).toBe("34px");
      expect(getComputedStyle(pill).whiteSpace).toBe("nowrap");
      expect(pill.getBoundingClientRect().height).toBe(34);
    }
    // The box does not cut the word and the pill does not shrink: it fits as it is.
    const loading = await pillOf(canvasElement, WORDS.loading);
    expect(narrow.getBoundingClientRect().width).toBe(160);
    expect(narrow.scrollWidth).toBeLessThanOrEqual(narrow.clientWidth);
    expect(loading.getBoundingClientRect().right).toBeLessThanOrEqual(narrow.getBoundingClientRect().right);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(document.documentElement.clientWidth);
    await finish(canvasElement);
  },
};
