import type { Meta, StoryObj } from "@storybook/vue3-vite";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import { defineComponent, h, ref } from "vue";
import UiTextInput from "../../app/components/ui/text-input.vue";
import { expectQuietAfter } from "../support/component-checks";
import { chip, headingCss } from "../support/html";
import { animations, frames, withMotion } from "../support/motion-play";
import { withMotionSurface } from "../support/motion-surface";
import { realPointer } from "../support/real-pointer";

// The app's own UiTextInput (#312): the handoff's pill well with its hover, focus and error rings (03-components.md,
// `text-input`). Every string below is story copy, not product copy.

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
    style: `box-sizing:border-box;width:${width}px;max-width:100%;display:flex;flex-direction:column;gap:12px;`
      + "padding:16px;background:var(--color-surface);border-radius:var(--radius-xl)",
  }, [
    h("div", {
      innerHTML: chip(story),
    }),
    ...body,
  ]);
}

interface Api { focus: () => void; select: () => void }

// The Default story's instance, from the `ref` callback of its render function.
let api: Api | null = null;

// A text input holds no state: the parent does. This is the smallest parent, and it hands out the input's exposed
// methods. `onModel` sees every value the input emits.
const Stateful = defineComponent({
  name: "StatefulTextInput",
  props: {
    initial: {
      type: [String, Number],
      default: undefined,
    },
    onModel: { type: Function, default: undefined },
  },
  setup(props, { expose }) {
    const value = ref<string | number | undefined>(props.initial);
    const inner = ref<Api | null>(null);
    expose({
      focus: () => inner.value?.focus(),
      select: () => inner.value?.select(),
    });
    return () => h(UiTextInput, {
      "ref": inner,
      "modelValue": value.value,
      "onUpdate:modelValue": (next: string | number | undefined) => {
        value.value = next;
        props.onModel?.(next);
      },
    });
  },
});

