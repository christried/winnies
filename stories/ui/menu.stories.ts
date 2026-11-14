import type { Meta, StoryObj } from "@storybook/vue3-vite";
import type { VNode } from "vue";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import { h } from "vue";
import UiButton from "../../app/components/ui/button.vue";
import UiIconButton from "../../app/components/ui/icon-button.vue";
import UiMenuItem from "../../app/components/ui/menu-item.vue";
import UiMenu from "../../app/components/ui/menu.vue";
import { expectQuietAfter, finish, parkPointer, settled } from "../support/component-checks";
import { headingCss } from "../support/html";
import { frames, withMotion } from "../support/motion-play";
import { withMotionSurface } from "../support/motion-surface";
import { realPointer } from "../support/real-pointer";
import { colourOf } from "../support/ui-kit";

// The app's own UiMenu and UiMenuItem (#313): the handoff's raised popover (03-components.md, `menu` and `menu-item`;
// the prototype where the reference CSS differs) that plays R04 on open and R05 on close, moves the focus with the
// keys of 07-accessibility.md, and gives it back to its trigger. Both components are here: an item cannot exist outside
// a menu, and axe wants a `role="menu"` around it. Every string below is story copy, not product copy.

const meta = {
  title: "UI/Menu",
  decorators: [withMotionSurface],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

// One spy per item. A story clears the ones it reads at its start: the module outlives a story.
const spies = {
  edit: fn(),
  add: fn(),
  pin: fn(),
  reset: fn(),
  duplicate: fn(),
  remove: fn(),
};
const clearSpies = () => Object.values(spies).forEach(spy => spy.mockClear());

/** The menu of a Challenge row: Reset timer is disabled, so the enabled order is Edit, Add counter, Pin, Duplicate, Delete. */
function plainItems(): VNode[] {
  return [
    h(UiMenuItem, { icon: "edit", onClick: spies.edit }, () => "Edit"),
    h(UiMenuItem, { icon: "exposure_plus_1", onClick: spies.add }, () => "Add counter"),
    h(UiMenuItem, { icon: "push_pin", onClick: spies.pin }, () => "Pin"),
    h(UiMenuItem, {
      icon: "restart_alt",
      disabled: true,
      meta: "soon",
      onClick: spies.reset,
    }, () => "Reset timer"),
    h(UiMenuItem, { icon: "control_point_duplicate", onClick: spies.duplicate }, () => "Duplicate"),
    h(UiMenuItem, { separator: true }),
    h(UiMenuItem, { icon: "delete", danger: true, onClick: spies.remove }, () => "Delete"),
  ];
}

/** Every state at once: the hover and focus rings are the story's hook classes, so the picture needs no pointer. */
function fullItems(): VNode[] {
  return [
    h(UiMenuItem, { icon: "edit", onClick: spies.edit }, () => "Edit"),
    h(UiMenuItem, { icon: "exposure_plus_1", class: "is-hover" }, () => "Add counter"),
    h(UiMenuItem, { icon: "push_pin", class: "is-focus" }, () => "Pin"),
    h(UiMenuItem, { icon: "restart_alt", disabled: true, meta: "soon" }, () => "Reset timer"),
    h(UiMenuItem, { icon: "control_point_duplicate", meta: "Ctrl+D" }, () => "Duplicate"),
    h(UiMenuItem, { current: true }, () => "Kitty vs. the world"),
    h(UiMenuItem, { separator: true }),
    h(UiMenuItem, { icon: "delete", danger: true }, () => "Delete"),
  ];
}

/** The trigger every menu of a story binds: a ghost icon button, as the Challenge rows have. */
function iconTrigger(label: string) {
  return ({ trigger }: { trigger: Record<string, unknown> }) => h(UiIconButton, {
    ...trigger,
    icon: "more_vert",
    label,
    variant: "ghost",
  });
}

function menu(props: Record<string, unknown>, items: VNode[], label = "Open menu") {
  return h(UiMenu, props, {
    trigger: iconTrigger(label),
    default: () => items,
  });
}

// The page is a landmark with a heading on a surface panel, so no text sits on the dialect backdrop (axe cannot judge
// contrast over it). The tall panel keeps the open menu inside the body the picture is cut from; the triggers sit at
// the right, so a menu that lines up with their right edge (`align="end"`, the default) opens into the page.
function page(title: string, ...body: VNode[]) {
  return h("section", {
    "aria-label": title,
    "style": "display:flex;flex-direction:column;align-items:flex-start;gap:16px;padding:24px",
  }, [
    h("div", {
      style: "display:flex;flex-direction:column;align-items:flex-start;gap:16px;padding:16px 20px;min-height:420px;"
        + "min-width:min(100%,440px);background:var(--color-surface);border-radius:var(--radius-xl)",
    }, [
      h("h1", { style: `${headingCss};font-size:var(--text-4xl);padding:0` }, title),
      h("div", { style: "display:flex;gap:12px;align-items:center;align-self:flex-end" }, [
        ...body,
        h(UiButton, {}, () => "After"),
      ]),
    ]),
  ]);
}

// The trigger is a `UiIconButton`, which draws a tooltip (#311) in front of the menu's own popover: it is not the wrapper.
const wrapperOf = (canvasElement: HTMLElement) => canvasElement.querySelector<HTMLElement>("[popover]:not([role=\"tooltip\"])")!;
const triggerOf = (canvasElement: HTMLElement, name = "Open menu") => within(canvasElement).getByRole("button", { name });
const afterOf = (canvasElement: HTMLElement) => within(canvasElement).getByRole("button", { name: "After" });
const isOpen = (wrapper: HTMLElement) => wrapper.matches(":popover-open");

/** Opens the menu with its trigger, as a person does, and waits until the panel is there. */
async function openByClick(canvasElement: HTMLElement, name = "Open menu") {
  await userEvent.click(triggerOf(canvasElement, name));
  return within(canvasElement).findByRole("menu", { name });
}

/** Opens the menu with ArrowDown on its trigger, which is where the keyboard starts. */
async function openByKey(canvasElement: HTMLElement, name = "Open menu") {
  triggerOf(canvasElement, name).focus();
  await userEvent.keyboard("{ArrowDown}");
  return within(canvasElement).findByRole("menu", { name });
}

/** R05 plays, then the popover leaves the top layer: waits for that. */
async function expectClosed(canvasElement: HTMLElement, wrapper = wrapperOf(canvasElement)) {
  await waitFor(() => expect(isOpen(wrapper)).toBe(false));
  expect(within(canvasElement).queryByRole("menu")).toBeNull();
}

const item = (menuEl: HTMLElement, name: string | RegExp) => within(menuEl).getByRole("menuitem", { name });

export const Closed: Story = {
  render: () => () => page("Menu closed", menu({}, plainItems())),
  async play({ canvasElement }) {
    const trigger = triggerOf(canvasElement);
    expect(trigger).toHaveAttribute("aria-haspopup", "menu");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(document.getElementById(trigger.getAttribute("aria-controls")!)).not.toBeNull();
    expect(within(canvasElement).queryByRole("menu")).toBeNull();
    expect(isOpen(wrapperOf(canvasElement))).toBe(false);

    await parkPointer();
    await finish(canvasElement);
  },
};

export const Open: Story = {
  render: () => () => page("Menu open", menu({ heading: "Logged in as Kitty" }, fullItems())),
  async play({ canvasElement }) {
    const trigger = triggerOf(canvasElement);
    const panel = await openByClick(canvasElement);
    await settled();

    const wrapper = wrapperOf(canvasElement);
    expect(isOpen(wrapper)).toBe(true);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(trigger.getAttribute("aria-controls")).toBe(wrapper.id);

    // Items are menuitems and the rule is the one separator; the heading is text, not an item.
    expect(within(panel).getAllByRole("menuitem")).toHaveLength(7);
    expect(within(panel).getAllByRole("separator")).toHaveLength(1);
    expect(within(panel).getByText("Logged in as Kitty")).toBeInTheDocument();

    // Opening puts the focus on the marked item (07-accessibility.md, Menus), here "Kitty vs. the world".
    const current = item(panel, "Kitty vs. the world");
    expect(current).toHaveFocus();
    expect(current).toHaveAttribute("aria-current", "true");
    expect(panel.querySelectorAll("[aria-current]")).toHaveLength(1);
    expect(item(panel, /^Reset timer/)).toBeDisabled();

    // Placed below the trigger with its right edge on the trigger's right edge (`align="end"`), 260px wide.
    const box = panel.getBoundingClientRect();
    const triggerBox = trigger.getBoundingClientRect();
    expect(box.top).toBeGreaterThanOrEqual(triggerBox.bottom);
    expect(Math.abs(box.right - triggerBox.right)).toBeLessThanOrEqual(1);
    expect(box.width).toBeCloseTo(260, 0);

    // The danger item is Cherry.
    expect(getComputedStyle(item(panel, "Delete")).color).toBe(colourOf("--color-danger-text"));
    expect(getComputedStyle(item(panel, "Edit")).color).not.toBe(colourOf("--color-danger-text"));

    // A real hover fills the item with the sunken colour: `userEvent` of "storybook/test" cannot drive `:hover`.
    const sunken = colourOf("--color-surface-sunken", "backgroundColor");
    const edit = item(panel, "Edit");
    expect(getComputedStyle(edit).backgroundColor).not.toBe(sunken);
    const pointer = await realPointer();
    if (pointer) {
      await pointer.hover(edit);
      expect(getComputedStyle(edit).backgroundColor).toBe(sunken);
    }

    // The picture is of the open menu: hover and focus are the hook classes of `fullItems`.
    await parkPointer();
    await finish(canvasElement);
    expect(isOpen(wrapper)).toBe(true);
  },
};

export const Navigation: Story = {
  render: () => () => page("Menu navigation", menu({}, plainItems())),
  async play({ canvasElement }) {
    clearSpies();
    await withMotion("full", async () => {
      // ArrowDown on the trigger opens it and focuses the first item.
      const panel = await openByKey(canvasElement);
      const edit = item(panel, "Edit");
      await waitFor(() => expect(edit).toHaveFocus());

      // Down thrice: Add counter, Pin, and Duplicate, because Reset timer is disabled.
      await userEvent.keyboard("{ArrowDown}");
      expect(item(panel, "Add counter")).toHaveFocus();
      await userEvent.keyboard("{ArrowDown}");
      expect(item(panel, "Pin")).toHaveFocus();
      await userEvent.keyboard("{ArrowDown}");
      expect(item(panel, "Duplicate")).toHaveFocus();

      // The ends wrap, and Home and End jump.
      await userEvent.keyboard("{Home}");
      expect(edit).toHaveFocus();
      await userEvent.keyboard("{ArrowUp}");
      expect(item(panel, "Delete")).toHaveFocus();
      await userEvent.keyboard("{ArrowDown}");
      expect(edit).toHaveFocus();
      await userEvent.keyboard("{End}");
      expect(item(panel, "Delete")).toHaveFocus();
      await userEvent.keyboard("{Home}");
      expect(edit).toHaveFocus();

      // Type-ahead: one letter, the next match after the focused item, wrapping, case-insensitive.
      await userEvent.keyboard("d");
      expect(item(panel, "Duplicate")).toHaveFocus();
      await userEvent.keyboard("d");
      expect(item(panel, "Delete")).toHaveFocus();
      await userEvent.keyboard("d");
      expect(item(panel, "Duplicate")).toHaveFocus();
      await userEvent.keyboard("D");
      expect(item(panel, "Delete")).toHaveFocus();
      await userEvent.keyboard("p");
      expect(item(panel, "Pin")).toHaveFocus();
      // The only "r" is the disabled Reset timer: nothing moves.
      await userEvent.keyboard("r");
      expect(item(panel, "Pin")).toHaveFocus();
      await userEvent.keyboard("a");
      expect(item(panel, "Add counter")).toHaveFocus();
      await userEvent.keyboard("e");
      expect(edit).toHaveFocus();

      // A click, Enter and Space each choose the item once and close the menu.
      await userEvent.click(edit);
      expect(spies.edit).toHaveBeenCalledTimes(1);
      await expectClosed(canvasElement);

      await openByKey(canvasElement);
      await waitFor(() => expect(item(within(canvasElement).getByRole("menu"), "Edit")).toHaveFocus());
      await userEvent.keyboard("{Enter}");
      expect(spies.edit).toHaveBeenCalledTimes(2);
      await expectClosed(canvasElement);

      await openByKey(canvasElement);
      await waitFor(() => expect(item(within(canvasElement).getByRole("menu"), "Edit")).toHaveFocus());
      await userEvent.keyboard(" ");
      expect(spies.edit).toHaveBeenCalledTimes(3);
      await expectClosed(canvasElement);

      // The picture is of the open menu with Pin focused (the ring is the hook class below, drawn by the focus itself).
      const again = await openByKey(canvasElement);
      await waitFor(() => expect(item(again, "Edit")).toHaveFocus());
      await userEvent.keyboard("{ArrowDown}{ArrowDown}");
      expect(item(again, "Pin")).toHaveFocus();
      await settled();
    });
    await parkPointer();
    await finish(canvasElement);
    expect(isOpen(wrapperOf(canvasElement))).toBe(true);
  },
};

export const Dismiss: Story = {
  render: () => () => page("Menu dismiss", menu({}, plainItems())),
  async play({ canvasElement }) {
    clearSpies();
    await withMotion("full", async () => {
      const trigger = triggerOf(canvasElement);

      // Esc closes it and the focus is on the trigger.
      await openByClick(canvasElement);
      await userEvent.keyboard("{Escape}");
      await expectClosed(canvasElement);
      expect(trigger).toHaveFocus();

      // A click elsewhere closes it and does not pull the focus back: the click took it.
      await openByClick(canvasElement);
      await userEvent.click(document.body);
      await expectClosed(canvasElement);
      expect(trigger).not.toHaveFocus();

      // Choosing an item: its handler ran once, and the focus is on the trigger (the item's own handler runs after).
      // What holds the focus when the handler runs is what a Rename's input or a Delete's modal would start from.
      let heldAtCall: Element | null = null;
      spies.pin.mockImplementationOnce(() => {
        heldAtCall = document.activeElement;
      });
      const panel = await openByClick(canvasElement);
      await userEvent.click(item(panel, "Pin"));
      expect(spies.pin).toHaveBeenCalledTimes(1);
      expect(heldAtCall).toBe(trigger);
      await expectClosed(canvasElement);
      expect(trigger).toHaveFocus();

      // Tab closes it and goes on from the trigger, to the button after it.
      await openByClick(canvasElement);
      await userEvent.tab();
      await expectClosed(canvasElement);
      expect(afterOf(canvasElement)).toHaveFocus();

      // The trigger toggles: a second click closes it.
      await userEvent.click(trigger);
      await within(canvasElement).findByRole("menu");
      await userEvent.click(trigger);
      await expectClosed(canvasElement);

      // A disabled item takes no click and the menu stays open.
      const open = await openByClick(canvasElement);
      await userEvent.click(item(open, /^Reset timer/));
      await frames(3);
      expect(spies.reset).not.toHaveBeenCalled();
      expect(isOpen(wrapperOf(canvasElement))).toBe(true);
      expect(within(canvasElement).getByRole("menu")).toBeInTheDocument();

      // Esc and ArrowDown at once: one menu, open, with the focus in it.
      await userEvent.keyboard("{Escape}");
      await userEvent.keyboard("{ArrowDown}");
      await waitFor(() => expect(within(canvasElement).getAllByRole("menu")).toHaveLength(1));
      await waitFor(() => expect(item(within(canvasElement).getByRole("menu"), "Edit")).toHaveFocus());
      expect(isOpen(wrapperOf(canvasElement))).toBe(true);

      // The picture is of the closed menu.
      await userEvent.keyboard("{Escape}");
      await expectClosed(canvasElement);
    });
    await parkPointer();
    await finish(canvasElement);
  },
};

export const Motion: Story = {
  render: () => () => page("Menu motion", menu({}, plainItems())),
  async play({ canvasElement }) {
    // Reduced first: it opens and closes at once and the engine starts nothing.
    await expectQuietAfter(async () => {
      await openByClick(canvasElement);
      await userEvent.keyboard("{Escape}");
      await expectClosed(canvasElement);
    });

    await withMotion("full", async () => {
      const panel = await openByClick(canvasElement);
      const wrapper = wrapperOf(canvasElement);
      // R04: the panel's own animation and one for each of its seven children.
      expect(panel.getAnimations({ subtree: true })).toHaveLength(1 + 7);
      await settled();

      // R05 plays on a popover that is still in the top layer: it leaves only after the animation has ended.
      await userEvent.keyboard("{Escape}");
      await frames(1);
      const leaving = wrapper.getAnimations({ subtree: true }).filter(a => a.playState === "running");
      expect(leaving.length).toBeGreaterThan(0);
      expect(isOpen(wrapper)).toBe(true);
      await Promise.all(leaving.map(a => a.finished));
      await expectClosed(canvasElement, wrapper);
    });
    await parkPointer();
    await finish(canvasElement);
  },
};

const WINNIES = [
  "Kitty vs. the world",
  "Hollow Knight Any%",
  "Extremely Long Winnie Name Run",
  "Elden Ring Randomizer",
  "Celeste Farewell",
  "Tunic Blindfolded",
  "Hades II Hell Mode",
  "Outer Wilds Speedrun",
  "Dark Souls No Hit",
  "Portal Glitchless",
  "Spelunky 2 Eggplant",
  "Pizza Tower Pacifist",
];

export const Wide: Story = {
  render: () => () => page(
    "Menu wide",
    h(UiMenu, { wide: true, align: "start" }, {
      trigger: ({ trigger }: { trigger: Record<string, unknown> }) => h(UiButton, {
        ...trigger,
        variant: "secondary",
        trailingIcon: "expand_more",
      }, () => "Kitty vs. the world"),
      default: () => WINNIES.map((name, i) => h(UiMenuItem, { current: i === 1, meta: "12.11.2026" }, () => name)),
    }),
  ),
  async play({ canvasElement }) {
    const trigger = triggerOf(canvasElement, "Kitty vs. the world");
    const panel = await openByClick(canvasElement, "Kitty vs. the world");
    await settled();

    // The marked item takes the focus and the panel's left edge is the trigger's: `align="start"`, 340px wide.
    expect(item(panel, /^Hollow Knight/)).toHaveFocus();
    const box = panel.getBoundingClientRect();
    expect(box.width).toBeCloseTo(340, 0);
    expect(Math.abs(box.left - trigger.getBoundingClientRect().left)).toBeLessThanOrEqual(1);

    // A name of 30 characters is cut with an ellipsis, not wrapped.
    const long = item(panel, /^Extremely Long/).querySelector<HTMLElement>("[data-menu-label]")!;
    expect(long.scrollWidth).toBeGreaterThan(long.clientWidth);

    // Twelve items are more than the panel shows: it is capped and scrolls, and End brings the last into view.
    expect(panel.scrollHeight).toBeGreaterThan(panel.clientHeight);
    await userEvent.keyboard("{End}");
    const last = item(panel, /^Pizza Tower/);
    expect(last).toHaveFocus();
    await waitFor(() => expect(last.getBoundingClientRect().bottom).toBeLessThanOrEqual(panel.getBoundingClientRect().bottom + 1));
    expect(last.getBoundingClientRect().top).toBeGreaterThanOrEqual(panel.getBoundingClientRect().top - 1);

    // The picture is of the top of the list.
    panel.scrollTop = 0;
    await parkPointer();
    await finish(canvasElement);
    expect(isOpen(wrapperOf(canvasElement))).toBe(true);
  },
};

export const Edges: Story = {
  render: () => () => page(
    "Menu edges",
    menu({}, [], "Empty"),
    menu({}, [
      h(UiMenuItem, { icon: "edit" }, () => "Only"),
    ], "Single"),
    menu({}, [
      h(UiMenuItem, { icon: "edit", disabled: true }, () => "First"),
      h(UiMenuItem, { icon: "delete", disabled: true }, () => "Second"),
    ], "Locked"),
  ),
  async play({ canvasElement }) {
    const cases = [
      {
        name: "Empty",
        focused: (panel: HTMLElement) => panel,
      },
      {
        name: "Single",
        focused: (panel: HTMLElement) => item(panel, "Only"),
      },
      {
        name: "Locked",
        focused: (panel: HTMLElement) => panel,
      },
    ];
    for (const { name, focused } of cases) {
      const panel = await openByClick(canvasElement, name);
      const wrapper = panel.parentElement!;
      await waitFor(() => expect(focused(panel)).toHaveFocus());
      // No key moves a focus that has nowhere to go.
      await userEvent.keyboard("{ArrowDown}{ArrowUp}{Home}{End}");
      expect(focused(panel)).toHaveFocus();
      await userEvent.keyboard("{Escape}");
      await expectClosed(canvasElement, wrapper);
      expect(triggerOf(canvasElement, name)).toHaveFocus();
    }
    await parkPointer();
    await finish(canvasElement);
  },
};

export const Fallback: Story = {
  render: () => () => page("Menu fallback", menu({ anchored: false }, plainItems())),
  async play({ canvasElement }) {
    const trigger = triggerOf(canvasElement);
    const panel = await openByClick(canvasElement);
    await settled();

    // Without anchor positioning the wrapper is put with a fixed `top` and `left`, below the trigger and lined up on its right.
    const wrapper = wrapperOf(canvasElement);
    expect(wrapper.style.top).not.toBe("");
    expect(wrapper.style.left).not.toBe("");
    const box = panel.getBoundingClientRect();
    const triggerBox = trigger.getBoundingClientRect();
    expect(box.top).toBeGreaterThanOrEqual(triggerBox.bottom);
    expect(Math.abs(box.right - triggerBox.right)).toBeLessThanOrEqual(1);

    await userEvent.keyboard("{Escape}");
    await expectClosed(canvasElement);
    expect(trigger).toHaveFocus();

    // The picture is of the closed menu, as the other plays that end closed.
    await parkPointer();
    await finish(canvasElement);
  },
};
