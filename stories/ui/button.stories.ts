import type { Meta, StoryObj } from "@storybook/vue3-vite";
import type { MaterialIconName } from "../../app/utils/material-icons";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import { h, ref } from "vue";
import UiButton from "../../app/components/ui/button.vue";
import { expectQuietAfter } from "../support/component-checks";
import { chip, headingCss } from "../support/html";
import { animations, frames, withDialect, withMotion } from "../support/motion-play";
import { withMotionSurface } from "../support/motion-surface";

// The app's own UiButton (#309): the handoff's clay button (03-components.md, `button`; `.w-btn*` in the reference CSS and
// the buttons card, where the prototypes win). Today's screens use it for their five text buttons; the labels here are
// story strings, the real copy is the screens'. `link` is not a shipped icon, so Share wears `share`.

type Variant = "primary" | "secondary" | "won" | "pinned" | "danger" | "ghost";

// One row per variant: its label, its leading icon (ghost has none, as in the card), and the word it shows while busy.
const VARIANTS: readonly (readonly [Variant, string, MaterialIconName | undefined, string])[] = [
  [
    "primary",
    "Start Winnie",
    "play_arrow",
    "Starting…",
  ],
  [
    "secondary",
    "Share",
    "share",
    "Sharing…",
  ],
  ["won", "Mark won", "check", "Marking…"],
  [
    "pinned",
    "Create Winnie",
    "add",
    "Creating…",
  ],
  [
    "danger",
    "Delete",
    "delete",
    "Deleting…",
  ],
  [
    "ghost",
    "Cancel",
    undefined,
    "Cancelling…",
  ],
];

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

// Every button on a surface panel with its story chip beside it: the colours of all six variants, ghost included, are
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

function row(...body: ReturnType<typeof h>[]) {
  return h("div", { style: "display:flex;flex-wrap:wrap;gap:16px" }, body);
}

type Props = Record<string, unknown>;

/** The six variants, each with its own label, icon and busy word; `extra` is the state a story forces. */
function variants(args: Spied, extra: (variant: Variant) => Props = () => ({})) {
  return VARIANTS.map(([variant, label, icon, busyLabel]) => labelled(variant, h(UiButton, {
    variant,
    icon,
    busyLabel,
    onClick: args.onClick,
    ...extra(variant),
  }, () => label)));
}

