import type { Meta, StoryObj } from "@storybook/vue3-vite";
import type { PropType } from "vue";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import { defineComponent, h, ref } from "vue";
import UiInlineEdit from "../../app/components/ui/inline-edit.vue";
import { expectQuietAfter, finish, freezeSpinners, parkPointer, repaint, settled } from "../support/component-checks";
import { chip, headingCss } from "../support/html";
import { animations, frames, withMotion } from "../support/motion-play";
import { withMotionSurface } from "../support/motion-surface";
import { realPointer } from "../support/real-pointer";

// The app's own UiInlineEdit (#323): text that becomes an input on the caller's say-so (03-components.md,
// `inline-edit`; R11 on the input, R12 on the label). Every string below is story copy, not product copy.

// A focused field draws a blinking caret, which differs between two shots. The rule is the story page's, never the
// component's: the caret is part of the product.
const NO_CARET = "input{caret-color:transparent !important}";

// Text sits on a chip or a surface card, never straight on the dialect backdrop: axe cannot judge contrast over it.
function page(title: string, ...body: ReturnType<typeof h>[]) {
  return h("section", {
    "aria-label": title,
    "style": "display:flex;flex-direction:column;align-items:flex-start;gap:16px;padding:24px",
  }, [
    h("style", NO_CARET),
    h("h1", { style: `${headingCss};font-size:var(--text-4xl)` }, title),
    ...body,
  ]);
}

function card(story: string, width: number, ...body: ReturnType<typeof h>[]) {
  return h("div", {
    "data-card": story,
    "style": `box-sizing:border-box;width:${width}px;max-width:100%;display:flex;flex-direction:column;gap:12px;`
      + "padding:16px;background:var(--color-surface);border-radius:var(--radius-xl)",
  }, [
    h("div", {
      innerHTML: chip(story),
    }),
    ...body,
  ]);
}

const NAME = "Kitty vs. the world";
const LIMIT_NAME = "Extremely Long Winnie Name Run";
const BLANK_ERROR = "Give your Winnie a name.";
const HINT = "Enter saves · Esc cancels";
const LABEL = "Winnie name";

/** What the caller does with a `save`: close at once (a blank one is an error), hold `saving` until told, or nothing. */
type Answer = "validate" | "saving" | "stay";

interface Ctl {
  /** The request came back well: the saved text is the label and the edit is closed. */
  succeed: () => void;
  /** The request came back with a message: `saving` ends and the input stays open. */
  fail: (message: string) => void;
  /** The caller closes the edit with this text, whatever it was waiting for. */
  close: (text: string) => void;
}

// The Stateful story's instance, from the `ref` callback of its render function.
let ctl: Ctl | null = null;

// The component holds no state of its own about what was saved: the parent does. This is the smallest parent that does
// what R3's screen will: on `save` it sets `saving`, later it sets the value and closes, or it sets an error and leaves
// the input open. `onSave` sees every `save` the component emits.
const Stateful = defineComponent({
  name: "StatefulInlineEdit",
  props: {
    initial: { type: String, default: NAME },
    startEditing: Boolean,
    startSaving: Boolean,
    startError: { type: String, default: "" },
    answer: { type: String as PropType<Answer>, default: "validate" },
    onSave: { type: Function as PropType<(value: string) => void>, default: undefined },
  },
  setup(props, { expose }) {
    const value = ref(props.initial);
    const editing = ref(props.startEditing);
    const saving = ref(props.startSaving);
    const error = ref(props.startError);
    const inner = ref<{ edit: () => void } | null>(null);
    let pending = "";

    function close(text: string) {
      value.value = text;
      error.value = "";
      saving.value = false;
      editing.value = false;
    }

    function onSave(text: string) {
      props.onSave?.(text);
      if (props.answer === "stay")
        return;
      if (text === "") {
        error.value = BLANK_ERROR;
        return;
      }
      if (props.answer === "saving") {
        pending = text;
        saving.value = true;
        return;
      }
      close(text);
    }

    expose({
      succeed: () => close(pending),
      fail: (message: string) => {
        error.value = message;
        saving.value = false;
      },
      close,
    } satisfies Ctl);

    // Every other attribute (`as`, `class`, `label`, `maxlength`, `data-*`) falls through to the component.
    return () => h(UiInlineEdit, {
      "ref": inner,
      "value": value.value,
      "label": LABEL,
      "editing": editing.value,
      "saving": saving.value,
      "error": error.value || undefined,
      "onUpdate:editing": (next: boolean) => {
        editing.value = next;
        // A cancelled edit takes its error with it.
        if (!next)
          error.value = "";
      },
      "onSave": onSave,
      "onClick": () => inner.value?.edit(),
    });
  },
});

