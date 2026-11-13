import type { Meta, StoryObj } from "@storybook/vue3-vite";
import type { MaterialIconName } from "../../app/utils/material-icons";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import { defineComponent, h, ref } from "vue";
import UiIconButton from "../../app/components/ui/icon-button.vue";
import { expectQuietAfter, finish, freezeSpinners, settled } from "../support/component-checks";
import { chip, headingCss } from "../support/html";
import { animations, frames, withDialect, withMotion } from "../support/motion-play";
import { withMotionSurface } from "../support/motion-surface";
import { realPointer } from "../support/real-pointer";

// The app's own UiIconButton (#310): the handoff's round icon button (03-components.md, `icon-button`; `.w-btn--icon` in the
// reference CSS and the buttons card, where the prototypes win). It is `UiButton`'s icon-only form, so its hover, press,
// jelly, busy and focus are the button's; these stories check what a person sees of them on the round one. The labels are
// story strings, the real ones are the screens'.

type Variant = "default" | "primary" | "ghost";
type Size = "default" | "sm";

// One row per button: its variant, size, icon and label. The four icons of the card are all drawn.
const ITEMS: readonly (readonly [Variant, Size, MaterialIconName, string])[] = [
  [
    "default",
    "default",
    "add",
    "Add",
  ],
  [
    "default",
    "sm",
    "add",
    "Add small",
  ],
  [
    "primary",
    "default",
    "play_arrow",
    "Play",
  ],
  [
    "primary",
    "sm",
    "play_arrow",
    "Play small",
  ],
  [
    "ghost",
    "default",
    "more_vert",
    "More",
  ],
  [
    "ghost",
    "sm",
    "close",
    "Close small",
  ],
];

// Glyphs of the slot button (the Counter target's own, which has no Material counterpart) are wider than the 28px icon.
const SLOT_LABEL = "Counter target";
const SLOT_GLYPH_WIDTH = 36;

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

// Every button on a surface panel with its story chip beside it: the colours of all three variants, ghost included, are
// judged by axe against the panel.
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

type Props = Record<string, unknown>;

interface Spied {
  onClick: ReturnType<typeof fn>;
  onSubmit: ReturnType<typeof fn>;
  onSave: ReturnType<typeof fn>;
}
const spied = (args: unknown) => args as Spied;

/** The glyph of the slot button: a plain element, because stories resolve no Nuxt-only component. */
function glyph() {
  return h("span", {
    "data-glyph": "",
    "aria-hidden": "true",
    "style": `display:block;width:${SLOT_GLYPH_WIDTH}px;height:${SLOT_GLYPH_WIDTH}px;border-radius:50%;background:currentColor`,
  });
}

/** The six buttons in three panels, one per variant, and the slot button; `extra` is the state a story forces. */
function buttons(args: Spied, extra: Props = {}, withSlot = true) {
  const panels = (["default", "primary", "ghost"] as const).map(variant => labelled(variant, ...ITEMS
    .filter(([v]) => v === variant)
    .map(([, size, icon, label]) => h(UiIconButton, {
      variant,
      size,
      icon,
      label,
      onClick: args.onClick,
      ...extra,
    }))));
  if (withSlot) {
    panels.push(labelled("slot", h(UiIconButton, {
      label: SLOT_LABEL,
      onClick: args.onClick,
      ...extra,
    }, () => glyph())));
  }
  return panels;
}

