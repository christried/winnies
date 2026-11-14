import type { Meta, StoryObj } from "@storybook/vue3-vite";
import type { MaterialIconName } from "../../app/utils/material-icons";
import type { ToastKind } from "../../app/utils/toast-timer";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import { h, ref } from "vue";
import UiButton from "../../app/components/ui/button.vue";
import UiToast from "../../app/components/ui/toast.vue";
import { materialCut } from "../../app/utils/material-icons";
import { expectQuietAfter, finish, parkPointer } from "../support/component-checks";
import { chip } from "../support/html";
import { withMotionSurface } from "../support/motion-surface";
import { cutMarkup, page, sleep } from "../support/ui-kit";

// The app's own UiToast (#315): the handoff's toast card (03-components.md, `toast`; the prototype's card where the reference CSS
// differs). It animates nothing itself: the stack plays R08 and R09. What it owns is the countdown, which hover and focus
// pause. Every string below is story copy, not product copy. No toast has a second line: an error shows its message only.

/** A 420px panel, the width of a toast in the stack, with the story's label under it. */
function labelled(story: string, ...body: ReturnType<typeof h>[]) {
  return h("div", {
    style: "display:flex;flex-direction:column;align-items:flex-start;gap:12px;width:420px;box-sizing:content-box;"
      + "padding:16px;background:var(--color-surface);border-radius:var(--radius-xl)",
  }, [
    ...body.map(child => h("div", { style: "width:100%" }, [child])),
    h("div", {
      innerHTML: chip(story),
    }),
  ]);
}