const meta = {
  title: "UI/Inline edit",
  decorators: [withMotionSurface],
  // The spy for the stories that count what the component emits; the others never read it.
  args: {
    onSave: fn(),
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

interface Spied { onSave: ReturnType<typeof fn> }

const spied = (args: unknown) => (args as Spied).onSave;

function findBox(canvasElement: HTMLElement, name = LABEL) {
  return within(canvasElement).findByRole("textbox", { name }) as Promise<HTMLInputElement>;
}

/**
 * What a token resolves to as a computed colour, which is how `getComputedStyle` writes a ring's colour.
 * @param token the custom property, `--color-focus`
 * @param property the property to resolve it through: `color` for a ring, `backgroundColor` for a fill
 * @returns the colour as the browser computes it
 */
function colourOf(token: string, property: "color" | "backgroundColor" = "color"): string {
  const probe = document.createElement("span");
  document.body.append(probe);
  probe.style[property] = `var(${token})`;
  const colour = getComputedStyle(probe)[property];
  probe.remove();
  return colour;
}

/** The size a token resolves to, as `getComputedStyle` writes a `font-size`. */
function sizeOf(token: string): string {
  const probe = document.createElement("span");
  document.body.append(probe);
  probe.style.fontSize = `var(${token})`;
  const size = getComputedStyle(probe).fontSize;
  probe.remove();
  return size;
}

const ringOf = (el: Element) => getComputedStyle(el).boxShadow;

/** Where the text itself sits, whatever the box around it does. */
function textRect(el: Element): DOMRect {
  const range = document.createRange();
  range.selectNodeContents(el);
  return range.getBoundingClientRect();
}

/** Opens an edit the way R3 will: a click on the text. */
async function openByClick(canvasElement: HTMLElement, name = NAME) {
  await userEvent.click(within(canvasElement).getByText(name));
  const input = await findBox(canvasElement);
  await waitFor(() => expect(input).toHaveFocus());
  return input;
}

/** A click on the page, outside the input: what blurs it. */
const clickElsewhere = (canvasElement: HTMLElement) => userEvent.click(canvasElement.querySelector("section")!);

/** The spinner of a saving input: the icon beside the well. */
function spinnerOf(canvasElement: HTMLElement) {
  const input = canvasElement.querySelector("input")!;
  return input.parentElement!.parentElement!.querySelector<SVGElement>(":scope > span svg");
}

export const Resting: Story = {
  render: () => () => page(
    "Inline edit resting",
    card(
      "as h1 at text-5xl",
      560,
      h(Stateful, { as: "h1", class: "text-5xl", maxlength: 30 }),
    ),
    card(
      "as h2 at text-xl",
      360,
      h(Stateful, { as: "h2", class: "text-xl", initial: "Elden Ring night run" }),
    ),
    card(
      "as p, no size: text-xl",
      360,
      h(Stateful, { initial: "Marathon pals" }),
    ),
    card("empty value", 360, h(Stateful, { "initial": "", "data-case": "empty" })),
    card(
      "30 characters in 280px",
      280,
      h(Stateful, { "initial": LIMIT_NAME, "class": "text-xl", "data-case": "long" }),
    ),
    card("1 character", 360, h(Stateful, { initial: "K" })),
    card("2 characters", 360, h(Stateful, { initial: "Ki" })),
  ),
  async play({ canvasElement }) {
    const canvas = within(canvasElement);

    // The text is the heading the caller asked for, and nothing is an input yet.
    const h1 = await canvas.findByRole("heading", { level: 1, name: NAME });
    expect(h1.tagName).toBe("H1");
    expect(getComputedStyle(h1).fontSize).toBe(sizeOf("--text-5xl"));
    const h2 = canvas.getByRole("heading", { level: 2, name: "Elden Ring night run" });
    expect(getComputedStyle(h2).fontSize).toBe(sizeOf("--text-xl"));
    // No class on the root: the component's own default size, which a class on the root would replace.
    const plain = canvas.getByText("Marathon pals");
    expect(plain.tagName).toBe("P");
    expect(getComputedStyle(plain).fontSize).toBe(sizeOf("--text-xl"));
    expect(canvas.queryByRole("textbox")).toBeNull();

    // Mochiy, `cursor: text` and the same padding at every size.
    expect(getComputedStyle(h1).fontFamily).toBe(getComputedStyle(plain).fontFamily);
    expect(getComputedStyle(h1).cursor).toBe("text");
    expect(getComputedStyle(h1).paddingLeft).toBe("12px");
    expect(getComputedStyle(h1).paddingTop).toBe("4px");
    expect(getComputedStyle(h1).backgroundColor).toBe("rgba(0, 0, 0, 0)");

    // An empty value keeps one line of height, so the screen does not jump when it is filled.
    const empty = canvasElement.querySelector<HTMLElement>("[data-case=empty]")!;
    expect(empty.getBoundingClientRect().height).toBeGreaterThanOrEqual(Number.parseFloat(getComputedStyle(empty).lineHeight));

    // 30 characters in 280px wrap, and nothing scrolls sideways.
    const long = canvasElement.querySelector<HTMLElement>("[data-case=long]")!;
    expect(long).toHaveTextContent(LIMIT_NAME);
    expect(long.getBoundingClientRect().height).toBeGreaterThan(Number.parseFloat(getComputedStyle(long).lineHeight) * 1.5);
    const cardEl = long.closest<HTMLElement>("[data-card]")!;
    expect(cardEl.scrollWidth).toBeLessThanOrEqual(cardEl.clientWidth);

    expect(canvas.getByText("K")).toBeVisible();
    expect(canvas.getByText("Ki")).toBeVisible();
    await parkPointer();
  },
};

export const Hover: Story = {
  render: () => () => page(
    "Inline edit hover",
    card("pointer over the text", 480, h(Stateful, { as: "h2", class: "text-xl" })),
  ),
  async play({ canvasElement }) {
    const el = await within(canvasElement).findByRole("heading", { level: 2, name: NAME });
    const restFill = getComputedStyle(el).backgroundColor;
    const restText = textRect(el);
    // Storybook's own UI cannot drive `:hover`; the runner can, and it is where the fill is checked.
    const pointer = await realPointer();
    if (!pointer)
      return;
    await pointer.hover(el);
    await waitFor(() => expect(el.matches(":hover")).toBe(true));
    expect(getComputedStyle(el).backgroundColor).toBe(colourOf("--color-surface-sunken", "backgroundColor"));
    expect(getComputedStyle(el).backgroundColor).not.toBe(restFill);
    // R32: it appears at once, and the padding it fills was there before, so the text does not move.
    expect(getComputedStyle(el).transitionDuration).toBe("0s");
    const hoverText = textRect(el);
    expect(hoverText.left).toBe(restText.left);
    expect(hoverText.top).toBe(restText.top);
    await parkPointer();
  },
};

export const Editing: Story = {
  render: args => () => page(
    "Inline edit editing",
    card(
      "editing, 19 of 30",
      480,
      h(Stateful, {
        startEditing: true,
        maxlength: 30,
        answer: "stay",
        onSave: spied(args),
      }),
    ),
  ),
  async play({ canvasElement }) {
    const el = await findBox(canvasElement);
    // The text was selected and focused when the input came, not at a click.
    await waitFor(() => expect(el).toHaveFocus());
    expect(el.selectionStart).toBe(0);
    expect(el.selectionEnd).toBe(NAME.length);
    expect(el).toHaveValue(NAME);
    expect(el).toHaveAttribute("maxlength", "30");

    // The raised fill, and the focus ring on top of the well.
    expect(getComputedStyle(el).backgroundColor).toBe(colourOf("--color-surface-raised", "backgroundColor"));
    expect(ringOf(el)).toContain(colourOf("--color-focus"));
    expect(ringOf(el)).toContain("3px");
    expect(el.getBoundingClientRect().height).toBeCloseTo(50, 0);

    // The hint and the counter are what a screen reader hears with the name.
    expect(el).toHaveAccessibleDescription(new RegExp(`^${HINT} 19 / 30`));
    expect(el).not.toHaveAttribute("aria-invalid");
    expect(el).not.toHaveAttribute("readonly");
    expect(canvasElement.querySelector("[aria-busy]")).toBeNull();

    // R11 runs when the edit starts, not when a story starts in it, and focus is never animated.
    await frames(3);
    expect(animations()).toHaveLength(0);
    await parkPointer();
    await settled();
    await repaint(canvasElement);
  },
};

export const Saving: Story = {
  render: args => () => page(
    "Inline edit saving",
    card(
      "saving: read-only, a spinner beside the well",
      480,
      h(Stateful, {
        startEditing: true,
        startSaving: true,
        maxlength: 30,
        answer: "stay",
        onSave: spied(args),
      }),
    ),
  ),
  async play({ canvasElement, args }) {
    const spy = spied(args);
    spy.mockClear();
    const el = await findBox(canvasElement);

    // Reduced first: the spinner is there and nothing turns.
    await expectQuietAfter(async () => {
      expect(spinnerOf(canvasElement)).not.toBeNull();
    });

    expect(el).toHaveAttribute("readonly");
    expect(el).toHaveValue(NAME);
    const busy = canvasElement.querySelector("[aria-busy='true']");
    expect(busy).not.toBeNull();
    expect(busy).toContainElement(el);
    // The spinner sits beside the well, centred on its 50px.
    const spinner = spinnerOf(canvasElement)!;
    expect(spinner).not.toBeNull();
    const well = el.getBoundingClientRect();
    const icon = spinner.getBoundingClientRect();
    expect(icon.left).toBeGreaterThanOrEqual(well.right);
    expect(icon.top + icon.height / 2).toBeCloseTo(well.top + well.height / 2, 0);

    await withMotion("full", async () => {
      await waitFor(() => expect(spinner.getAnimations().filter(a => a.playState === "running")).toHaveLength(1));
      freezeSpinners(canvasElement);
    });

    // While it saves, Enter and a blur ask for nothing.
    el.focus();
    await userEvent.keyboard("{Enter}");
    el.blur();
    await frames(2);
    expect(spy).not.toHaveBeenCalled();
    // The text was selected when the edit began: the picture shows the still input, not a highlight.
    el.setSelectionRange(0, 0);
    await parkPointer();
    await finish(canvasElement);
  },
};

const LONG_ERROR = "That name is taken by another of your Winnies, so give this one a name that none of the others "
  + "has, or rename the other one first.";

export const ErrorState: Story = {
  render: args => () => page(
    "Inline edit error",
    // The blank one comes last: a second input taking the focus blurs the first, and a blank blur gives its edit up.
    card(
      "a 130 character error at 280px",
      280,
      h(Stateful, {
        "initial": NAME,
        "startEditing": true,
        "startError": LONG_ERROR,
        "maxlength": 30,
        "answer": "stay",
        "label": "Winnie name, long error",
        "data-case": "long",
      }),
    ),
    card(
      "error, blank",
      480,
      h(Stateful, {
        initial: "",
        startEditing: true,
        startError: BLANK_ERROR,
        maxlength: 30,
        answer: "stay",
        onSave: spied(args),
      }),
    ),
  ),
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const el = await findBox(canvasElement);

    expect(el).toHaveAttribute("aria-invalid", "true");
    expect(el).toHaveAccessibleDescription(new RegExp(`^${BLANK_ERROR} 0 / 30`));
    expect(canvas.getByText(BLANK_ERROR).closest("p")).toHaveAttribute("role", "alert");
    // The Cherry ring, and the hint has given way to the message.
    expect(ringOf(el)).toContain(colourOf("--color-danger"));
    expect(ringOf(el)).toContain("3px");
    expect(canvas.queryByText(HINT)).toBeNull();
    // Rendered in error, it does not shake: R33 is for a message that arrives.
    await frames(3);
    expect(animations()).toHaveLength(0);

    // The long message wraps in its 280px card and nothing scrolls sideways.
    const long = await findBox(canvasElement, "Winnie name, long error");
    expect(long).toHaveAccessibleDescription(new RegExp(`^${LONG_ERROR}`));
    const message = canvas.getByText(LONG_ERROR).closest<HTMLElement>("p")!;
    expect(message.getBoundingClientRect().height).toBeGreaterThan(Number.parseFloat(getComputedStyle(message).lineHeight) * 2);
    const cardEl = long.closest<HTMLElement>("[data-card]")!;
    expect(cardEl.scrollWidth).toBeLessThanOrEqual(cardEl.clientWidth);
    // Not `finish`: it blurs, and a blur on the blank draft gives the edit up. The picture is the focused field in error.
    await parkPointer();
    await settled();
    await repaint(canvasElement);
  },
};

export const AtLimit: Story = {
  render: args => () => page(
    "Inline edit at the limit",
    card(
      "30 of 30",
      480,
      h(Stateful, {
        initial: LIMIT_NAME,
        startEditing: true,
        maxlength: 30,
        answer: "stay",
        onSave: spied(args),
      }),
    ),
  ),
  async play({ canvasElement }) {
    const el = await findBox(canvasElement);
    await waitFor(() => expect(el).toHaveFocus());
    expect(el).toHaveValue(LIMIT_NAME);
    // At the limit is not over it: the counter stays muted and the input is no error.
    const counter = document.getElementById(el.getAttribute("aria-describedby")!.split(" ").at(-1)!)!;
    expect(counter).toHaveTextContent(/^30 \/ 30/);
    expect(getComputedStyle(counter).color).toBe(colourOf("--color-text-muted"));
    expect(el).not.toHaveAttribute("aria-invalid");
    // The native limit stops a 31st character.
    el.setSelectionRange(30, 30);
    await userEvent.keyboard("x");
    expect(el).toHaveValue(LIMIT_NAME);
    await parkPointer();
    await settled();
    await repaint(canvasElement);
  },
};

export const Flow: Story = {
  render: args => () => page(
    "Inline edit flow",
    card(
      "click, type, Enter, then the label hops",
      560,
      h(Stateful, {
        as: "h2",
        class: "text-3xl",
        maxlength: 30,
        answer: "saving",
        onSave: spied(args),
        ref: (instance: unknown) => {
          ctl = instance as Ctl | null;
        },
      }),
    ),
  ),
  async play({ canvasElement, args, step }) {
    const spy = spied(args);
    spy.mockClear();
    const canvas = within(canvasElement);
    const heading = () => canvas.getByRole("heading", { level: 2 });

    // Reduced first: a finished full-motion animation would stay in the document and fail the quiet check.
    await step("reduced: the whole cycle makes no animation", async () => {
      await expectQuietAfter(async () => {
        const input = await openByClick(canvasElement);
        await userEvent.keyboard("  Pixel  {Enter}");
        await waitFor(() => expect(input).toHaveAttribute("readonly"));
        ctl!.succeed();
        await waitFor(() => expect(heading()).toHaveTextContent("Pixel"));
      });
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith("Pixel");
      expect(canvas.queryByRole("textbox")).toBeNull();
    });

    await step("full motion: R11 on the input, R12 on the label", () => withMotion("full", async () => {
      spy.mockClear();
      expect(animations()).toHaveLength(0);
      const input = await openByClick(canvasElement, "Pixel");

      // R11: one animation, on the native input, scaling in.
      await waitFor(() => expect(animations()).toHaveLength(1));
      const editIn = animations()[0]!;
      expect((editIn.effect as KeyframeEffect).target).toBe(input);
      const scales = (editIn.effect as KeyframeEffect).getKeyframes().map(frame => String(frame.transform));
      expect(scales).toEqual([
        expect.stringMatching(/^scale\(0?\.96\)$/),
        expect.stringMatching(/^scale\((1|1\.0)\)$/),
      ]);
      await editIn.finished;
      await frames();

      await userEvent.keyboard("Mochi{Enter}");
      await waitFor(() => expect(spy).toHaveBeenCalledWith("Mochi"));
      expect(spy).toHaveBeenCalledTimes(1);
      ctl!.succeed();

      // R12: one animation, on the resting text; the amount scales with the gain, so only its direction is pinned.
      await waitFor(() => {
        expect(animations()).toHaveLength(1);
        expect((animations()[0]!.effect as KeyframeEffect).target).toBe(heading());
      });
      expect(heading()).toHaveTextContent("Mochi");
      const hop = (animations()[0]!.effect as KeyframeEffect).getKeyframes().map(frame => String(frame.transform));
      expect(hop[0]).toBe("none");
      expect(hop[1]).toMatch(/^translateY\(-[\d.]+px\)$/);
      expect(hop[2]).toBe("none");
      await animations()[0]!.finished;
    }));

    await parkPointer();
    await finish(canvasElement);
  },
};

export const EnterSavesOnce: Story = {
  render: args => () => page(
    "Inline edit Enter saves once",
    card(
      "Enter, then a blur, then the caller closes",
      560,
      h(Stateful, {
        answer: "stay",
        onSave: spied(args),
        ref: (instance: unknown) => {
          ctl = instance as Ctl | null;
        },
      }),
    ),
  ),
  async play({ canvasElement, args }) {
    const spy = spied(args);
    spy.mockClear();
    const input = await openByClick(canvasElement);

    await userEvent.keyboard("  Pixel  {Enter}");
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith("Pixel");

    // The caller leaves the input open (its request is out): the blur that follows is the same attempt.
    input.blur();
    await frames(2);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(canvasElement.querySelector("input")).toBe(input);

    // Closing it removes the focused input, which can blur it once more: still the same attempt.
    ctl!.close("Pixel");
    await waitFor(() => expect(within(canvasElement).queryByRole("textbox")).toBeNull());
    input.dispatchEvent(new FocusEvent("blur"));
    await parkPointer();
    await finish(canvasElement);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(within(canvasElement).getByText("Pixel")).toBeVisible();
  },
};

export const BlurSavesOnce: Story = {
  render: args => () => page(
    "Inline edit blur saves once",
    card("click elsewhere", 560, h(Stateful, {
      onSave: spied(args),
    })),
  ),
  async play({ canvasElement, args }) {
    const spy = spied(args);
    spy.mockClear();
    const input = await openByClick(canvasElement);

    await userEvent.keyboard("  Pixel  ");
    await clickElsewhere(canvasElement);
    await waitFor(() => expect(within(canvasElement).getByText("Pixel")).toBeVisible());
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith("Pixel");

    // The removal of the input blurs it a second time in some browsers: no second save.
    input.dispatchEvent(new FocusEvent("blur"));
    await parkPointer();
    await finish(canvasElement);
    expect(spy).toHaveBeenCalledTimes(1);
  },
};

export const EscCancels: Story = {
  render: args => () => page(
    "Inline edit Esc cancels",
    card("type, then Esc", 560, h(Stateful, {
      onSave: spied(args),
    })),
  ),
  async play({ canvasElement, args }) {
    const spy = spied(args);
    spy.mockClear();
    const canvas = within(canvasElement);
    // Full motion, so that "no animation" means something: Esc makes none (R12), and R11 has finished by then.
    await withMotion("full", async () => {
      const input = await openByClick(canvasElement);
      await settled();
      await userEvent.keyboard("Mochi");
      expect(input).toHaveValue("Mochi");

      // The Escape does not travel on: a rename inside a modal must not close the modal.
      const outer = fn();
      canvasElement.addEventListener("keydown", outer);
      await userEvent.keyboard("{Escape}");
      canvasElement.removeEventListener("keydown", outer);
      expect(outer).not.toHaveBeenCalled();

      // The old text is back, there is no input, and nothing moved.
      expect(canvas.getByText(NAME)).toBeVisible();
      expect(canvas.queryByRole("textbox")).toBeNull();
      await frames(3);
      expect(animations()).toHaveLength(0);
      expect(spy).not.toHaveBeenCalled();

      // The blur that removing the focused input causes saves nothing.
      input.dispatchEvent(new FocusEvent("blur"));
      await clickElsewhere(canvasElement);
      await frames(3);
      expect(spy).not.toHaveBeenCalled();
      expect(animations()).toHaveLength(0);
    });

    // The next edit starts from the old text, not from what Esc threw away.
    const again = await openByClick(canvasElement);
    expect(again).toHaveValue(NAME);
    await userEvent.keyboard("{Escape}");
    await parkPointer();
    await finish(canvasElement);
  },
};

export const BlankBlurCancels: Story = {
  render: args => () => page(
    "Inline edit blank blur",
    card("clear it, click elsewhere", 560, h(Stateful, {
      onSave: spied(args),
    })),
  ),
  async play({ canvasElement, args }) {
    const spy = spied(args);
    spy.mockClear();
    const input = await openByClick(canvasElement);
    await userEvent.clear(input);
    expect(input).toHaveValue("");
    await clickElsewhere(canvasElement);
    await waitFor(() => expect(within(canvasElement).queryByRole("textbox")).toBeNull());
    // No save, and the old text is back: a blur on a blank draft gives the edit up.
    expect(within(canvasElement).getByText(NAME)).toBeVisible();
    expect(spy).not.toHaveBeenCalled();
    await parkPointer();
    await finish(canvasElement);
  },
};

export const BlankEnterEmits: Story = {
  render: args => () => page(
    "Inline edit blank Enter",
    card("clear it, Enter", 560, h(Stateful, {
      onSave: spied(args),
    })),
  ),
  async play({ canvasElement, args, step }) {
    const spy = spied(args);
    spy.mockClear();
    const canvas = within(canvasElement);

    await step("reduced: the message appears, nothing moves", async () => {
      await expectQuietAfter(async () => {
        const input = await openByClick(canvasElement);
        await userEvent.clear(input);
        await userEvent.keyboard("{Enter}");
        await waitFor(() => expect(canvas.getByRole("alert")).toHaveTextContent(BLANK_ERROR));
      });
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith("");
      // The input stays open, in error.
      const input = await findBox(canvasElement);
      expect(input).toHaveAttribute("aria-invalid", "true");
      expect(input).toHaveAccessibleDescription(new RegExp(`^${BLANK_ERROR}`));
      // Esc takes the error with it.
      await userEvent.keyboard("{Escape}");
      await waitFor(() => expect(canvas.queryByRole("textbox")).toBeNull());
    });

    await step("full motion: one shake, the input's own (R33)", () => withMotion("full", async () => {
      spy.mockClear();
      const input = await openByClick(canvasElement);
      await settled();
      await userEvent.clear(input);
      expect(animations()).toHaveLength(0);
      await userEvent.keyboard("{Enter}");
      await waitFor(() => expect(animations()).toHaveLength(1));
      expect((animations()[0]!.effect as KeyframeEffect).target).toBe(input);
      expect(canvas.getByRole("alert")).toHaveTextContent(BLANK_ERROR);
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith("");
      expect(input).toBeInTheDocument();
      await animations()[0]!.finished;
      await frames();
    }));

    // Not `finish`: it blurs, and a blur on the blank draft gives the edit up. The picture is the field in error.
    await parkPointer();
    await settled();
    await repaint(canvasElement);
  },
};

export const SavingBlocks: Story = {
  render: args => () => page(
    "Inline edit saving blocks",
    card(
      "Enter, then Enter and a blur while it saves",
      560,
      h(Stateful, {
        answer: "saving",
        onSave: spied(args),
        ref: (instance: unknown) => {
          ctl = instance as Ctl | null;
        },
      }),
    ),
  ),
  async play({ canvasElement, args }) {
    const spy = spied(args);
    spy.mockClear();
    const input = await openByClick(canvasElement);
    await userEvent.keyboard("Pixel{Enter}");
    await waitFor(() => expect(input).toHaveAttribute("readonly"));
    expect(spy).toHaveBeenCalledTimes(1);

    // While the request is out: another Enter, a blur and an Esc do nothing.
    await userEvent.keyboard("{Enter}");
    input.blur();
    await frames(2);
    expect(spy).toHaveBeenCalledTimes(1);
    input.focus();
    await userEvent.keyboard("{Escape}");
    expect(canvasElement.querySelector("input")).toBe(input);

    // It failed: the message shows, the input is writable again, and the same attempt can be made again.
    ctl!.fail("Could not save, try again.");
    await waitFor(() => expect(within(canvasElement).getByRole("alert")).toHaveTextContent("Could not save, try again."));
    expect(input).not.toHaveAttribute("readonly");
    expect(input).toHaveAttribute("aria-invalid", "true");
    input.focus();
    await userEvent.keyboard("{Enter}");
    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy).toHaveBeenLastCalledWith("Pixel");
    await waitFor(() => expect(input).toHaveAttribute("readonly"));

    ctl!.succeed();
    await waitFor(() => expect(within(canvasElement).queryByRole("textbox")).toBeNull());
    expect(spy).toHaveBeenCalledTimes(2);
    await parkPointer();
    await finish(canvasElement);
  },
};

export const ImeEnter: Story = {
  render: args => () => page(
    "Inline edit IME Enter",
    card("an Enter that confirms a composition", 560, h(Stateful, {
      answer: "stay",
      onSave: spied(args),
    })),
  ),
  async play({ canvasElement, args }) {
    const spy = spied(args);
    spy.mockClear();
    const input = await openByClick(canvasElement);

    // The Enter that picks a candidate in an input method editor is not the user's Enter.
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", isComposing: true, bubbles: true }));
    await frames(2);
    expect(spy).not.toHaveBeenCalled();

    await userEvent.keyboard("{Enter}");
    expect(spy).toHaveBeenCalledTimes(1);
    await parkPointer();
    await finish(canvasElement);
  },
};