const meta = {
  title: "UI/Button",
  decorators: [withMotionSurface],
  args: {
    onClick: fn(),
    onSave: fn(),
    onSubmit: fn(),
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

interface Spied {
  onClick: ReturnType<typeof fn>;
  onSave: ReturnType<typeof fn>;
  onSubmit: ReturnType<typeof fn>;
}
const spied = (args: unknown) => args as Spied;

const findButton = (canvasElement: HTMLElement, name: string) => within(canvasElement).findByRole("button", { name });

/** Waits for every animation that ends (a CSS transition, a release jelly), so a picture or a read never catches one halfway. */
async function settled() {
  await frames();
  const ending = animations().filter(a => a.effect?.getComputedTiming().iterations !== Infinity);
  await Promise.all(ending.map(a => a.finished.catch(() => undefined)));
  await frames();
}

/**
 * Stops every spinner at its first frame. The spin loop never ends, so a picture of a busy button would catch it at a
 * different angle each run: the pictures show the icon, the plays check that it turns.
 */
function freezeSpinners(canvasElement: HTMLElement) {
  for (const svg of canvasElement.querySelectorAll("button[aria-busy='true'] svg, a[aria-busy='true'] svg")) {
    for (const a of svg.getAnimations()) {
      a.pause();
      a.currentTime = 0;
    }
  }
}

/**
 * Leaves the page as its picture should find it: nothing focused, every spinner still, no animation half-run, and the
 * page painted from scratch, not on top of what the interaction left (the shot compares at the pixel).
 */
async function finish(canvasElement: HTMLElement) {
  (document.activeElement as HTMLElement | null)?.blur();
  freezeSpinners(canvasElement);
  await settled();
  document.body.style.visibility = "hidden";
  await frames();
  document.body.style.visibility = "";
  await frames();
}

/** The first icon of a button (the spinner while it is busy), or null when it has none. */
const iconOf = (button: HTMLElement) => button.querySelector("svg");

export const Default: Story = {
  render: args => () => page("Button", ...variants(spied(args)), labelled("href", h(UiButton, {
    variant: "primary",
    href: "#winnies",
    trailingIcon: "expand_more",
  }, () => "Open Winnies"))),
  async play({ canvasElement }) {
    for (const [, label] of VARIANTS) {
      const button = await findButton(canvasElement, label);
      // The icon is aria-hidden, so the name is the label alone: "Start Winnie", never "Start Winnie play_arrow".
      expect(button).toHaveAccessibleName(label);
      expect(button.tagName).toBe("BUTTON");
      expect(button).toHaveAttribute("type", "button");
    }
    const link = await within(canvasElement).findByRole("link", { name: "Open Winnies" });
    expect(link.tagName).toBe("A");
    expect(link).toHaveAttribute("href", "#winnies");
    expect(link).not.toHaveAttribute("type");
  },
};

const SIZES = [
  ["sm", 38, 22],
  ["md", 50, 22],
  ["lg", 62, 30],
] as const;

export const Sizes: Story = {
  render: args => () => page("Button sizes", ...SIZES.map(([size]) => labelled(size, row(
    h(UiButton, { variant: "primary", size, onClick: spied(args).onClick }, () => "Label"),
    h(UiButton, { variant: "primary", size, icon: "play_arrow" }, () => "Leading"),
    h(UiButton, { variant: "secondary", size, trailingIcon: "expand_more" }, () => "Trailing"),
    h(UiButton, {
      variant: "secondary",
      size,
      icon: "share",
      trailingIcon: "expand_more",
    }, () => "Both"),
  )))),
  async play({ canvasElement }) {
    // Workspace: the heights are the tokens' (--btn-h-sm, --btn-h, --btn-h-lg) and the icons are `md` in sm and md,
    // `xl` in lg (the reference's `.w-btn--lg .w-ico`).
    await withDialect(null, async () => {
      for (const [size, height, icon] of SIZES) {
        const panel = (await within(canvasElement).findByText(size)).parentElement!.parentElement!;
        const buttons = within(panel).getAllByRole("button");
        expect(buttons).toHaveLength(4);
        for (const button of buttons) {
          expect(button.getBoundingClientRect().height).toBe(height);
          for (const svg of button.querySelectorAll("svg"))
            expect(getComputedStyle(svg).width).toBe(`${icon}px`);
        }
        // Icon placement: leading comes before the label, trailing after it.
        const [label, leading, trailing, both] = buttons as [HTMLElement, HTMLElement, HTMLElement, HTMLElement];
        expect(label.querySelectorAll("svg")).toHaveLength(0);
        expect(leading.firstElementChild?.tagName.toLowerCase()).toBe("svg");
        expect(trailing.lastElementChild?.tagName.toLowerCase()).toBe("svg");
        expect(both.querySelectorAll("svg")).toHaveLength(2);
      }
    });
  },
};

export const Hover: Story = {
  render: args => () => page("Button hover", ...variants(spied(args), () => ({ class: "is-hover" }))),
  async play({ canvasElement }) {
    const buttons = await Promise.all(VARIANTS.map(([, label]) => findButton(canvasElement, label)));
    const [primary, , , , , ghost] = buttons as [HTMLElement, HTMLElement, HTMLElement, HTMLElement, HTMLElement, HTMLElement];

    // Reduced first: the token is zero, so there is no lift, and `--dur-hover` is zero, so the change to it starts no
    // transition.
    await withMotion("reduce", async () => {
      await settled();
      expect(getComputedStyle(primary).translate).toBe("0px");
      expect(animations()).toHaveLength(0);
    });

    await withMotion("full", async () => {
      // Workspace: the lift is half of `--hover-lift`, -2px (R01).
      await withDialect(null, async () => {
        await settled();
        for (const button of buttons.slice(0, 5)) {
          expect(getComputedStyle(button).translate).toBe("0px -2px");
          expect(getComputedStyle(button).rotate).toBe("none");
        }
        // Ghost is the one variant that changes colour on hover instead of lifting.
        expect(getComputedStyle(ghost).translate).toBe("none");
        expect(getComputedStyle(ghost).backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
      });

      // Broadcast sets `--hover-lift: 0` (the token): no lift, and no code for it.
      await withDialect("broadcast", async () => {
        await settled();
        expect(getComputedStyle(primary).translate).toBe("0px");
      });

      await withDialect("showcase", async () => {
        await settled();
        expect(getComputedStyle(primary).translate).toBe("0px -4px");
        expect(getComputedStyle(primary).rotate).toBe("-1deg");
      });
    });
    await finish(canvasElement);
  },
};

export const Active: Story = {
  render: args => () => page("Button active", ...variants(spied(args), () => ({ class: "is-active" }))),
  async play({ canvasElement }) {
    const buttons = await Promise.all(VARIANTS.map(([, label]) => findButton(canvasElement, label)));
    await withDialect(null, async () => {
      await settled();
      for (const button of buttons.slice(0, 5)) {
        // The press collapses the lip: it moves down by the lip less 1px (R02), 6px at md.
        expect(getComputedStyle(button).translate).toBe("0px 5px");
        expect(getComputedStyle(button).boxShadow).not.toContain("inset");
      }
      const ghost = buttons[5]!;
      expect(getComputedStyle(ghost).translate).toBe("none");
      expect(getComputedStyle(ghost).boxShadow).not.toBe("none");
    });
    await finish(canvasElement);
  },
};

export const Focus: Story = {
  render: args => () => page("Button focus", ...variants(spied(args), () => ({ class: "is-focus" }))),
  async play({ canvasElement }) {
    // The forced ring (`is-focus`) is the same as the real one: both are checked.
    const buttons = await Promise.all(VARIANTS.map(([, label]) => findButton(canvasElement, label)));
    for (const button of buttons) {
      expect(getComputedStyle(button).outlineStyle).toBe("solid");
      expect(getComputedStyle(button).outlineWidth).not.toBe("0px");
    }

    const first = buttons[0]!;
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
  render: args => () => page("Button disabled", ...variants(spied(args), () => ({ disabled: true }))),
  async play({ canvasElement, args }) {
    const spy = spied(args).onClick;
    spy.mockClear();
    const buttons = await Promise.all(VARIANTS.map(([, label]) => findButton(canvasElement, label)));
    for (const button of buttons) {
      expect(button).toBeDisabled();
      expect(getComputedStyle(button).opacity).toBe("0.45");
      expect(getComputedStyle(button).cursor).toBe("not-allowed");
      expect(getComputedStyle(button).translate).toBe("none");
      await userEvent.click(button);
    }
    await userEvent.keyboard(" ");
    await userEvent.tab();
    expect(buttons.includes(document.activeElement as HTMLElement)).toBe(false);
    expect(spy).not.toHaveBeenCalled();
  },
};

export const Busy: Story = {
  render: args => () => page(
    "Button busy",
    ...variants(spied(args), () => ({ busy: true })),
    // Without a busy word the normal label stays.
    labelled("busy, no busyLabel", h(UiButton, { variant: "secondary", icon: "share", busy: true }, () => "Save changes")),
  ),
  async play({ canvasElement, args }) {
    const spy = spied(args).onClick;
    spy.mockClear();

    // Reduced first: the end state is the still icon and the word, and nothing is started.
    await expectQuietAfter(async () => {
      for (const [, , , busyLabel] of VARIANTS) {
        const button = await findButton(canvasElement, busyLabel);
        expect(iconOf(button)).not.toBeNull();
      }
    });

    for (const [, label, , busyLabel] of VARIANTS) {
      const button = await findButton(canvasElement, busyLabel);
      expect(button).toHaveAttribute("aria-busy", "true");
      // A busy button stays focusable: it is not `disabled`.
      expect(button).not.toBeDisabled();
      expect(button).toHaveAccessibleName(busyLabel);
      expect(within(canvasElement).queryByRole("button", { name: label })).toBeNull();
      expect(getComputedStyle(button).cursor).toBe("progress");
      expect(getComputedStyle(button).translate).toBe("none");
    }
    // No busy word: the label stays.
    const plain = await findButton(canvasElement, "Save changes");
    expect(plain).toHaveAttribute("aria-busy", "true");
    expect(plain).toHaveAccessibleName("Save changes");

    await withMotion("full", async () => {
      // R35: the spinner turns on the engine's `spin` loop, one animation on the icon.
      await waitFor(() => expect(iconOf(plain)!.getAnimations().filter(a => a.playState === "running")).toHaveLength(1));
      expect(iconOf(plain)!.getAnimations()).toHaveLength(1);
      freezeSpinners(canvasElement);
    });
    expect(spy).not.toHaveBeenCalled();
    await finish(canvasElement);
  },
};

// The longest label there is today, at each size, plain and busy, inside the narrowest screen's width.
const LONGEST = "Sign in with Discord";

export const Longest: Story = {
  render: args => () => h("section", {
    "aria-label": "Button longest label",
    "style": "display:flex;flex-direction:column;align-items:flex-start;gap:16px;padding:24px",
  }, [
    h("h1", { style: `${headingCss};font-size:var(--text-4xl)` }, "Button longest"),
    h("div", {
      "data-narrow": "",
      "style": "box-sizing:border-box;width:390px;max-width:100%;display:flex;flex-direction:column;align-items:flex-start;"
        + "gap:12px;padding:16px;background:var(--color-surface);border-radius:var(--radius-xl)",
    }, (["sm", "md", "lg"] as const).flatMap(size => [
      h(UiButton, { variant: "primary", size, onClick: spied(args).onClick }, () => LONGEST),
      h(UiButton, {
        variant: "primary",
        size,
        busy: true,
        busyLabel: "Signing in…",
      }, () => LONGEST),
    ])),
  ]),
  async play({ canvasElement }) {
    const narrow = canvasElement.querySelector<HTMLElement>("[data-narrow]")!;
    await within(canvasElement).findAllByRole("button", { name: LONGEST });
    await withDialect(null, async () => {
      for (const button of within(narrow).getAllByRole("button")) {
        // One line: the height is the token's and the label is not wider than the box that holds it.
        expect([38, 50, 62]).toContain(button.getBoundingClientRect().height);
        expect(button.scrollWidth).toBeLessThanOrEqual(button.clientWidth);
      }
      expect(narrow.scrollWidth).toBeLessThanOrEqual(narrow.clientWidth);
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(document.documentElement.clientWidth);
    });
    await finish(canvasElement);
  },
};

export const Pressing: Story = {
  render: (args) => {
    const busy = ref(false);
    const spy = spied(args);
    return () => page(
      "Button pressing",
      labelled("idle", h(UiButton, {
        variant: "primary",
        icon: "play_arrow",
        onClick: spy.onClick,
      }, () => "Press")),
      // Stateful: a press makes it busy for a moment, as a save does.
      labelled("stateful", h(UiButton, {
        variant: "secondary",
        icon: "share",
        busy: busy.value,
        busyLabel: "Saving…",
        onClick: (e: MouseEvent) => {
          spy.onSave(e);
          busy.value = true;
          setTimeout(() => {
            busy.value = false;
          }, 2500);
        },
      }, () => "Save")),
      labelled("submit", h("form", {
        style: "display:flex;gap:16px",
        onSubmit: (e: Event) => {
          e.preventDefault();
          spy.onSubmit(e);
        },
      }, [
        h(UiButton, { variant: "primary", type: "submit" }, () => "Send"),
        h(UiButton, {
          variant: "primary",
          type: "submit",
          busy: true,
          busyLabel: "Sending…",
        }, () => "Send again"),
      ])),
      labelled("href", row(
        h(UiButton, {
          variant: "secondary",
          href: "#busy-link",
          busy: true,
          busyLabel: "Opening…",
        }, () => "Open"),
        h(UiButton, { variant: "secondary", href: "#disabled-link", disabled: true }, () => "Closed"),
      )),
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
        // Static: the icon and the word, no loop.
        expect(save).toHaveAccessibleName("Saving…");
        expect(iconOf(save)).not.toBeNull();
      });
      expect(onClick).toHaveBeenCalledTimes(1);
      await waitFor(() => expect(save).not.toHaveAttribute("aria-busy", "true"), { timeout: 5000 });
      expect(save).toHaveAccessibleName("Save");
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
      expect(save).toHaveAccessibleName("Saving…");

      save.focus();
      expect(save).toHaveFocus();
      await userEvent.click(save);
      await userEvent.keyboard("{Enter}");
      await userEvent.keyboard(" ");
      expect(onSave).toHaveBeenCalledTimes(1);
      // No press, no jelly: only the spinner runs.
      expect(on(save)).toHaveLength(1);

      // A busy submit button does not submit its form; an idle one does.
      const submit = await findButton(canvasElement, "Sending…");
      expect(submit).toHaveAttribute("aria-busy", "true");
      await userEvent.click(submit);
      submit.focus();
      await userEvent.keyboard("{Enter}");
      expect(onSubmit).not.toHaveBeenCalled();
      await userEvent.click(await findButton(canvasElement, "Send"));
      expect(onSubmit).toHaveBeenCalledTimes(1);

      await waitFor(() => expect(save).not.toHaveAttribute("aria-busy", "true"), { timeout: 5000 });
      expect(save).toHaveAccessibleName("Save");
    }));

    // A busy or disabled `href` button is a link that goes nowhere.
    const before = location.hash;
    const busyLink = await within(canvasElement).findByRole("link", { name: "Opening…" });
    const closedLink = await within(canvasElement).findByRole("link", { name: "Closed" });
    for (const link of [busyLink, closedLink]) {
      expect(link).toHaveAttribute("aria-disabled", "true");
      await userEvent.click(link);
      link.focus();
      await userEvent.keyboard("{Enter}");
      expect(location.hash).toBe(before);
    }
    expect(busyLink).toHaveAttribute("aria-busy", "true");

    await finish(canvasElement);
  },
};
