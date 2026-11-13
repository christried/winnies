import type { Meta, StoryObj } from "@storybook/vue3-vite";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import { defineComponent, h, ref } from "vue";
import UiButton from "../../app/components/ui/button.vue";
import UiFieldMessage from "../../app/components/ui/field-message.vue";
import UiModal from "../../app/components/ui/modal.vue";
import UiTextInput from "../../app/components/ui/text-input.vue";
import { expectQuietAfter, finish, settled } from "../support/component-checks";
import { headingCss } from "../support/html";
import { animations, frames, withMotion } from "../support/motion-play";
import { withMotionSurface } from "../support/motion-surface";

// The app's own UiModal (#314): the handoff's card over a scrim (03-components.md, `modal`; the prototype's card where the
// reference CSS differs), a native <dialog> that plays R06 on open and R07 on close, traps the focus, and ignores every
// way of closing it while its request is in flight. Every string below is story copy, not product copy.

// A focused field draws a blinking caret, which differs between two shots. The rule is the story page's, never the
// component's: the caret is part of the product.
const NO_CARET = "input{caret-color:transparent !important}";

/** What the component hands out through `defineExpose`. */
interface ModalApi { open: () => void; close: () => void }

// The story's instance, from the `ref` callback of its render function. The trigger's click calls its `open()`, which is
// also how focus return is tested for real: the browser restores the focus to whatever held it when it opened.
let current: ModalApi | null = null;
function hold(instance: unknown) {
  current = instance as ModalApi | null;
}

// The page is a landmark with a heading and a trigger on a surface panel, so no text sits on the dialect backdrop (axe cannot
// judge contrast over it) and a picture of the closed modal is not an empty page.
function page(title: string, modal: ReturnType<typeof h>) {
  return h("section", {
    "aria-label": title,
    "style": "display:flex;flex-direction:column;align-items:flex-start;gap:16px;padding:24px",
  }, [
    h("style", NO_CARET),
    h("div", {
      style: "display:flex;flex-direction:column;align-items:flex-start;gap:16px;padding:16px 20px;"
        + "background:var(--color-surface);border-radius:var(--radius-xl)",
    }, [
      h("h1", { style: `${headingCss};font-size:var(--text-4xl);padding:0` }, title),
      h(UiButton, {
        onClick: () => current?.open(),
      }, () => "Open modal"),
    ]),
    modal,
  ]);
}

