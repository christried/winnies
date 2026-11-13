import type { Meta, StoryObj } from "@storybook/vue3-vite";
import type { ThemePreference } from "../../shared/constants";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import { h, ref } from "vue";
import UiThemeSwitch from "../../app/components/ui/theme-switch.vue";
import { expectQuietAfter } from "../support/component-checks";
import { chip, headingCss } from "../support/html";
import { animations, frames, layerEl, particleCount, withMotion } from "../support/motion-play";
import { withMotionSurface } from "../support/motion-surface";

// The app's own UiThemeSwitch (#324): the handoff's three-way radiogroup, Light, Dark and Match system
// (03-components.md, `theme-switch`). No screen uses it yet; R3 places it in the account popover. The component never
// sets the theme: a choice plays the wipe (R28) and the caller swaps at its end, as `Choosing`'s stage does here.

// Match system always resolves to this, so the pictures and the emitted values do not depend on the toolbar.
const SYSTEM = "dark";

// Text sits on a chip or a surface card, never straight on the dialect backdrop: axe cannot judge contrast over it.
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
  title: "UI/Theme switch",
  decorators: [withMotionSurface],
  args: {
    "onUpdate:modelValue": fn(),
    "swap": fn(),
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

type Spy = ReturnType<typeof fn>;
interface Spied { "onUpdate:modelValue": Spy; "swap": Spy }
const spies = (args: unknown) => args as Spied;

const NAMES = ["Light", "Dark", "Match system"] as const;

const findGroup = (canvasElement: HTMLElement) => within(canvasElement).findByRole("radiogroup", { name: "Theme" });
function radio(canvasElement: HTMLElement, name: typeof NAMES[number]) {
  return within(canvasElement).findByRole("radio", { name });
}

/** What every rest picture checks: the group, its three radios, which one is checked and the roving tab stop. */
async function expectRest(canvasElement: HTMLElement, checked: typeof NAMES[number]) {
  const group = await findGroup(canvasElement);
  const radios = within(group).getAllByRole("radio");
  expect(radios.map(r => r.textContent?.trim())).toEqual([...NAMES]);
  for (const el of radios) {
    const on = el.textContent?.trim() === checked;
    expect(el).toHaveAttribute("aria-checked", on ? "true" : "false");
    expect(el).toHaveAttribute("tabindex", on ? "0" : "-1");
    expect(el.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  }
  expect(within(group).getByRole("radio", { name: checked })).toBeTruthy();
  (document.activeElement as HTMLElement | null)?.blur();
}

function rest(title: string, modelValue: ThemePreference, checked: typeof NAMES[number]): Story {
  return {
    render: args => () => page(title, labelled(`modelValue ${modelValue}`, h(UiThemeSwitch, {
      modelValue,
      systemTheme: SYSTEM,
      ...args,
    }))),
    play: ({ canvasElement }) => expectRest(canvasElement, checked),
  };
}

export const Light = rest("Theme switch, Light", "light", "Light");
export const Dark = rest("Theme switch, Dark", "dark", "Dark");
export const MatchSystem = rest("Theme switch, Match system", "system", "Match system");

export const Focus: Story = {
  render: args => () => page("Theme switch focus", labelled("keyboard focus", h(UiThemeSwitch, {
    modelValue: "light",
    systemTheme: SYSTEM,
    ...args,
  }))),
  async play({ canvasElement }) {
    const light = await radio(canvasElement, "Light");
    // Tab, so the focus is keyboard-driven and `:focus-visible` matches.
    await userEvent.tab();
    expect(light).toHaveFocus();
    expect(light.matches(":focus-visible")).toBe(true);
    const ring = getComputedStyle(light);
    expect(ring.outlineStyle).toBe("solid");
    expect(ring.outlineWidth).not.toBe("0px");
    // R32: no state of a segment animates, the ring and the checked fill included.
    for (const name of NAMES)
      expect(getComputedStyle(await radio(canvasElement, name)).transitionDuration).toBe("0s");
  },
};

// A story keeps its own state; the play puts it back through this, so the picture and the end state do not depend on
// the runner. Assigned by the render of the story that ran last.
let reset: (() => void) | undefined;
let setModel: ((value: ThemePreference) => void) | undefined;
let unmount: (() => void) | undefined;

export const Keyboard: Story = {
  render: (args) => {
    const value = ref<ThemePreference>("light");
    reset = () => {
      value.value = "light";
    };
    return () => page("Theme switch keyboard", labelled("stateful", h(UiThemeSwitch, {
      "modelValue": value.value,
      "systemTheme": SYSTEM,
      "swap": spies(args).swap,
      "onUpdate:modelValue": (next: ThemePreference) => {
        value.value = next;
        spies(args)["onUpdate:modelValue"](next);
      },
    }), h("button", {
      type: "button",
      style: "font:var(--font-weight-heavy) var(--text-xs) var(--font-body);color:var(--color-text);padding:8px 12px",
    }, "After")));
  },
  async play({ canvasElement, args, step }) {
    const { "onUpdate:modelValue": update, swap } = spies(args);
    const [light, dark, system] = await Promise.all(NAMES.map(name => radio(canvasElement, name)));
    const after = await within(canvasElement).findByRole("button", { name: "After" });
    const stops = (...expected: number[]) => [light!, dark!, system!].forEach((el, i) =>
      expect(el).toHaveAttribute("tabindex", String(expected[i])));
    const calls = (spy: Spy) => spy.mock.calls.map(call => call[0]);

    // The wipe is not what this checks: reduced motion makes every choice swap at once.
    await withMotion("reduce", async () => {
      update.mockClear();
      swap.mockClear();

      await step("one tab stop: Tab enters on the checked radio and the next Tab leaves the group", async () => {
        await userEvent.tab();
        expect(light).toHaveFocus();
        await userEvent.tab();
        expect(after).toHaveFocus();
        await userEvent.tab({ shift: true });
        expect(light).toHaveFocus();
      });

      await step("ArrowRight moves focus and the choice, and wraps at the end", async () => {
        await userEvent.keyboard("{ArrowRight}");
        expect(dark).toHaveFocus();
        expect(dark).toHaveAttribute("aria-checked", "true");
        expect(light).toHaveAttribute("aria-checked", "false");
        expect(update).toHaveBeenCalledTimes(1);
        expect(update).toHaveBeenLastCalledWith("dark");
        stops(-1, 0, -1);

        await userEvent.keyboard("{ArrowRight}");
        expect(system).toHaveFocus();
        expect(system).toHaveAttribute("aria-checked", "true");
        stops(-1, -1, 0);

        await userEvent.keyboard("{ArrowRight}");
        expect(light).toHaveFocus();
        expect(light).toHaveAttribute("aria-checked", "true");
        stops(0, -1, -1);
      });

      await step("ArrowLeft wraps at the start; ArrowDown is ArrowRight and ArrowUp is ArrowLeft", async () => {
        await userEvent.keyboard("{ArrowLeft}");
        expect(system).toHaveFocus();
        expect(system).toHaveAttribute("aria-checked", "true");

        await userEvent.keyboard("{ArrowLeft}");
        expect(dark).toHaveFocus();
        expect(dark).toHaveAttribute("aria-checked", "true");

        await userEvent.keyboard("{ArrowDown}");
        expect(system).toHaveFocus();
        expect(system).toHaveAttribute("aria-checked", "true");

        await userEvent.keyboard("{ArrowUp}");
        expect(dark).toHaveFocus();
        expect(dark).toHaveAttribute("aria-checked", "true");
      });

      await step("each arrow press chose once, and swapped with the resolved theme", () => {
        expect(calls(update)).toEqual([
          "dark",
          "system",
          "light",
          "system",
          "dark",
          "system",
          "dark",
        ]);
        // Match system resolves to the dark `systemTheme`.
        expect(calls(swap)).toEqual([
          "dark",
          "dark",
          "light",
          "dark",
          "dark",
          "dark",
          "dark",
        ]);
      });

      await step("the checked radio does nothing: Space, Enter and a click choose nothing", async () => {
        expect(dark).toHaveFocus();
        const before = update.mock.calls.length;
        const swaps = swap.mock.calls.length;
        await userEvent.keyboard(" ");
        await userEvent.keyboard("{Enter}");
        await userEvent.click(dark!);
        expect(update.mock.calls).toHaveLength(before);
        expect(swap.mock.calls).toHaveLength(swaps);
      });
    });

    reset?.();
    await frames();
    (document.activeElement as HTMLElement | null)?.blur();
  },
};

type Stage = "light" | "dark" | undefined;

export const Choosing: Story = {
  render: (args) => {
    const value = ref<ThemePreference>("light");
    // Undefined draws no attribute: the stage inherits the toolbar's theme, so the rest picture is right in every
    // variant. The story only ever writes its own stage; `<html data-theme>` belongs to the toolbar's decorator.
    const stage = ref<Stage>(undefined);
    const shown = ref(true);
    reset = () => {
      value.value = "light";
      stage.value = undefined;
      shown.value = true;
    };
    unmount = () => {
      shown.value = false;
    };
    setModel = (next) => {
      value.value = next;
    };
    return () => page("Theme switch choosing", h("div", {
      "data-stage": "",
      "data-theme": stage.value,
      "style": "display:flex;padding:24px;background:var(--color-page);border:2px solid var(--color-border);"
        + "border-radius:var(--radius-xl)",
    }, [
      h("div", {
        style: "display:flex;align-items:center;gap:16px;padding:16px;background:var(--color-surface);"
          + "border-radius:var(--radius-xl)",
      }, [
        shown.value
          ? h(UiThemeSwitch, {
              "modelValue": value.value,
              "systemTheme": SYSTEM,
              "swap": (theme: "light" | "dark") => {
                stage.value = theme;
                spies(args).swap(theme);
              },
              "onUpdate:modelValue": (next: ThemePreference) => {
                value.value = next;
                spies(args)["onUpdate:modelValue"](next);
              },
            })
          : null,
        h("span", {
          "data-swatch": "",
          "aria-hidden": "true",
          "style": "width:32px;height:32px;border-radius:var(--radius-round);background:var(--color-page);"
            + "border:2px solid var(--color-border)",
        }),
        h("div", {
          innerHTML: chip(stage.value ?? "inherited"),
        }),
      ]),
    ]));
  },
  async play({ canvasElement, args, step }) {
    const { "onUpdate:modelValue": update, swap } = spies(args);
    const [light, dark, system] = await Promise.all(NAMES.map(name => radio(canvasElement, name)));
    const stageEl = canvasElement.querySelector<HTMLElement>("[data-stage]")!;
    const stageTheme = () => stageEl.dataset.theme;
    const html = () => document.documentElement.dataset.theme;
    const clear = () => {
      update.mockClear();
      swap.mockClear();
    };

    // The page colour of a theme, read the way the component reads it: from a probe that sets `data-theme` on itself.
    function pageColor(theme: "light" | "dark") {
      const probe = document.createElement("span");
      probe.dataset.theme = theme;
      probe.style.cssText = "position:absolute;visibility:hidden;background-color:var(--color-page)";
      canvasElement.appendChild(probe);
      const color = getComputedStyle(probe).backgroundColor;
      probe.remove();
      return color;
    }

    const centre = (el: HTMLElement) => {
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    };

    /** The one circle of a running wipe: its colour and its centre, from the style the engine wrote. */
    function circle() {
      const el = layerEl().children[0] as HTMLElement;
      return {
        background: el.style.background,
        x: Number.parseFloat(el.style.left) + Number.parseFloat(el.style.width) / 2,
        y: Number.parseFloat(el.style.top) + Number.parseFloat(el.style.height) / 2,
      };
    }

    function expectWipe(theme: "light" | "dark", from: HTMLElement) {
      expect(particleCount()).toBe(1);
      const c = circle();
      expect(c.background).toBe(pageColor(theme));
      const at = centre(from);
      expect(Math.abs(c.x - at.x)).toBeLessThan(1);
      expect(Math.abs(c.y - at.y)).toBeLessThan(1);
    }

    // Reduced first: a finished full-motion animation stays in the document and would fail the quiet check.
    await step("reduced: the choice and the swap are at once, no animation, an empty layer", async () => {
      clear();
      await expectQuietAfter(async () => {
        await userEvent.click(dark!);
        expect(update).toHaveBeenCalledWith("dark");
        expect(swap).toHaveBeenCalledWith("dark");
        expect(stageTheme()).toBe("dark");
      });
      expect(animations()).toHaveLength(0);
      expect(particleCount()).toBe(0);
      reset?.();
      await frames();
    });

    await step("full motion: Dark wipes from its radio in the dark page colour, then the stage swaps", () =>
      withMotion("full", async () => {
        clear();
        const before = html();
        await userEvent.click(dark!);
        expect(update).toHaveBeenCalledTimes(1);
        expect(update).toHaveBeenLastCalledWith("dark");
        expect(swap).not.toHaveBeenCalled();
        await waitFor(() => expect(particleCount()).toBe(1));
        expectWipe("dark", dark!);

        await waitFor(() => expect(swap).toHaveBeenCalledWith("dark"), { timeout: 4000 });
        expect(stageTheme()).toBe("dark");
        await waitFor(() => expect(particleCount()).toBe(0), { timeout: 4000 });
        expect(html()).toBe(before);
      }));

    await step("full motion: ArrowLeft from Dark chooses Light and wipes from it in the light page colour", () =>
      withMotion("full", async () => {
        clear();
        const before = html();
        dark!.focus();
        await userEvent.keyboard("{ArrowLeft}");
        expect(update).toHaveBeenCalledTimes(1);
        expect(update).toHaveBeenLastCalledWith("light");
        await waitFor(() => expect(particleCount()).toBe(1));
        expectWipe("light", light!);

        await waitFor(() => expect(swap).toHaveBeenCalledWith("light"), { timeout: 4000 });
        expect(stageTheme()).toBe("light");
        await waitFor(() => expect(particleCount()).toBe(0), { timeout: 4000 });
        expect(html()).toBe(before);
      }));

    await step("full motion: Match system resolves to the dark systemTheme and wipes dark", () =>
      withMotion("full", async () => {
        clear();
        await userEvent.click(system!);
        expect(update).toHaveBeenLastCalledWith("system");
        await waitFor(() => expect(particleCount()).toBe(1));
        expectWipe("dark", system!);

        await waitFor(() => expect(swap).toHaveBeenCalledWith("dark"), { timeout: 4000 });
        expect(stageTheme()).toBe("dark");
        await waitFor(() => expect(particleCount()).toBe(0), { timeout: 4000 });
      }));

    await step("full motion: the same resolved theme swaps at once and draws no wipe", () =>
      withMotion("full", async () => {
        // Match system on a dark page, set through the story's own state, not by a click.
        setModel?.("system");
        await frames();
        clear();
        await userEvent.click(dark!);
        expect(update).toHaveBeenCalledTimes(1);
        expect(update).toHaveBeenLastCalledWith("dark");
        expect(swap).toHaveBeenCalledTimes(1);
        expect(swap).toHaveBeenLastCalledWith("dark");
        for (let i = 0; i < 3; i++) {
          await frames();
          expect(particleCount()).toBe(0);
        }
      }));

    await step("full motion: the checked radio does nothing", () =>
      withMotion("full", async () => {
        clear();
        await userEvent.click(dark!);
        await frames(3);
        expect(update).not.toHaveBeenCalled();
        expect(swap).not.toHaveBeenCalled();
        expect(animations()).toHaveLength(0);
        expect(particleCount()).toBe(0);
      }));

    await step("the swap still lands when the switch is unmounted while the wipe runs", () =>
      withMotion("full", async () => {
        reset?.();
        await frames();
        clear();
        await userEvent.click(dark!);
        await waitFor(() => expect(particleCount()).toBe(1));
        // R3's popover closes on choose: the engine outlives the component, so the swap is a prop, not an event.
        unmount?.();
        await waitFor(() => expect(within(canvasElement).queryByRole("radiogroup")).toBeNull());
        expect(swap).not.toHaveBeenCalled();
        await waitFor(() => expect(swap).toHaveBeenCalledTimes(1), { timeout: 4000 });
        expect(swap).toHaveBeenLastCalledWith("dark");
        await waitFor(() => expect(particleCount()).toBe(0), { timeout: 4000 });
      }));

    reset?.();
    await frames();
    (document.activeElement as HTMLElement | null)?.blur();
  },
};