const meta = {
  title: "UI/Text input",
  decorators: [withMotionSurface],
  // Spies for the stories that check what the input emits and forwards; the others never read them.
  args: {
    "onUpdate:modelValue": fn(),
    "onBlur": fn(),
    "onKeydown": fn(),
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

interface Spied {
  "onUpdate:modelValue": ReturnType<typeof fn>;
  "onBlur": ReturnType<typeof fn>;
  "onKeydown": ReturnType<typeof fn>;
}

function findBox(canvasElement: HTMLElement, name: string, role: "textbox" | "spinbutton" = "textbox") {
  return within(canvasElement).findByRole(role, { name }) as Promise<HTMLInputElement>;
}

/**
 * What a token resolves to as a computed colour, which is how `getComputedStyle` writes a ring's colour.
 * @param token the custom property, `--color-focus`
 * @returns the colour as the browser computes it
 */
function colourOf(token: string): string {
  const probe = document.createElement("span");
  document.body.append(probe);
  probe.style.color = `var(${token})`;
  const colour = getComputedStyle(probe).color;
  probe.remove();
  return colour;
}

/** The well's resting look is the same in every story: sunken, no ring but the well's own shadow. */
const ringOf = (el: Element) => getComputedStyle(el).boxShadow;

export const Default: Story = {
  render: (args) => {
    const spied = args as unknown as Spied;
    return () => page(
      "Text input default",
      card(
        "empty, placeholder, hidden label",
        360,
        h(Stateful, {
          label: "Game",
          hideLabel: true,
          placeholder: "Game",
          onModel: spied["onUpdate:modelValue"],
          onBlur: spied.onBlur,
          onKeydown: spied.onKeydown,
          ref: (instance: unknown) => {
            api = instance as Api | null;
          },
        }),
      ),
      card("filled, hidden label", 360, h(Stateful, { initial: "Elden Ring", label: "Winnie name", hideLabel: true })),
      card("visible label", 360, h(Stateful, { initial: "No deaths", label: "Win Condition" })),
    );
  },
  async play({ canvasElement, args }) {
    const spied = args as unknown as Spied;
    const el = await findBox(canvasElement, "Game");
    expect(el).toHaveAttribute("placeholder", "Game");
    expect(el).not.toHaveAttribute("aria-invalid");
    expect(el).not.toHaveAttribute("aria-describedby");
    expect(el).toHaveAttribute("type", "text");
    // The other two are named too: one by `aria-label`, one by its visible label.
    expect(await findBox(canvasElement, "Winnie name")).toHaveValue("Elden Ring");
    expect(await findBox(canvasElement, "Win Condition")).toHaveValue("No deaths");
    expect(canvasElement.querySelector("label")).toHaveTextContent("Win Condition");

    await userEvent.type(el, "ab");
    expect(el).toHaveValue("ab");
    expect(spied["onUpdate:modelValue"]).toHaveBeenCalledTimes(2);
    expect(spied["onUpdate:modelValue"]).toHaveBeenNthCalledWith(1, "a");
    expect(spied["onUpdate:modelValue"]).toHaveBeenLastCalledWith("ab");
    // Listeners reach the native input: `blur` and `keydown` are not emits of the component.
    expect(spied.onKeydown).toHaveBeenCalledTimes(2);

    api!.select();
    expect(el.selectionStart).toBe(0);
    expect(el.selectionEnd).toBe(2);
    api!.focus();
    expect(el).toHaveFocus();

    el.blur();
    expect(spied.onBlur).toHaveBeenCalledTimes(1);
  },
};

export const NumberVariant: Story = {
  args: {
    "onUpdate:modelValue": fn(),
  },
  render: (args) => {
    const spied = args as unknown as Spied;
    return () => page(
      "Text input number",
      card(
        "empty, placeholder Target",
        200,
        h(Stateful, {
          label: "Target",
          hideLabel: true,
          variant: "number",
          placeholder: "Target",
          onModel: spied["onUpdate:modelValue"],
        }),
      ),
      card("0", 200, h(Stateful, {
        initial: 0,
        label: "Zero",
        hideLabel: true,
        variant: "number",
      })),
      card("9999", 200, h(Stateful, {
        initial: 9999,
        label: "Count",
        hideLabel: true,
        variant: "number",
      })),
    );
  },
  async play({ canvasElement, args }) {
    const spy = (args as unknown as Spied)["onUpdate:modelValue"];
    const el = await findBox(canvasElement, "Target", "spinbutton");
    expect(el).toHaveAttribute("type", "number");
    expect(el.getBoundingClientRect().width).toBeCloseTo(110, 0);
    expect(getComputedStyle(el).textAlign).toBe("center");
    expect(await findBox(canvasElement, "Zero", "spinbutton")).toHaveValue(0);
    expect(await findBox(canvasElement, "Count", "spinbutton")).toHaveValue(9999);

    // A number, never the string: the edit card's `v-model.number` and the add row's `""` handling both depend on it.
    await userEvent.type(el, "12");
    expect(spy).toHaveBeenLastCalledWith(12);
    expect(typeof spy.mock.lastCall![0]).toBe("number");
    await userEvent.clear(el);
    expect(spy).toHaveBeenLastCalledWith("");

    el.blur();
  },
};

export const Inline: Story = {
  render: () => () => page(
    "Text input inline",
    card(
      "the edit card: Game, Win Condition, Target",
      640,
      h("div", { style: "display:flex;align-items:center;gap:8px" }, [
        h(Stateful, {
          initial: "Elden Ring",
          label: "Game",
          hideLabel: true,
          variant: "inline",
          class: "min-w-0 flex-1",
        }),
        h(Stateful, {
          initial: "No deaths",
          label: "Win Condition",
          hideLabel: true,
          variant: "inline",
          class: "min-w-0 flex-1",
        }),
        h(Stateful, {
          initial: 3,
          label: "Target",
          hideLabel: true,
          variant: "number",
        }),
      ]),
    ),
    card(
      "the rename input",
      360,
      h(Stateful, {
        initial: "Kitty vs. the world",
        label: "Winnie name",
        hideLabel: true,
        variant: "inline",
      }),
    ),
  ),
  async play({ canvasElement }) {
    for (const name of ["Game", "Win Condition", "Winnie name"]) {
      const el = await findBox(canvasElement, name);
      expect(el.getBoundingClientRect().height).toBeCloseTo(50, 0);
      expect(getComputedStyle(el).paddingLeft).toBe("18px");
    }
    expect((await findBox(canvasElement, "Target", "spinbutton")).getBoundingClientRect().width).toBeCloseTo(110, 0);
  },
};

export const Hover: Story = {
  render: () => () => page(
    "Text input hover",
    card("pointer over the field", 360, h(Stateful, { label: "Game", hideLabel: true, placeholder: "Game" })),
  ),
  async play({ canvasElement }) {
    const el = await findBox(canvasElement, "Game");
    const rest = ringOf(el);
    // Storybook's own UI cannot drive `:hover`; the runner can, and it is where the ring is checked.
    const pointer = await realPointer();
    if (!pointer)
      return;
    await pointer.hover(el);
    await waitFor(() => expect(el.matches(":hover")).toBe(true));
    // The well keeps its shadow and gains a 2px ring in `--color-border`.
    expect(ringOf(el)).not.toBe(rest);
    expect(ringOf(el)).toContain(colourOf("--color-border"));
    expect(ringOf(el)).toContain("2px");
    expect(getComputedStyle(el).transitionDuration).toBe("0s");
    // The pointer stays: the picture shows the hover ring.
  },
};

export const Focus: Story = {
  render: () => () => page(
    "Text input focus",
    card("keyboard focus", 360, h(Stateful, { initial: "Elden Ring", label: "Game", hideLabel: true })),
  ),
  async play({ canvasElement }) {
    const el = await findBox(canvasElement, "Game");
    // Tab, so the focus is keyboard-driven and `:focus-visible` matches.
    await userEvent.tab();
    expect(el).toHaveFocus();
    expect(el.matches(":focus-visible")).toBe(true);

    const style = getComputedStyle(el);
    // A 3px ring in `--color-focus`, on top of the well's shadow, and a transparent outline for forced-colors mode.
    expect(style.boxShadow).toContain(colourOf("--color-focus"));
    expect(style.boxShadow).toContain("3px");
    expect(style.outlineStyle).toBe("solid");
    expect(style.outlineWidth).toBe("3px");

    // R32: the ring appears at once and never animates. No property has a duration, and nothing is running.
    for (const duration of style.transitionDuration.split(",")) {
      expect(duration.trim()).toBe("0s");
    }
    expect(style.animationName).toBe("none");
    expect(animations()).toHaveLength(0);

    // A pointer over a focused field does not take the ring away: the focus ring wins over the hover ring.
    const pointer = await realPointer();
    if (pointer) {
      await pointer.hover(el);
      await waitFor(() => expect(el.matches(":hover")).toBe(true));
      expect(ringOf(el)).toContain(colourOf("--color-focus"));
      await pointer.unhover(el);
    }
    // The ring stays until the story is left: it is the picture.
  },
};

const MESSAGE = "Game is required";
const TOO_LONG_NAME = "A Winnie name that is much too long";
const LONG_MESSAGE = "This Challenge already exists in this Winnie, so the game and the win condition together have to "
  + "differ from the one you already added above.";

export const ErrorState: Story = {
  render: () => () => page(
    "Text input error",
    card(
      "error with a message",
      360,
      h(Stateful, {
        initial: "",
        label: "Game",
        hideLabel: true,
        placeholder: "Game",
        error: MESSAGE,
      }),
    ),
    card(
      "a 140 character message at 280px",
      280,
      h(Stateful, {
        initial: "Elden Ring",
        label: "Win Condition",
        hideLabel: true,
        error: LONG_MESSAGE,
      }),
    ),
    card(
      "error and a counter above the limit",
      360,
      h(Stateful, {
        initial: TOO_LONG_NAME,
        label: "Winnie name",
        counter: 30,
        error: "Name is too long",
      }),
    ),
  ),
  async play({ canvasElement }) {
    const canvas = within(canvasElement);

    const game = await findBox(canvasElement, "Game");
    expect(game).toHaveAttribute("aria-invalid", "true");
    expect(game).toHaveAccessibleDescription(MESSAGE);
    const alert = canvas.getByText(MESSAGE).closest("p")!;
    expect(alert).toHaveAttribute("role", "alert");
    // The Cherry ring: `--color-danger`, 3px, on top of the well.
    expect(ringOf(game)).toContain(colourOf("--color-danger"));
    expect(ringOf(game)).toContain("3px");

    // 140 characters at 280px: it wraps, the icon keeps its size, and nothing scrolls sideways.
    expect(LONG_MESSAGE.length).toBeGreaterThanOrEqual(140);
    const long = await findBox(canvasElement, "Win Condition");
    expect(long).toHaveAccessibleDescription(LONG_MESSAGE);
    const longRoot = long.parentElement!;
    const longMessage = longRoot.querySelector<HTMLElement>("[role=alert]")!;
    const icon = longMessage.querySelector("svg")!;
    expect(longMessage.getBoundingClientRect().height).toBeGreaterThan(Number.parseFloat(getComputedStyle(longMessage).lineHeight) * 2);
    expect(icon.getBoundingClientRect().width).toBeCloseTo(18, 0);
    expect(longRoot.scrollWidth).toBeLessThanOrEqual(longRoot.clientWidth);

    // Error and counter: the description names both, and the count is over.
    const counted = await findBox(canvasElement, "Winnie name");
    expect(counted).toHaveAccessibleDescription(new RegExp(`^Name is too long ${TOO_LONG_NAME.length} / 30`));
    expect(counted.getAttribute("aria-describedby")!.split(" ")).toHaveLength(2);
    expect(ringOf(counted)).toContain(colourOf("--color-danger"));

    // A focused field in error keeps the Cherry ring: the error wins over the focus ring.
    await userEvent.tab();
    expect(game).toHaveFocus();
    expect(ringOf(game)).toContain(colourOf("--color-danger"));
    expect(ringOf(game)).not.toContain(colourOf("--color-focus"));
    game.blur();
  },
};

export const Disabled: Story = {
  render: () => () => page(
    "Text input disabled",
    card("disabled", 360, h(Stateful, {
      initial: "Fifty Challenges",
      label: "Game",
      hideLabel: true,
      disabled: true,
    })),
    card("readonly", 360, h(Stateful, {
      initial: "https://winnies.example/shared/kitty",
      label: "Share link",
      hideLabel: true,
      readonly: true,
    })),
  ),
  async play({ canvasElement }) {
    const disabled = await findBox(canvasElement, "Game");
    const readonly = await findBox(canvasElement, "Share link");
    expect(disabled).toBeDisabled();
    expect(getComputedStyle(disabled).opacity).toBe("0.5");
    expect(getComputedStyle(disabled).cursor).toBe("not-allowed");
    expect(readonly).toHaveAttribute("readonly");
    expect(readonly).toBeEnabled();

    await userEvent.tab();
    expect(disabled).not.toHaveFocus();
    expect(readonly).toHaveFocus();
    expect(ringOf(readonly)).toContain(colourOf("--color-focus"));
    readonly.blur();

    // A disabled well has no hover ring; a readonly one keeps it.
    const pointer = await realPointer();
    if (!pointer)
      return;
    const restDisabled = ringOf(disabled);
    const restReadonly = ringOf(readonly);
    await pointer.hover(readonly);
    await waitFor(() => expect(readonly.matches(":hover")).toBe(true));
    expect(ringOf(readonly)).not.toBe(restReadonly);
    expect(ringOf(readonly)).toContain(colourOf("--color-border"));
    await pointer.hover(disabled);
    await waitFor(() => expect(disabled.matches(":hover")).toBe(true));
    expect(ringOf(disabled)).toBe(restDisabled);
    await pointer.unhover(disabled);
  },
};

export const Counter: Story = {
  render: () => () => page(
    "Text input counter",
    ...[0, 29, 30, 31, 39].map(n => card(
      `${n} of 30, visible label`,
      360,
      h(Stateful, {
        initial: "a".repeat(n),
        label: `Winnie name ${n}`,
        counter: 30,
      }),
    )),
    ...[0, 29, 30, 31, 39].map(n => card(
      `${n} of 30, hidden label`,
      360,
      h(Stateful, {
        initial: "a".repeat(n),
        label: `Hidden name ${n}`,
        hideLabel: true,
        counter: 30,
      }),
    )),
  ),
  async play({ canvasElement }) {
    const cherry = colourOf("--color-danger-text");
    const muted = colourOf("--color-text-muted");

    for (const prefix of ["Winnie name", "Hidden name"]) {
      for (const n of [0, 29, 30, 31, 39]) {
        const el = await findBox(canvasElement, `${prefix} ${n}`);
        // The counter is part of the field's description, so a screen reader hears the count with the name.
        const counterEl = document.getElementById(el.getAttribute("aria-describedby")!)!;
        expect(counterEl).toHaveTextContent(new RegExp(`^${n} / 30`));
        // Cherry above the limit, never at it.
        expect(getComputedStyle(counterEl).color).toBe(n > 30
          ? cherry
          : muted);
        if (n > 30)
          expect(counterEl).toHaveTextContent("over the limit");
        else
          expect(counterEl).not.toHaveTextContent("over the limit");
        // The counter does not make the field invalid: the message on submit does.
        expect(el).not.toHaveAttribute("aria-invalid");
      }
    }

    // It follows the typing.
    const typed = await findBox(canvasElement, "Winnie name 30");
    await userEvent.type(typed, "b");
    const counterEl = document.getElementById(typed.getAttribute("aria-describedby")!)!;
    expect(counterEl).toHaveTextContent(/^31 \/ 30/);
    expect(getComputedStyle(counterEl).color).toBe(cherry);
    await userEvent.type(typed, "{Backspace}");
    expect(counterEl).toHaveTextContent(/^30 \/ 30/);
    expect(getComputedStyle(counterEl).color).toBe(muted);

    typed.blur();
  },
};

export const LongValues: Story = {
  render: () => () => page(
    "Text input long values",
    card("Game, 30 characters", 320, h(Stateful, { initial: "Teenage Mutant Ninja Turtles 2", label: "Game", hideLabel: true })),
    card("Win Condition, 40 characters", 320, h(Stateful, { initial: "Beat every boss without taking a hit now", label: "Win Condition", hideLabel: true })),
    card("Winnie name, 30 characters", 320, h(Stateful, { initial: "Extremely Long Winnie Name Run", label: "Winnie name", hideLabel: true })),
    card(
      "80 characters",
      320,
      h(Stateful, {
        initial: "Beat every single boss in the whole game without taking a hit or ever dying once",
        label: "Eighty",
        hideLabel: true,
      }),
    ),
  ),
  async play({ canvasElement }) {
    for (const name of [
      "Game",
      "Win Condition",
      "Winnie name",
      "Eighty",
    ]) {
      const el = await findBox(canvasElement, name);
      const root = el.parentElement!;
      // The well keeps its height and the card's width, whatever the text.
      expect(el.getBoundingClientRect().height).toBeCloseTo(54, 0);
      expect(el.getBoundingClientRect().width).toBeCloseTo(root.getBoundingClientRect().width, 0);
      expect(root.scrollWidth).toBeLessThanOrEqual(root.clientWidth);
    }
    // The text scrolls inside the well: it does not widen it.
    const eighty = await findBox(canvasElement, "Eighty");
    expect(eighty.value).toHaveLength(80);
    expect(eighty.scrollWidth).toBeGreaterThan(eighty.clientWidth);
  },
};

// A one-field form: the way the add row and Create Winnie submit. Typing clears the error, a submit sets it.
const SubmitForm = defineComponent({
  name: "SubmitForm",
  setup() {
    const value = ref<string | number | undefined>("");
    const error = ref("");
    return () => h("form", {
      onSubmit: (event: Event) => {
        event.preventDefault();
        error.value = value.value
          ? ""
          : "Game is required";
      },
    }, [
      h(UiTextInput, {
        "modelValue": value.value,
        "onUpdate:modelValue": (next: string | number | undefined) => {
          value.value = next;
          error.value = "";
        },
        "label": "Game",
        "hideLabel": true,
        "placeholder": "Game",
        "error": error.value,
      }),
    ]);
  },
});

/**
 * The offsets of a shake in px, from the keyframes of a running animation.
 * @param animation the animation on the input
 * @returns each keyframe's `translateX`
 */
function offsets(animation: Animation): number[] {
  return (animation.effect as KeyframeEffect).getKeyframes().map((frame) => {
    const match = /translateX\((-?[\d.]+)(?:px)?\)/.exec(String(frame.transform));
    return match
      ? Number(match[1])
      : Number.NaN;
  });
}

export const Submitting: Story = {
  render: () => () => page(
    "Text input submitting",
    card("empty, Enter", 360, h(SubmitForm)),
  ),
  async play({ canvasElement, step }) {
    const canvas = within(canvasElement);
    const el = await findBox(canvasElement, "Game");

    // Reduced first: a finished full-motion animation would stay in the document and fail the quiet check.
    await step("reduced: the message appears, nothing moves", async () => {
      await expectQuietAfter(async () => {
        await userEvent.click(el);
        await userEvent.keyboard("{Enter}");
        await waitFor(() => expect(canvas.getByRole("alert")).toHaveTextContent(MESSAGE));
      });
      expect(el).toHaveAttribute("aria-invalid", "true");
      expect(el).toHaveAccessibleDescription(MESSAGE);
    });

    await step("full motion: one shake per new message, on the input (R33)", () => withMotion("full", async () => {
      // Typing takes the error away; emptying the field and submitting again brings it back.
      await userEvent.type(el, "x");
      await waitFor(() => expect(canvas.queryByRole("alert")).toBeNull());
      await userEvent.clear(el);
      expect(animations()).toHaveLength(0);

      await userEvent.keyboard("{Enter}");
      await waitFor(() => expect(animations()).toHaveLength(1));
      const shake = animations()[0]!;
      expect((shake.effect as KeyframeEffect).target).toBe(el);
      expect(offsets(shake)).toEqual([0, -6, 6, -4, 3, 0]);
      expect(canvas.getByRole("alert")).toHaveTextContent(MESSAGE);
      await shake.finished;
      await frames();

      // The same error again is not a new one: no second shake.
      await userEvent.keyboard("{Enter}");
      await frames(3);
      expect(animations()).toHaveLength(0);
      expect(canvas.getByRole("alert")).toHaveTextContent(MESSAGE);

      // A value takes the error and its message away.
      await userEvent.type(el, "Elden Ring");
      await waitFor(() => expect(el).not.toHaveAttribute("aria-invalid"));
      expect(canvas.queryByRole("alert")).toBeNull();
      expect(el).not.toHaveAttribute("aria-describedby");
    }));

    // Ends settled, ring and caret included, so the picture shows the state and not the interaction.
    el.blur();
  },
};