const meta = {
  title: "UI/Modal",
  decorators: [withMotionSurface],
  // The spy of the stories that check the action; the others never read it.
  args: {
    onAction: fn(),
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

interface Spied { onAction: ReturnType<typeof fn> }
const spied = (args: unknown) => args as Spied;

function NAME_FIELD(extra: Record<string, unknown> = {}) {
  return h(UiTextInput, {
    autofocus: true,
    label: "Winnie name",
    hideLabel: true,
    placeholder: "e.g. Kitty vs. the world",
    ...extra,
  });
}

const dialogOf = (canvasElement: HTMLElement) => canvasElement.querySelector("dialog")!;
const triggerOf = (canvasElement: HTMLElement) => within(canvasElement).getByRole("button", { name: "Open modal" });
const scrimOf = () => document.querySelector<HTMLElement>("[data-scrim]")!;
const cardOf = () => document.querySelector<HTMLElement>("[data-card]");

/** Opens the modal as a person does, with the trigger, and waits until its content is mounted. */
async function openByTrigger(canvasElement: HTMLElement, title: string) {
  await userEvent.click(triggerOf(canvasElement));
  const dialog = await within(canvasElement).findByRole("dialog", { name: title });
  expect(dialog).toBe(dialogOf(canvasElement));
  return dialog as HTMLDialogElement;
}

/** The leave plays, then the dialog closes: waits for that, and for the focus to be back on the trigger. */
async function expectClosed(canvasElement: HTMLElement) {
  await waitFor(() => expect(dialogOf(canvasElement).open).toBe(false));
  expect(within(canvasElement).queryByRole("dialog")).toBeNull();
  expect(cardOf()).toBeNull();
  expect(triggerOf(canvasElement)).toHaveFocus();
}

const CREATE_TITLE = "Create a new Winnie";

export const Default: Story = {
  render: args => () => page(
    "Modal default",
    h(UiModal, {
      ref: hold,
      title: CREATE_TITLE,
      actionLabel: "Create",
      busyLabel: "Creating…",
      onAction: spied(args).onAction,
    }, () => NAME_FIELD()),
  ),
  async play({ canvasElement, args }) {
    const spy = spied(args).onAction;
    spy.mockClear();

    // Reduced first: every way of closing it ends at once, and the engine starts nothing.
    await expectQuietAfter(async () => {
      const dialog = await openByTrigger(canvasElement, CREATE_TITLE);
      await userEvent.keyboard("{Escape}");
      await frames(2);
      expect(dialog.open).toBe(false);

      await openByTrigger(canvasElement, CREATE_TITLE);
      await userEvent.click(scrimOf());
      await frames(2);
      expect(dialog.open).toBe(false);
    });

    await withMotion("full", async () => {
      const dialog = await openByTrigger(canvasElement, CREATE_TITLE);
      const heading = within(dialog).getByRole("heading", { name: CREATE_TITLE });
      expect(dialog.getAttribute("aria-labelledby")).toBe(heading.id);
      expect(dialog.matches(":modal")).toBe(true);

      // The first focus is the field (`autofocus`), which `showModal` itself would not find: the content mounts after it.
      const field = within(dialog).getByRole("textbox", { name: "Winnie name" });
      await waitFor(() => expect(field).toHaveFocus());

      // Close is last in the tab order, as the handoff's focus order has it, though it sits top right.
      const stops = [
        field,
        within(dialog).getByRole("button", { name: "Cancel" }),
        within(dialog).getByRole("button", { name: "Create" }),
        within(dialog).getByRole("button", { name: "Close" }),
      ];
      // Round the ring twice: every stop is inside the dialog, the end wraps to the start.
      for (let i = 1; i <= stops.length + 2; i++) {
        await userEvent.tab();
        expect(dialog.contains(document.activeElement)).toBe(true);
        expect(document.activeElement).toBe(stops[i % stops.length]);
      }
      // Shift+Tab from the first lands on the last.
      field.focus();
      await userEvent.tab({ shift: true });
      expect(stops.at(-1)).toHaveFocus();

      // The action says so and does not close the modal: closing is the parent's job once its request is done.
      await userEvent.click(stops[2]!);
      expect(spy).toHaveBeenCalledTimes(1);
      await userEvent.click(stops[2]!);
      expect(spy).toHaveBeenCalledTimes(2);
      await frames(3);
      expect(dialog.open).toBe(true);

      // Each way of closing, then the focus is back on the trigger.
      const ways = [
        async () => {
          await userEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
        },
        async () => {
          await userEvent.click(within(dialog).getByRole("button", { name: "Close" }));
        },
        async () => {
          await userEvent.click(scrimOf());
        },
        async () => {
          await userEvent.keyboard("{Escape}");
        },
      ];
      for (const close of ways) {
        await close();
        await expectClosed(canvasElement);
        // Opened again each time, so the story ends with the modal open for its picture.
        await openByTrigger(canvasElement, CREATE_TITLE);
        await waitFor(() => expect(within(dialog).getByRole("textbox", { name: "Winnie name" })).toHaveFocus());
      }
    });

    // The picture is of the open modal: the shot of a closed one would be the page.
    expect(dialogOf(canvasElement).open).toBe(true);
    await finish(canvasElement);
  },
};

export const Destructive: Story = {
  render: args => () => page(
    "Modal destructive",
    h(UiModal, {
      ref: hold,
      title: "Delete",
      actionLabel: "Delete",
      busyLabel: "Deleting…",
      destructive: true,
      onAction: spied(args).onAction,
    }, () => h("p", [
      "Delete ",
      h("strong", "Extremely Long Winnie Name Run"),
      "? This also deletes its 7 challenges. This cannot be undone.",
    ])),
  ),
  async play({ canvasElement }) {
    const dialog = await openByTrigger(canvasElement, "Delete");
    // The safe action takes the first focus, never the danger one (07-accessibility.md, Delete Winnie).
    const cancel = within(dialog).getByRole("button", { name: "Cancel" });
    await waitFor(() => expect(cancel).toHaveFocus());

    const action = within(dialog).getByRole("button", { name: "Delete" });
    expect(action).toHaveAccessibleName("Delete");
    expect(within(dialog).getByText("Extremely Long Winnie Name Run").tagName).toBe("STRONG");

    // The danger variant, read as its colour: a probe wears the token.
    const probe = document.createElement("span");
    probe.style.color = "var(--color-danger-text)";
    document.body.append(probe);
    const danger = getComputedStyle(probe).color;
    probe.remove();
    expect(getComputedStyle(action).color).toBe(danger);
    expect(getComputedStyle(cancel).color).not.toBe(danger);

    await finish(canvasElement);
  },
};

/** The field is the caller's, so the caller locks it: `readonly` keeps its focus, `disabled` would drop it. */
const FIELD_VALUE = "Kitty vs. the world";

export const Busy: Story = {
  render: args => () => page(
    "Modal busy",
    h(UiModal, {
      ref: hold,
      title: CREATE_TITLE,
      actionLabel: "Create",
      busyLabel: "Creating…",
      pending: true,
      onAction: spied(args).onAction,
    }, () => NAME_FIELD({ modelValue: FIELD_VALUE, readonly: true })),
  ),
  async play({ canvasElement, args }) {
    const spy = spied(args).onAction;
    spy.mockClear();

    await withMotion("full", async () => {
      const dialog = await openByTrigger(canvasElement, CREATE_TITLE);
      const action = within(dialog).getByRole("button", { name: "Creating…" });
      expect(action).toHaveAttribute("aria-busy", "true");
      expect(action).not.toBeDisabled();
      expect(cardOf()).toHaveAttribute("aria-busy", "true");
      const cancel = within(dialog).getByRole("button", { name: "Cancel" });
      const close = within(dialog).getByRole("button", { name: "Close" });
      expect(cancel).toBeDisabled();
      expect(close).toBeDisabled();

      // Busy keeps the focus where it is: the field, then the action, which stays focusable.
      const field = within(dialog).getByRole("textbox", { name: "Winnie name" });
      expect(field).toHaveAttribute("readonly");
      await waitFor(() => expect(field).toHaveFocus());
      await userEvent.type(field, "typed while busy");
      expect(field).toHaveValue(FIELD_VALUE);
      action.focus();
      expect(action).toHaveFocus();
      await userEvent.click(action);
      expect(spy).not.toHaveBeenCalled();

      // Esc twice (a second Esc is what makes a browser close a dialog its page refused to), a scrim click and the
      // buttons: nothing closes, and nothing is playing the leave.
      await userEvent.keyboard("{Escape}");
      await userEvent.keyboard("{Escape}");
      await userEvent.click(scrimOf());
      // A scrim click takes no focus from the card: the busy action keeps it.
      expect(action).toHaveFocus();
      await userEvent.click(cancel);
      await userEvent.click(close);
      await frames(3);
      // Longer than R07 (160 ms), or a leave that had started would have ended by now.
      await new Promise(resolve => setTimeout(resolve, 300));
      expect(dialog.open).toBe(true);
      expect(cardOf()).not.toBeNull();

      // The exposed close is not guarded: the callers close the modal from inside their request.
      current?.close();
      await expectClosed(canvasElement);
      // The picture is of the open modal.
      current?.open();
      await within(canvasElement).findByRole("dialog", { name: CREATE_TITLE });
    });
    await finish(canvasElement);
  },
};

// `pending` is the parent's state: this is the smallest parent that changes it.
interface LiftApi extends ModalApi { setPending: (value: boolean) => void }
let lifting: LiftApi | null = null;

const Lifting = defineComponent({
  name: "LiftingModal",
  setup(_, { expose }) {
    const pending = ref(false);
    const value = ref("Kitty");
    const inner = ref<ModalApi | null>(null);
    expose({
      open: () => inner.value?.open(),
      close: () => inner.value?.close(),
      setPending: (next: boolean) => {
        pending.value = next;
      },
    });
    return () => h(UiModal, {
      ref: inner,
      title: CREATE_TITLE,
      actionLabel: "Create",
      busyLabel: "Creating…",
      pending: pending.value,
    }, () => NAME_FIELD({
      "modelValue": value.value,
      "readonly": pending.value,
      "onUpdate:modelValue": (next: string) => {
        value.value = next;
      },
    }));
  },
});

export const BusyLifts: Story = {
  render: () => () => page(
    "Modal busy lifts",
    h(Lifting, {
      ref: (instance: unknown) => {
        current = instance as ModalApi | null;
        lifting = instance as LiftApi | null;
      },
    }),
  ),
  async play({ canvasElement }) {
    await withMotion("full", async () => {
      const dialog = await openByTrigger(canvasElement, CREATE_TITLE);
      const field = within(dialog).getByRole("textbox", { name: "Winnie name" });
      await waitFor(() => expect(field).toHaveFocus());

      // Busy in one direction: Esc and typing do nothing.
      lifting!.setPending(true);
      await waitFor(() => expect(cardOf()).toHaveAttribute("aria-busy", "true"));
      await userEvent.keyboard("{Escape}");
      await userEvent.type(field, "!");
      await frames(3);
      await new Promise(resolve => setTimeout(resolve, 300));
      expect(dialog.open).toBe(true);
      expect(field).toHaveValue("Kitty");

      // And lifted in the other: the field takes typing again, and Esc closes, with the focus back on the trigger.
      lifting!.setPending(false);
      await waitFor(() => expect(field).not.toHaveAttribute("readonly"));
      await userEvent.type(field, "!");
      expect(field).toHaveValue("Kitty!");
      await userEvent.keyboard("{Escape}");
      await expectClosed(canvasElement);

      // The picture is of the open modal.
      await openByTrigger(canvasElement, CREATE_TITLE);
    });
    await finish(canvasElement);
  },
};

const LONG_TITLE = "Create a Winnie for the run that takes every route of the game and every optional boss it hides";
const LONG_ERROR = "The Winnie could not be created because the server answered with a message that is much longer than "
  + "anyone planned for, and it goes on and on so that the line has to wrap inside the card and never push it wider than "
  + "the screen it is shown on, which is what this check is for. Try again in a little while, or contact support.";

export const LongContent: Story = {
  render: args => () => page(
    "Modal long content",
    h(UiModal, {
      ref: hold,
      title: LONG_TITLE,
      actionLabel: "Create",
      busyLabel: "Creating…",
      onAction: spied(args).onAction,
    }, () => [
      h("p", "A Winnie holds the Challenges of one run. Name it after the run, and give each Challenge a game and a win condition."),
      h("p", "The Total Timer counts every Challenge you start, and stops when you pause the last one. A Challenge that is won keeps its time."),
      h("p", "Nothing here can be undone once the run is shared, so look at the name twice before you go on."),
      NAME_FIELD({ modelValue: "Kitty vs. the world", error: undefined }),
      h(UiFieldMessage, { variant: "error" }, () => LONG_ERROR),
    ]),
  ),
  async play({ canvasElement }) {
    const dialog = await openByTrigger(canvasElement, LONG_TITLE);
    expect(LONG_ERROR.length).toBeGreaterThanOrEqual(280);
    await settled();

    // However long the content, the card never makes the dialog wider than the viewport.
    expect(dialog.scrollWidth).toBeLessThanOrEqual(dialog.clientWidth);

    // And the dialog scrolls instead of cutting content off: every action can be brought into view and pressed.
    for (const name of ["Cancel", "Create", "Close"]) {
      const button = within(dialog).getByRole("button", { name });
      button.scrollIntoView({ block: "nearest" });
      const box = button.getBoundingClientRect();
      expect(box.left).toBeGreaterThanOrEqual(0);
      expect(box.right).toBeLessThanOrEqual(window.innerWidth);
      expect(box.top).toBeGreaterThanOrEqual(0);
      expect(box.bottom).toBeLessThanOrEqual(window.innerHeight);
    }
    expect(within(dialog).getByRole("alert")).toHaveTextContent(LONG_ERROR);

    dialog.scrollTop = 0;
    expect(animations().filter(a => a.playState === "running")).toHaveLength(0);
    await finish(canvasElement);
  },
};
