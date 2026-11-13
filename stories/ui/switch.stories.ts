import type { Meta, StoryObj } from "@storybook/vue3-vite";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import { h, ref } from "vue";
import UiSwitch from "../../app/components/ui/switch.vue";
import { expectQuietAfter } from "../support/component-checks";
import { chip, headingCss } from "../support/html";
import { animations, frames, withMotion } from "../support/motion-play";
import { withMotionSurface } from "../support/motion-surface";

// The app's own UiSwitch (#316): the handoff's 50 x 30 pill switch (03-components.md, `switch`). No screen uses it
// yet; R3 places it in the add row's counter toggle. The label is a story string: the real copy is R3's.

const LABEL = "Counter";

// Geometry from the reference CSS (`.w-switch`): the knob sits 4px from the track's left edge when off and 20px
// further when on.
const REST = 4;
const TRAVEL = 20;

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
    style: "display:flex;align-items:center;gap:16px;padding:16px;background:var(--color-surface);"
      + "border-radius:var(--radius-xl)",
  }, [
    ...body,
    h("div", {
      innerHTML: chip(story),
    }),
  ]);
}

const meta = {
  title: "UI/Switch",
  decorators: [withMotionSurface],
  args: {
    "onUpdate:modelValue": fn(),
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

interface Spied { "onUpdate:modelValue": ReturnType<typeof fn> }

const findSwitch = (canvasElement: HTMLElement) => within(canvasElement).findByRole("switch", { name: LABEL });

export const Off: Story = {
  render: args => () => page("Switch off", labelled("modelValue false", h(UiSwitch, {
    modelValue: false,
    label: LABEL,
    ...args,
  }))),
  async play({ canvasElement, args }) {
    const spy = (args as unknown as Spied)["onUpdate:modelValue"];
    const el = await findSwitch(canvasElement);
    expect(el).toHaveAttribute("aria-checked", "false");

    await userEvent.click(el);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenLastCalledWith(true);
    // The component holds no state of its own: the parent did not change the prop.
    expect(el).toHaveAttribute("aria-checked", "false");

    await userEvent.keyboard(" ");
    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy).toHaveBeenLastCalledWith(true);
    expect(el).toHaveAttribute("aria-checked", "false");

    // The picture shows the state, not the ring the interaction left: only `Focus` shows the ring.
    el.blur();
  },
};

export const On: Story = {
  render: args => () => page("Switch on", labelled("modelValue true", h(UiSwitch, {
    modelValue: true,
    label: LABEL,
    ...args,
  }))),
  async play({ canvasElement, args }) {
    const spy = (args as unknown as Spied)["onUpdate:modelValue"];
    const el = await findSwitch(canvasElement);
    expect(el).toHaveAttribute("aria-checked", "true");

    await userEvent.click(el);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenLastCalledWith(false);
    expect(el).toHaveAttribute("aria-checked", "true");

    el.blur();
  },
};

export const Disabled: Story = {
  render: args => () => page("Switch disabled", labelled("disabled", h(UiSwitch, {
    modelValue: false,
    label: LABEL,
    disabled: true,
    ...args,
  }))),
  async play({ canvasElement, args }) {
    const spy = (args as unknown as Spied)["onUpdate:modelValue"];
    const el = await findSwitch(canvasElement);
    expect(el).toBeDisabled();

    await userEvent.click(el);
    await userEvent.keyboard(" ");
    await userEvent.tab();
    expect(el).not.toHaveFocus();
    expect(spy).not.toHaveBeenCalled();
  },
};

export const Focus: Story = {
  render: args => () => page("Switch focus", labelled("keyboard focus", h(UiSwitch, {
    modelValue: false,
    label: LABEL,
    ...args,
  }))),
  async play({ canvasElement }) {
    const el = await findSwitch(canvasElement);
    // Tab, so the focus is keyboard-driven and `:focus-visible` matches.
    await userEvent.tab();
    expect(el).toHaveFocus();
    expect(el.matches(":focus-visible")).toBe(true);
    const ring = getComputedStyle(el);
    expect(ring.outlineStyle).toBe("solid");
    expect(ring.outlineWidth).not.toBe("0px");
  },
};

// The left edge of the knob, measured from the track's left edge.
function knobLeft(track: HTMLElement) {
  return track.firstElementChild!.getBoundingClientRect().left - track.getBoundingClientRect().left;
}

export const Toggling: Story = {
  render: () => {
    const on = ref(false);
    return () => page("Switch toggling", labelled("stateful", h(UiSwitch, {
      "modelValue": on.value,
      "label": LABEL,
      "onUpdate:modelValue": (value: boolean) => {
        on.value = value;
      },
    })));
  },
  async play({ canvasElement, step }) {
    const el = await findSwitch(canvasElement);

    // Reduced first: a finished full-motion animation would stay in the document and fail the quiet check.
    await step("reduced: no animation, the knob sits at its end position", async () => {
      await expectQuietAfter(async () => {
        await userEvent.click(el);
        await waitFor(() => expect(el).toHaveAttribute("aria-checked", "true"));
      });
      expect(Math.abs(knobLeft(el) - (REST + TRAVEL))).toBeLessThan(0.5);

      await expectQuietAfter(async () => {
        await userEvent.click(el);
        await waitFor(() => expect(el).toHaveAttribute("aria-checked", "false"));
      });
      expect(Math.abs(knobLeft(el) - REST)).toBeLessThan(0.5);
    });

    await step("full motion: one animation per change, on the knob", () => withMotion("full", async () => {
      const knob = el.firstElementChild!;
      expect(animations()).toHaveLength(0);

      await userEvent.click(el);
      await waitFor(() => expect(animations()).toHaveLength(1));
      const toOn = animations()[0]!;
      expect((toOn.effect as KeyframeEffect).target).toBe(knob);
      await toOn.finished;
      await frames();
      expect(el).toHaveAttribute("aria-checked", "true");
      expect(Math.abs(knobLeft(el) - (REST + TRAVEL))).toBeLessThan(0.5);

      await userEvent.click(el);
      await waitFor(() => expect(animations()).toHaveLength(1));
      const toOff = animations()[0]!;
      expect((toOff.effect as KeyframeEffect).target).toBe(knob);
      await toOff.finished;
      await frames();
      expect(el).toHaveAttribute("aria-checked", "false");
      expect(Math.abs(knobLeft(el) - REST)).toBeLessThan(0.5);
    }));

    // Ends as `Off` does, ring included, so the two pictures match.
    el.blur();
  },
};