const meta = {
  title: "UI/Toast",
  decorators: [withMotionSurface],
  args: {
    onDismiss: fn(),
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

interface Spied { onDismiss: ReturnType<typeof fn> }
const spied = (args: unknown) => args as Spied;

const MESSAGES: Record<ToastKind, string> = {
  success: "Timer reset",
  info: "Your Overlay updates live.",
  error: "Couldn't copy the link",
};
const ICONS: Record<ToastKind, MaterialIconName> = { success: "check", info: "info", error: "error" };

/** The markup of the disc's glyph: the cut a toast wears, read back the way the browser serialises it. */
const iconMarkup = (name: MaterialIconName) => cutMarkup(name, materialCut(600, true));

const dismissOf = (toast: HTMLElement) => within(toast).getByRole("button", { name: "Dismiss" });

function kindRender(kind: ToastKind, args: unknown) {
  return () => page(`Toast ${kind}`, labelled(`kind ${kind}`, h(UiToast, {
    kind,
    ttl: null,
    onDismiss: spied(args).onDismiss,
  }, () => MESSAGES[kind])));
}

async function kindPlay(kind: ToastKind, { canvasElement, args }: { canvasElement: HTMLElement; args: unknown }) {
  const spy = spied(args).onDismiss;
  spy.mockClear();
  const toast = await within(canvasElement).findByRole(kind === "error"
    ? "alert"
    : "status");
  expect(toast).toHaveAttribute("data-kind", kind);
  expect(within(toast).getByText(MESSAGES[kind])).toBeVisible();

  // The kind reads by shape and colour, not by colour alone: the disc's glyph is this kind's own.
  const glyph = toast.querySelector("svg")!;
  expect(glyph.innerHTML).toBe(iconMarkup(ICONS[kind]));
  for (const other of (Object.keys(ICONS) as ToastKind[]).filter(k => k !== kind))
    expect(glyph.innerHTML).not.toBe(iconMarkup(ICONS[other]));

  // The message and nothing else: no second line, whatever the kind (the human, 2026-11-13).
  // The Dismiss button's tooltip (#311) is a hidden sibling of the button, not a part of the card.
  const parts = [...toast.children].filter(el => el.getAttribute("role") !== "tooltip");
  expect(parts).toHaveLength(3);
  expect(parts[1]!.textContent!.trim()).toBe(MESSAGES[kind]);
  expect(parts[1]!.children).toHaveLength(0);

  // Reduced first: a finished full-motion animation would stay in the document and fail the quiet check. The card
  // animates nothing, with or without the preference.
  await expectQuietAfter(async () => {
    await userEvent.click(dismissOf(toast));
  });
  // It only asks: the parent decides, so the toast stays, and a second press asks nothing more.
  expect(spy).toHaveBeenCalledTimes(1);
  expect(toast).toBeVisible();
  await userEvent.click(dismissOf(toast));
  expect(spy).toHaveBeenCalledTimes(1);

  await parkPointer();
  await finish(canvasElement);
}

export const Success: Story = {
  render: args => kindRender("success", args),
  play: context => kindPlay("success", context),
};

export const Info: Story = {
  render: args => kindRender("info", args),
  play: context => kindPlay("info", context),
};

export const Error: Story = {
  render: args => kindRender("error", args),
  play: context => kindPlay("error", context),
};

const LONG_TEXT = "The server took longer than it should have to answer, so this change was not saved. Check your connection and "
  + "try it again in a moment; nothing you typed was lost on this page.";
const NO_SPACES = "Winnie_".repeat(10).slice(0, 70);

export const LongMessage: Story = {
  render: args => () => page("Toast long message", labelled(
    "160 characters, then 70 with no space",
    h(UiToast, {
      "kind": "success",
      "ttl": null,
      "data-testid": "long",
      "onDismiss": spied(args).onDismiss,
    }, () => LONG_TEXT),
    h(UiToast, {
      "kind": "info",
      "ttl": null,
      "data-testid": "unbroken",
      "onDismiss": spied(args).onDismiss,
    }, () => NO_SPACES),
  )),
  async play({ canvasElement }) {
    expect(LONG_TEXT.length).toBeGreaterThanOrEqual(160);
    expect(NO_SPACES).toHaveLength(70);
    const canvas = within(canvasElement);
    for (const id of ["long", "unbroken"]) {
      const card = await canvas.findByTestId(id);
      expect(card.scrollWidth).toBeLessThanOrEqual(card.clientWidth);
      const box = card.getBoundingClientRect();
      const button = dismissOf(card).getBoundingClientRect();
      expect(button.right).toBeLessThanOrEqual(box.right);
      // More than one line of the message (15px at 1.4 is 21px a line).
      expect(card.children[1]!.getBoundingClientRect().height).toBeGreaterThan(30);
    }

    await parkPointer();
    await finish(canvasElement);
  },
};

// The pause, in a browser, with real times. Each wait says what it is for.
const FIRST_TTL = 3000;
// Into the countdown before the pointer arrives: about two seconds are left.
const HOVER_AFTER_MS = 1000;
// More than the whole time to live: a toast that was not paused would have gone twice over.
const HOLD_FIRST_MS = 3500;
// The least and the most a resume with about two seconds left may take, from the pointer leaving.
const RESUMED_AT_LEAST_MS = 1000;
const RESUMED_AT_MOST_MS = 2900;
const RESUME_TIMEOUT_MS = 4000;
// The second and third toast: a short time that focus and hover then hold for longer than it.
const SHORT_TTL = 2000;
const HOLD_SHORT_MS = 2600;
const RESUME_SHORT_TIMEOUT_MS = 3000;

const timerSpies = {
  first: fn(),
  second: fn(),
  third: fn(),
};

/** Puts the keyboard focus on the button with Tab, from the top of the page. */
async function tabTo(button: HTMLElement) {
  (document.activeElement as HTMLElement | null)?.blur();
  for (let i = 0; i < 8 && document.activeElement !== button; i++)
    await userEvent.tab();
  expect(button).toHaveFocus();
}

export const Timer: Story = {
  render: () => {
    const second = ref(false);
    const third = ref(false);
    return () => page(
      "Toast timer",
      labelled(
        "ttl 3000, then 2000 and 2000",
        h(UiToast, {
          "kind": "success",
          "ttl": FIRST_TTL,
          "onDismiss": timerSpies.first,
          "data-testid": "first",
        }, () => "First, 3 s"),
        ...(second.value
          ? [
              h(UiToast, {
                "kind": "success",
                "ttl": SHORT_TTL,
                "onDismiss": timerSpies.second,
                "data-testid": "second",
              }, () => "Second, 2 s"),
            ]
          : []),
        ...(third.value
          ? [
              h(UiToast, {
                "kind": "info",
                "ttl": SHORT_TTL,
                "onDismiss": timerSpies.third,
                "data-testid": "third",
              }, () => "Third, 2 s"),
            ]
          : []),
      ),
      h("div", { style: "display:flex;gap:8px" }, [
        h(UiButton, {
          onClick: () => (second.value = true),
        }, () => "Show second"),
        h(UiButton, {
          onClick: () => (third.value = true),
        }, () => "Show third"),
      ]),
    );
  },
  async play({ canvasElement }) {
    for (const spy of Object.values(timerSpies))
      spy.mockClear();
    // The real mouse stays where the last story left it: over a toast it would hold the countdown.
    await parkPointer();
    const canvas = within(canvasElement);
    const first = await canvas.findByTestId("first");

    // Hovered 1 s in, held longer than the whole time, then released: it resumes with the time left.
    await sleep(HOVER_AFTER_MS);
    await userEvent.hover(first);
    await sleep(HOLD_FIRST_MS);
    expect(timerSpies.first).not.toHaveBeenCalled();
    await userEvent.unhover(first);
    const released = performance.now();
    expect(timerSpies.first).not.toHaveBeenCalled();
    await waitFor(() => expect(timerSpies.first).toHaveBeenCalledTimes(1), { timeout: RESUME_TIMEOUT_MS });
    const resumedAfter = performance.now() - released;
    expect(resumedAfter).toBeGreaterThan(RESUMED_AT_LEAST_MS);
    expect(resumedAfter).toBeLessThan(RESUMED_AT_MOST_MS);

    // Focused is held too, and leaving the focus lets it go.
    await userEvent.click(await canvas.findByRole("button", { name: "Show second" }));
    const second = await canvas.findByTestId("second");
    await tabTo(dismissOf(second));
    await sleep(HOLD_SHORT_MS);
    expect(timerSpies.second).not.toHaveBeenCalled();
    dismissOf(second).blur();
    await waitFor(() => expect(timerSpies.second).toHaveBeenCalledTimes(1), { timeout: RESUME_SHORT_TIMEOUT_MS });

    // Hovered and focused at once: the focus leaves, the pointer stays, and the toast stays held.
    await userEvent.click(await canvas.findByRole("button", { name: "Show third" }));
    const third = await canvas.findByTestId("third");
    await tabTo(dismissOf(third));
    await userEvent.hover(third);
    dismissOf(third).blur();
    await sleep(HOLD_SHORT_MS);
    expect(timerSpies.third).not.toHaveBeenCalled();
    await userEvent.unhover(third);
    await waitFor(() => expect(timerSpies.third).toHaveBeenCalledTimes(1), { timeout: RESUME_SHORT_TIMEOUT_MS });

    // The countdown asks and nothing more: every toast is still on the page.
    for (const toast of [first, second, third])
      expect(toast).toBeVisible();
    await parkPointer();
    await finish(canvasElement);
  },
};