const meta = {
  title: "UI/Icon button",
  decorators: [withMotionSurface],
  args: {
    onClick: fn(),
    onSave: fn(),
    onSubmit: fn(),
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const findButton = (canvasElement: HTMLElement, name: string) => within(canvasElement).findByRole("button", { name });

/** The button of each ITEMS row, in order. */
const findItems = (canvasElement: HTMLElement) => Promise.all(ITEMS.map(([, , , label]) => findButton(canvasElement, label)));

const iconOf = (button: HTMLElement) => button.querySelector("svg");

export const Default: Story = {
  render: args => () => page("Icon button", ...buttons(spied(args))),
  async play({ canvasElement }) {
    // The sizes are tokens (`--icon-btn`, `--icon-btn-sm`) and the same in every dialect.
    await withDialect(null, async () => {
      for (const [, size, , label] of ITEMS) {
        const button = await findButton(canvasElement, label);
        // The icon is aria-hidden, so the name is the label alone: never "Add add".
        expect(button).toHaveAccessibleName(label);
        expect(button.tagName).toBe("BUTTON");
        expect(button).toHaveAttribute("type", "button");
        expect(button).not.toHaveAttribute("title");
        // A plain button is not a toggle: `aria-pressed="false"` would announce it as one.
        expect(button).not.toHaveAttribute("aria-pressed");
        expect(button.textContent?.trim()).toBe("");

        const box = button.getBoundingClientRect();
        const edge = size === "sm"
          ? 38
          : 52;
        expect([box.width, box.height]).toEqual([edge, edge]);
        // `rounded-pill` on a square is a circle: the radius reaches half the side.
        expect(Number.parseFloat(getComputedStyle(button).borderTopLeftRadius)).toBeGreaterThanOrEqual(edge / 2);

        const icons = button.querySelectorAll("svg");
        expect(icons).toHaveLength(1);
        expect(getComputedStyle(icons[0]!).width).toBe(size === "sm"
          ? "22px"
          : "28px");
      }

      // The slot button draws its own glyph, wider than the icon, and the circle holds.
      const slot = await findButton(canvasElement, SLOT_LABEL);
      expect(slot).toHaveAccessibleName(SLOT_LABEL);
      expect(slot).not.toHaveAttribute("aria-pressed");
      expect(slot.querySelector("svg")).toBeNull();
      const glyphBox = slot.querySelector("[data-glyph]")!.getBoundingClientRect();
      expect(glyphBox.width).toBeGreaterThan(28);
      const box = slot.getBoundingClientRect();
      expect([box.width, box.height]).toEqual([52, 52]);
    });
    await finish(canvasElement);
  },
};

export const Hover: Story = {
  render: args => () => page(
    "Icon button hover",
    ...buttons(spied(args), { class: "is-hover" }, false),
    labelled("real pointer", h(UiIconButton, { icon: "add", label: "Real hover" })),
  ),
  async play({ canvasElement }) {
    const items = await findItems(canvasElement);
    const [plain, , primary] = items as [HTMLElement, HTMLElement, HTMLElement, HTMLElement, HTMLElement, HTMLElement];

    // Reduced first: the token is zero, so there is no lift, and `--dur-hover` is zero, so the change starts no transition.
    await withMotion("reduce", async () => {
      await settled();
      expect(getComputedStyle(plain).translate).toBe("0px");
      expect(animations()).toHaveLength(0);
    });

    await withMotion("full", async () => {
      // Workspace: the lift is half of `--hover-lift`, -2px (R01), for the clay variants at both sizes.
      await withDialect(null, async () => {
        await settled();
        for (const [index, [variant]] of ITEMS.entries()) {
          const button = items[index]!;
          if (variant === "ghost") {
            // Ghost is the one variant that changes colour on hover instead of lifting.
            expect(getComputedStyle(button).translate).toBe("none");
            expect(getComputedStyle(button).backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
          }
          else {
            expect(getComputedStyle(button).translate).toBe("0px -2px");
          }
        }
      });

      // Broadcast sets `--hover-lift: 0` (the token): no lift, and no code for it.
      await withDialect("broadcast", async () => {
        await settled();
        expect(getComputedStyle(primary).translate).toBe("0px");
      });

      // A forced class proves the CSS of the state, not that the browser's own `:hover` reaches it: one button is hovered
      // by a real pointer (the runner's; Storybook's UI cannot drive `:hover`).
      const pointer = await realPointer();
      if (pointer) {
        await withDialect(null, async () => {
          const real = await findButton(canvasElement, "Real hover");
          expect(getComputedStyle(real).translate).toBe("none");
          await pointer.hover(real);
          await waitFor(() => expect(real.matches(":hover")).toBe(true));
          await settled();
          expect(getComputedStyle(real).translate).toBe("0px -2px");
          await pointer.unhover(real);
          await waitFor(() => expect(real.matches(":hover")).toBe(false));
        });
      }
    });
    await finish(canvasElement);
  },
};

export const Active: Story = {
  render: args => () => page("Icon button active", ...buttons(spied(args), { class: "is-active" }, false)),
  async play({ canvasElement }) {
    const items = await findItems(canvasElement);
    await withDialect(null, async () => {
      await settled();
      for (const [index, [variant, size]] of ITEMS.entries()) {
        const button = items[index]!;
        if (variant === "ghost") {
          expect(getComputedStyle(button).translate).toBe("none");
          expect(getComputedStyle(button).boxShadow).not.toBe("none");
        }
        else {
          // The press collapses the lip: it moves down by the lip less 1px (R02), 5px at the default size, 3px at sm.
          expect(getComputedStyle(button).translate).toBe(size === "sm"
            ? "0px 3px"
            : "0px 5px");
          expect(getComputedStyle(button).boxShadow).not.toContain("inset");
        }
      }
    });
    await finish(canvasElement);
  },
};

export const Focus: Story = {
  render: args => () => page("Icon button focus", ...buttons(spied(args), { class: "is-focus" }, false)),
  async play({ canvasElement }) {
    // The forced ring (`is-focus`) is the same as the real one: both are checked.
    const items = await findItems(canvasElement);
    for (const button of items) {
      expect(getComputedStyle(button).outlineStyle).toBe("solid");
      expect(getComputedStyle(button).outlineWidth).not.toBe("0px");
    }

    const first = items[0]!;
    // Tab, so the focus is keyboard-driven and `:focus-visible` matches.
    await userEvent.tab();
    expect(first).toHaveFocus();
    expect(first.matches(":focus-visible")).toBe(true);
    const ring = getComputedStyle(first);
    expect(ring.outlineStyle).toBe("solid");
    expect(ring.outlineWidth).not.toBe("0px");
    // R32: the ring is never animated, so neither `outline` nor `all` is a transitioned property.
    expect(ring.transitionProperty).not.toMatch(/outline|\ball\b/);
    await finish(canvasElement);
  },
};

export const Disabled: Story = {
  render: args => () => page("Icon button disabled", ...buttons(spied(args), { disabled: true })),
  async play({ canvasElement, args }) {
    const spy = spied(args).onClick;
    spy.mockClear();
    const all = [
      ...await findItems(canvasElement),
      await findButton(canvasElement, SLOT_LABEL),
    ];
    for (const button of all) {
      expect(button).toBeDisabled();
      expect(getComputedStyle(button).opacity).toBe("0.45");
      expect(getComputedStyle(button).cursor).toBe("not-allowed");
      expect(getComputedStyle(button).translate).toBe("none");
      await userEvent.click(button);
    }
    await userEvent.keyboard(" ");
    // No Tab stop at all: the focus never lands on one of them.
    for (let i = 0; i < all.length; i++) {
      await userEvent.tab();
      expect(all.includes(document.activeElement as HTMLElement)).toBe(false);
    }
    expect(spy).not.toHaveBeenCalled();
    await finish(canvasElement);
  },
};

export const Busy: Story = {
  render: args => () => page("Icon button busy", ...buttons(spied(args), { busy: true })),
  async play({ canvasElement, args }) {
    const spy = spied(args).onClick;
    spy.mockClear();
    const all = [
      ...await findItems(canvasElement),
      await findButton(canvasElement, SLOT_LABEL),
    ];

    // Reduced first: the end state is the still spinner icon, and nothing is started.
    await expectQuietAfter(async () => {
      for (const button of all)
        expect(iconOf(button)).not.toBeNull();
    });

    for (const button of all) {
      expect(button).toHaveAttribute("aria-busy", "true");
      // A busy button stays focusable: it is not `disabled`. Its name is still the label: there is no busy word.
      expect(button).not.toBeDisabled();
      expect(getComputedStyle(button).cursor).toBe("progress");
      expect(getComputedStyle(button).translate).toBe("none");
      // The spinner replaces the glyph, the slot's too: one icon and none of the slot's own content.
      expect(button.querySelectorAll("svg")).toHaveLength(1);
      expect(button.querySelector("[data-glyph]")).toBeNull();
      expect(button.textContent?.trim()).toBe("");
    }
    for (const [, , , label] of ITEMS)
      expect(await findButton(canvasElement, label)).toHaveAccessibleName(label);

    await withMotion("full", async () => {
      // R35: the spinner turns on the engine's `spin` loop, one animation on each icon.
      for (const button of all) {
        await waitFor(() => expect(iconOf(button)!.getAnimations().filter(a => a.playState === "running")).toHaveLength(1));
        expect(iconOf(button)!.getAnimations()).toHaveLength(1);
      }
      freezeSpinners(canvasElement);

      // Clicks, Enter and Space take no effect.
      const first = all[0]!;
      await userEvent.click(first);
      first.focus();
      expect(first).toHaveFocus();
      await userEvent.keyboard("{Enter}");
      await userEvent.keyboard(" ");
    });
    expect(spy).not.toHaveBeenCalled();
    await finish(canvasElement);
  },
};

/** A toggle that keeps its own state, as a screen's `pressed` binding does. */
const Toggle = defineComponent({
  props: {
    initial: { type: Boolean, default: false },
    variant: { type: String as () => Variant, default: "default" },
    label: { type: String, required: true },
  },
  setup(props) {
    const on = ref(props.initial);
    return () => h(UiIconButton, {
      icon: "push_pin",
      label: props.label,
      variant: props.variant,
      pressed: on.value,
      onClick: () => {
        on.value = !on.value;
      },
    });
  },
});

export const Pressed: Story = {
  render: () => () => page(
    "Icon button pressed",
    labelled("off, then on", h(Toggle, { label: "Pin" })),
    labelled("on from the start", h(Toggle, { label: "Pinned", initial: true })),
    labelled("ghost", h(Toggle, { label: "Pin ghost", variant: "ghost", initial: true })),
  ),
  async play({ canvasElement }) {
    const pin = await findButton(canvasElement, "Pin");
    const pinned = await findButton(canvasElement, "Pinned");
    const ghost = await findButton(canvasElement, "Pin ghost");

    await withMotion("reduce", async () => {
      // `aria-pressed` is the state, and the name does not change with it.
      expect(pin).toHaveAttribute("aria-pressed", "false");
      await userEvent.click(pin);
      await waitFor(() => expect(pin).toHaveAttribute("aria-pressed", "true"));
      expect(pin).toHaveAccessibleName("Pin");
      await userEvent.click(pin);
      await waitFor(() => expect(pin).toHaveAttribute("aria-pressed", "false"));
      await userEvent.click(pin);
      await waitFor(() => expect(pin).toHaveAttribute("aria-pressed", "true"));
    });

    // The human's decision (#310): a pressed button holds the press-down look. The lip is collapsed, so it sits 5px down,
    // as the `Active` story's does, and a hover does not lift it.
    await withMotion("full", async () => {
      await withDialect(null, async () => {
        await settled();
        for (const button of [pin, pinned]) {
          expect(getComputedStyle(button).translate).toBe("0px 5px");
          expect(getComputedStyle(button).boxShadow).not.toContain("inset");
        }
        const rest = getComputedStyle(pin).translate;
        pin.classList.add("is-hover");
        await settled();
        expect(getComputedStyle(pin).translate).toBe(rest);
        pin.classList.remove("is-hover");

        // Ghost holds the 14% fill and the well, and has no lift to give up.
        expect(getComputedStyle(ghost).translate).toBe("none");
        expect(getComputedStyle(ghost).boxShadow).not.toBe("none");
        const held = getComputedStyle(ghost).backgroundColor;
        expect(held).not.toBe("rgba(0, 0, 0, 0)");
        ghost.classList.add("is-hover");
        await settled();
        expect(getComputedStyle(ghost).backgroundColor).toBe(held);
        ghost.classList.remove("is-hover");
      });
    });
    await finish(canvasElement);
  },
};

export const Pressing: Story = {
  render: (args) => {
    const busy = ref(false);
    const spy = spied(args);
    return () => page(
      "Icon button pressing",
      labelled("idle", h(UiIconButton, {
        variant: "primary",
        icon: "play_arrow",
        label: "Press",
        onClick: spy.onClick,
      })),
      // Stateful: a press makes it busy for a moment, as a save does.
      labelled("stateful", h(UiIconButton, {
        icon: "check",
        label: "Save",
        busy: busy.value,
        onClick: (e: MouseEvent) => {
          spy.onSave(e);
          busy.value = true;
          setTimeout(() => {
            busy.value = false;
          }, 2500);
        },
      })),
      labelled("submit", h("form", {
        style: "display:flex;gap:16px",
        onSubmit: (e: Event) => {
          e.preventDefault();
          spy.onSubmit(e);
        },
      }, [
        h(UiIconButton, {
          variant: "primary",
          icon: "add",
          label: "Send",
          type: "submit",
        }),
        h(UiIconButton, {
          variant: "primary",
          icon: "add",
          label: "Send again",
          type: "submit",
          busy: true,
        }),
      ])),
    );
  },
  async play({ canvasElement, args, step }) {
    const { onClick, onSave, onSubmit } = spied(args);
    onClick.mockClear();
    onSave.mockClear();
    onSubmit.mockClear();

    const press = await findButton(canvasElement, "Press");
    const save = await findButton(canvasElement, "Save");

    // The animations that act on one button or its icon, whatever the rest of the page runs.
    const on = (el: HTMLElement) => animations().filter(a => el.contains((a.effect as KeyframeEffect | null)?.target ?? null));

    // Reduced first: a finished full-motion animation stays in the document and would fail the quiet check.
    await step("reduced: a click, a hover and a busy render start nothing", async () => {
      await expectQuietAfter(async () => {
        await userEvent.click(press);
        press.classList.add("is-hover");
        await frames();
        press.classList.remove("is-hover");
        await userEvent.click(save);
        await waitFor(() => expect(save).toHaveAttribute("aria-busy", "true"));
        // Static: the icon, no loop.
        expect(save).toHaveAccessibleName("Save");
        expect(iconOf(save)).not.toBeNull();
      });
      expect(onClick).toHaveBeenCalledTimes(1);
      await waitFor(() => expect(save).not.toHaveAttribute("aria-busy", "true"), { timeout: 5000 });
    });

    await step("full motion: a click plays the jelly on the button", () => withMotion("full", async () => {
      onClick.mockClear();
      expect(on(press)).toHaveLength(0);
      await userEvent.click(press);
      await waitFor(() => expect(on(press)).toHaveLength(1));
      expect((on(press)[0]!.effect as KeyframeEffect).target).toBe(press);
      expect(onClick).toHaveBeenCalledTimes(1);
      await on(press)[0]!.finished;
      await frames();
    }));

    await step("busy ignores clicks, Enter, Space and submit, and stays focusable", () => withMotion("full", async () => {
      onSave.mockClear();
      await userEvent.click(save);
      await waitFor(() => expect(save).toHaveAttribute("aria-busy", "true"));
      expect(onSave).toHaveBeenCalledTimes(1);
      // R35: the spinner is one running animation, the engine's `spin` loop.
      await waitFor(() => expect(iconOf(save)!.getAnimations().filter(a => a.playState === "running")).toHaveLength(1));
      await waitFor(() => expect(on(save).filter(a => a.playState === "running")).toHaveLength(1));
      expect(save).not.toBeDisabled();

      save.focus();
      expect(save).toHaveFocus();
      await userEvent.click(save);
      await userEvent.keyboard("{Enter}");
      await userEvent.keyboard(" ");
      expect(onSave).toHaveBeenCalledTimes(1);
      // No press, no jelly: only the spinner runs.
      expect(on(save)).toHaveLength(1);

      // A busy submit button does not submit its form; an idle one does, once.
      const busySubmit = await findButton(canvasElement, "Send again");
      expect(busySubmit).toHaveAttribute("aria-busy", "true");
      await userEvent.click(busySubmit);
      busySubmit.focus();
      await userEvent.keyboard("{Enter}");
      expect(onSubmit).not.toHaveBeenCalled();
      await userEvent.click(await findButton(canvasElement, "Send"));
      expect(onSubmit).toHaveBeenCalledTimes(1);

      await waitFor(() => expect(save).not.toHaveAttribute("aria-busy", "true"), { timeout: 5000 });
    }));

    await finish(canvasElement);
  },
};
