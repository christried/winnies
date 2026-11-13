import type { Meta, StoryObj } from "@storybook/vue3-vite";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import { h, ref } from "vue";
import UiCounter from "../../app/components/ui/counter.vue";
import { isWonByCounter, nextCount } from "../../shared/utils/counter";
import { expectQuietAfter, finish, parkPointer, repaint, settled } from "../support/component-checks";
import { chip, headingCss } from "../support/html";
import { animations, frames, particleCount, withDialect, withMotion } from "../support/motion-play";
import { withMotionSurface } from "../support/motion-surface";

// The app's own UiCounter (#319): the handoff's counter (03-components.md, `counter`; `.w-counter` in the reference CSS and
// the counter card, where the prototype wins). No screen uses it yet; R3 swaps it for today's pill. The names of the
// games and the headings are story strings. The rules (clamp, win, un-win) are the caller's: `Wired` applies the app's own
// `nextCount` and `isWonByCounter`, never a copy of them.

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

const meta = {
  title: "UI/Counter",
  decorators: [withMotionSurface],
  args: {
    onStep: fn(),
    onSet: fn(),
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

interface Spied {
  onStep: ReturnType<typeof fn>;
  onSet: ReturnType<typeof fn>;
}
const spied = (args: unknown) => args as Spied;

/** The counter as the story's caller holds it: the props, and the two events the spy takes. */
function counter(args: Spied, props: Record<string, unknown>) {
  return h(UiCounter, { onStep: args.onStep, onSet: args.onSet, ...props });
}

const findInput = (scope: HTMLElement, name = "Counter") => within(scope).findByRole("spinbutton", { name });
const findButton = (scope: HTMLElement, name: string) => within(scope).findByRole("button", { name });

/** What a token resolves to as a background, read through a probe: the token's own value, not a copy of it. */
function colourOf(token: string, canvasElement: HTMLElement) {
  const probe = document.createElement("span");
  probe.style.backgroundColor = `var(${token})`;
  canvasElement.append(probe);
  const colour = getComputedStyle(probe).backgroundColor;
  probe.remove();
  return colour;
}

const wellOf = (scope: HTMLElement) => scope.querySelector<HTMLElement>("[data-well]")!;
const countOf = (scope: HTMLElement) => scope.querySelector<HTMLElement>("[data-count]")!;

export const Normal: Story = {
  render: args => () => page("Counter", labelled("value 87, target 120", counter(spied(args), { value: 87, target: 120 }))),
  async play({ canvasElement, args }) {
    const { onStep } = spied(args);
    onStep.mockClear();
    const input = await findInput(canvasElement);
    const decrease = await findButton(canvasElement, "Decrease");
    const increase = await findButton(canvasElement, "Increase");
    expect(input).toHaveValue(87);
    // The two buttons and the count are one widget, and a screen reader hears them as a group, not three loose controls.
    const group = within(canvasElement).getByRole("group");
    expect(group).toBe(canvasElement.querySelector("[data-counter]"));
    expect(group).not.toHaveAttribute("aria-disabled");

    await expectQuietAfter(async () => {
      await userEvent.click(increase);
      await userEvent.click(decrease);
    });
    expect(onStep).toHaveBeenCalledTimes(2);
    expect(onStep).toHaveBeenNthCalledWith(1, 1);
    expect(onStep).toHaveBeenNthCalledWith(2, -1);
    // The component holds no count of its own: the parent did not change the prop, so nothing moved. In full motion the
    // buttons' own release jelly plays, but the count and the well, which are this component's, are not animated.
    expect(input).toHaveValue(87);
    await withMotion("full", async () => {
      await userEvent.click(increase);
      await frames(3);
      expect(animations().filter(a => [
        wellOf(canvasElement),
        countOf(canvasElement),
      ].includes((a.effect as KeyframeEffect).target as HTMLElement))).toHaveLength(0);
    });
    expect(within(canvasElement).getByText("/ 120")).toHaveAttribute("aria-hidden", "true");

    await parkPointer();
    await finish(canvasElement);
  },
};

export const AtTarget: Story = {
  render: args => () => page("Counter at target", labelled("value 150, target 150", counter(spied(args), { value: 150, target: 150 }))),
  async play({ canvasElement, args }) {
    const { onStep } = spied(args);
    onStep.mockClear();
    await frames(3);
    // Nothing animates at load: the end state is drawn.
    expect(animations()).toHaveLength(0);
    const increase = await findButton(canvasElement, "Increase");
    const decrease = await findButton(canvasElement, "Decrease");
    expect(getComputedStyle(wellOf(canvasElement)).backgroundColor).toBe(colourOf("--color-won", canvasElement));
    expect(increase).toBeDisabled();

    await userEvent.click(increase);
    expect(onStep).not.toHaveBeenCalled();
    await userEvent.click(decrease);
    expect(onStep).toHaveBeenCalledTimes(1);
    expect(onStep).toHaveBeenLastCalledWith(-1);

    await parkPointer();
    await finish(canvasElement);
  },
};

export const Editing: Story = {
  render: args => () => page("Counter editing", labelled("value 88, target 120", counter(spied(args), { value: 88, target: 120 }))),
  async play({ canvasElement, args }) {
    const { onSet } = spied(args);
    onSet.mockClear();
    const input = await findInput(canvasElement);
    expect(input).toHaveValue(88);

    await expectQuietAfter(async () => {
      // Enter saves, and the shown count goes back to what the parent holds: this parent never takes it.
      await userEvent.clear(input);
      await userEvent.type(input, "95{Enter}");
      expect(onSet).toHaveBeenCalledTimes(1);
      expect(onSet).toHaveBeenLastCalledWith(95);
      await waitFor(() => expect(input).toHaveValue(88));
      expect(input).not.toHaveFocus();
    });

    // Leaving the field saves too.
    onSet.mockClear();
    await userEvent.clear(input);
    await userEvent.type(input, "96");
    expect(onSet).not.toHaveBeenCalled();
    await userEvent.tab();
    expect(onSet).toHaveBeenCalledTimes(1);
    expect(onSet).toHaveBeenLastCalledWith(96);
    await waitFor(() => expect(input).toHaveValue(88));

    // Esc gives the edit up: nothing is asked and nothing animates.
    onSet.mockClear();
    await userEvent.clear(input);
    await userEvent.type(input, "97{Escape}");
    await frames(3);
    expect(onSet).not.toHaveBeenCalled();
    expect(input).toHaveValue(88);
    expect(input).not.toHaveFocus();
    expect(animations()).toHaveLength(0);

    // An empty count is not a number: nothing is asked, the count comes back.
    await userEvent.clear(input);
    await userEvent.type(input, "{Enter}");
    expect(onSet).not.toHaveBeenCalled();
    await waitFor(() => expect(input).toHaveValue(88));

    // The count the parent already holds is not news.
    await userEvent.clear(input);
    await userEvent.type(input, "88{Enter}");
    expect(onSet).not.toHaveBeenCalled();
    expect(input).toHaveValue(88);

    // Enter blurs the field, and that blur must not save a second time.
    await userEvent.clear(input);
    await userEvent.type(input, "99{Enter}");
    await frames(3);
    expect(onSet).toHaveBeenCalledTimes(1);
    expect(onSet).toHaveBeenLastCalledWith(99);
    await waitFor(() => expect(input).toHaveValue(88));

    // The picture: the card's own ring, an outline of the thin border at 2px, and none of the input's own box-shadow ring.
    (document.activeElement as HTMLElement | null)?.blur();
    input.focus();
    await frames(2);
    expect(input).toHaveFocus();
    expect(input.matches(":focus-visible")).toBe(true);
    const ring = getComputedStyle(input);
    expect(ring.outlineStyle).toBe("solid");
    expect(ring.outlineWidth).toBe("2px");
    expect(ring.outlineOffset).toBe("2px");
    expect(ring.outlineColor).toBe(colourOf("--color-focus", canvasElement));
    expect(ring.boxShadow).toBe("none");
    expect(animations()).toHaveLength(0);
    await repaint(canvasElement);
    await parkPointer();
  },
};

export const Disabled: Story = {
  render: args => () => page("Counter disabled", labelled("disabled, value 19, target 19", counter(spied(args), { value: 19, target: 19, disabled: true }))),
  async play({ canvasElement, args }) {
    const { onStep, onSet } = spied(args);
    onStep.mockClear();
    onSet.mockClear();
    const input = await findInput(canvasElement);
    const decrease = await findButton(canvasElement, "Decrease");
    const increase = await findButton(canvasElement, "Increase");
    for (const el of [decrease, increase, input])
      expect(el).toBeDisabled();

    await userEvent.click(decrease);
    await userEvent.click(increase);
    await userEvent.click(input);
    await userEvent.tab();
    expect(document.activeElement).toBe(document.body);
    expect(onStep).not.toHaveBeenCalled();
    expect(onSet).not.toHaveBeenCalled();

    // The group says it is disabled, which a role-less `div` may not (ARIA 1.2); the dimmed `/ target` is part of it.
    expect(within(canvasElement).getByRole("group")).toHaveAttribute("aria-disabled", "true");

    // The whole counter is dimmed once: the buttons and the count do not dim themselves on top of it.
    expect(getComputedStyle(canvasElement.querySelector("[data-counter]")!).opacity).toBe("0.45");
    for (const el of [decrease, increase, input])
      expect(getComputedStyle(el).opacity).toBe("1");

    await parkPointer();
    await finish(canvasElement);
  },
};

interface Case {
  id: string;
  value: number;
  target: number;
  subject?: string;
}

const CASES: Case[] = [
  { id: "0 of 5", value: 0, target: 5 },
  { id: "1 of 1", value: 1, target: 1 },
  { id: "2 of 2", value: 2, target: 2 },
  { id: "9999 of 9999", value: 9999, target: 9999 },
  { id: "7 of 5", value: 7, target: 5 },
  {
    id: "3 of 10, with a subject",
    value: 3,
    target: 10,
    subject: "Boss Rush",
  },
];

const caseOf = (canvasElement: HTMLElement, id: string) => within(canvasElement).getByRole("group", { name: id });

export const Edges: Story = {
  render: args => () => page("Counter edges", ...CASES.map(({ id, value, target, subject }) =>
    h("div", { "role": "group", "aria-label": id, "data-case": id }, [
      labelled(id, counter(spied(args), { value, target, subject })),
    ]))),
  async play({ canvasElement, args }) {
    const { onStep } = spied(args);
    onStep.mockClear();
    await frames(3);
    expect(animations()).toHaveLength(0);

    // Nothing to take away at 0: Decrease is off and Increase asks.
    const zero = caseOf(canvasElement, "0 of 5");
    expect(await findButton(zero, "Decrease")).toBeDisabled();
    await userEvent.click(await findButton(zero, "Increase"));
    expect(onStep).toHaveBeenCalledTimes(1);
    expect(onStep).toHaveBeenLastCalledWith(1);

    // At the Target, however it got there, nothing more can be added; one can still take away.
    for (const id of [
      "1 of 1",
      "2 of 2",
      "9999 of 9999",
      "7 of 5",
    ]) {
      const box = caseOf(canvasElement, id);
      expect(await findButton(box, "Increase")).toBeDisabled();
      expect(await findButton(box, "Decrease")).toBeEnabled();
      expect(getComputedStyle(wellOf(box)).backgroundColor).toBe(colourOf("--color-won", canvasElement));
    }
    expect(await findInput(caseOf(canvasElement, "7 of 5"))).toHaveValue(7);
    expect(getComputedStyle(wellOf(zero)).backgroundColor).not.toBe(colourOf("--color-won", canvasElement));

    // The longest count: the well grows past its minimum and nothing clips, scrolls or runs past the page.
    const longest = caseOf(canvasElement, "9999 of 9999");
    const well = wellOf(longest);
    expect(well.getBoundingClientRect().width).toBeGreaterThan(96);
    expect(well.scrollWidth).toBeLessThanOrEqual(well.clientWidth);
    const input = await findInput(longest);
    expect(input.scrollWidth).toBeLessThanOrEqual(input.clientWidth);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(document.documentElement.clientWidth);

    // The subject only changes the names.
    const named = caseOf(canvasElement, "3 of 10, with a subject");
    await findButton(named, "Decrease Boss Rush");
    await findButton(named, "Increase Boss Rush");
    await findInput(named, "Boss Rush count");

    await parkPointer();
    await finish(canvasElement);
  },
};

export const Wired: Story = {
  render: () => {
    const count = ref(1);
    const target = ref(3);
    const won = ref(false);
    // The caller's rules: today's `nextCount` and `isWonByCounter`, from the shared module.
    const apply = (next: number) => {
      count.value = next;
      won.value = isWonByCounter({ count: next, target: target.value });
    };
    const onStep = (delta: 1 | -1) => apply(nextCount({ count: count.value, target: target.value }, delta));
    const onSet = (n: number) => apply(Math.min(Math.max(n, 0), target.value));
    return () => page("Counter wired", labelled("rules of today's counter", h("span", { "data-status": "" }, won.value ? "Won" : "Open"), h(UiCounter, {
      value: count.value,
      target: target.value,
      onStep,
      onSet,
    })));
  },
  async play({ canvasElement }) {
    const input = await findInput(canvasElement);
    const decrease = await findButton(canvasElement, "Decrease");
    const increase = await findButton(canvasElement, "Increase");
    const well = wellOf(canvasElement);
    const matcha = colourOf("--color-won", canvasElement);
    const status = () => canvasElement.querySelector("[data-status]")!;
    const firstKeyframe = (a: Animation) => (a.effect as KeyframeEffect).getKeyframes()[0]!.transform;
    const rolling = () => animations().find(a => (a.effect as KeyframeEffect).target === countOf(canvasElement));
    expect(input).toHaveValue(1);
    expect(status()).toHaveTextContent("Open");

    // Reduced first: a finished full-motion animation would stay in the document and fail the quiet check.
    await expectQuietAfter(async () => {
      await userEvent.click(increase);
      await userEvent.click(increase);
      await waitFor(() => expect(input).toHaveValue(3));
      expect(status()).toHaveTextContent("Won");
      expect(getComputedStyle(well).backgroundColor).toBe(matcha);
      expect(increase).toBeDisabled();
      // The button that switched itself off must not drop the keyboard to the page.
      expect(document.activeElement).toBe(input);

      await userEvent.click(decrease);
      await waitFor(() => expect(input).toHaveValue(2));
      expect(status()).toHaveTextContent("Open");
      await userEvent.click(decrease);
      await waitFor(() => expect(input).toHaveValue(1));
    });

    await withDialect(null, async () => {
      await withMotion("full", async () => {
        // R23: the count rolls up when it goes up.
        await userEvent.click(increase);
        await waitFor(() => {
          const roll = rolling();
          expect(roll).toBeDefined();
          expect(firstKeyframe(roll!)).toBe("translateY(70%)");
        });
        await settled();
        expect(input).toHaveValue(2);

        // R24: reaching the Target jellies the well and sparks on the surface's layer.
        await userEvent.click(increase);
        await waitFor(() => expect(input).toHaveValue(3));
        await waitFor(() => {
          expect(animations().some(a => (a.effect as KeyframeEffect).target === well && a.playState === "running")).toBe(true);
          expect(particleCount()).toBeGreaterThan(0);
        });
        expect(status()).toHaveTextContent("Won");
        await waitFor(() => expect(particleCount()).toBe(0), { timeout: 4000 });
        await settled();

        // Taking one away rolls down and un-wins: no jelly, no spark.
        await userEvent.click(decrease);
        await waitFor(() => {
          const roll = rolling();
          expect(roll).toBeDefined();
          expect(firstKeyframe(roll!)).toBe("translateY(-70%)");
        });
        await waitFor(() => expect(input).toHaveValue(2));
        expect(status()).toHaveTextContent("Open");
        expect(getComputedStyle(well).backgroundColor).not.toBe(matcha);
        expect(particleCount()).toBe(0);
        expect(animations().some(a => (a.effect as KeyframeEffect).target === well)).toBe(false);
        await settled();
      });
    });

    // Typed counts go through the caller's rules too: above the Target is clamped, below nothing is clamped to 0.
    await userEvent.clear(input);
    await userEvent.type(input, "999{Enter}");
    await waitFor(() => expect(input).toHaveValue(3));
    expect(status()).toHaveTextContent("Won");

    await userEvent.clear(input);
    await userEvent.type(input, "0{Enter}");
    await waitFor(() => expect(input).toHaveValue(0));
    expect(status()).toHaveTextContent("Open");
    expect(decrease).toBeDisabled();

    // Nothing changed, so nothing plays: the caller clamped -3 to the count it already held.
    // (Animations of the steps above that have finished stay in the document, so only a new one counts.)
    await withMotion("full", async () => {
      const before = new Set(animations());
      await userEvent.clear(input);
      await userEvent.type(input, "-3{Enter}");
      await frames(3);
      expect(input).toHaveValue(0);
      expect(animations().filter(a => !before.has(a))).toHaveLength(0);
    });

    await userEvent.clear(input);
    await userEvent.type(input, "1{Enter}");
    await waitFor(() => expect(input).toHaveValue(1));
    expect(status()).toHaveTextContent("Open");

    await settled();
    await finish(canvasElement);
    await parkPointer();
  },
};
