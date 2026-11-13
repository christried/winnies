import type { Meta, StoryObj } from "@storybook/vue3-vite";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import { computed, defineComponent, h, nextTick, reactive, ref } from "vue";
import UiWinToggle from "../../app/components/ui/win-toggle.vue";
import { materialIconBody } from "../../app/utils/material-icons";
import { playUnwon, playWon } from "../../app/utils/win-motion";
import { expectQuietAfter, finish, parkPointer, settled } from "../support/component-checks";
import { chip, headingCss } from "../support/html";
import { animations, frames, particleCount, withDialect, withMotion } from "../support/motion-play";
import { useMotionStory, withMotionSurface } from "../support/motion-surface";

// The app's own UiWinToggle (#317): the handoff's win toggle (03-components.md, `win-toggle`; `.w-win` in the reference CSS and
// the win-timer card, where the prototypes win). No screen uses it yet; R3's rows compose it. The word on it is the
// component's own copy; the names of the games and the headings are story strings.

const NOT_WON = "Mark Won";
const WON = "Won · undo";

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

type Props = Record<string, unknown>;

/** Not Won and Won side by side, each on its own panel; `extra` is the state a story forces. */
function pair(args: Spied, extra: Props = {}) {
  return [
    labelled("won false", h(UiWinToggle, {
      won: false,
      onToggle: args.onToggle,
      ...extra,
    })),
    labelled("won true", h(UiWinToggle, {
      won: true,
      onToggle: args.onToggle,
      ...extra,
    })),
  ];
}

const meta = {
  title: "UI/Win toggle",
  decorators: [withMotionSurface],
  args: {
    onToggle: fn(),
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

interface Spied { onToggle: ReturnType<typeof fn> }
const spied = (args: unknown) => args as Spied;

const findToggle = (canvasElement: HTMLElement, name: string) => within(canvasElement).findByRole("switch", { name });

/** The markup an svg holds, as the browser serialises it: the shipped cut is read back through a probe the same way. */
const innerOf = (svg: Element) => svg.innerHTML;
function cutMarkup(cut: "w600" | "w700-fill") {
  const probe = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  probe.innerHTML = materialIconBody("check", cut);
  return innerOf(probe);
}

export const NotWon: Story = {
  render: args => () => page("Win toggle not won", labelled("won false", h(UiWinToggle, {
    won: false,
    onToggle: spied(args).onToggle,
  }))),
  async play({ canvasElement, args }) {
    const spy = spied(args).onToggle;
    spy.mockClear();
    const el = await findToggle(canvasElement, NOT_WON);
    expect(el).toHaveAttribute("aria-checked", "false");

    await expectQuietAfter(async () => {
      await userEvent.click(el);
    });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenLastCalledWith(true);
    // The component holds no state of its own, and the animation is the row's: the parent did not change the prop and the
    // click started nothing, in full motion either.
    expect(el).toHaveAttribute("aria-checked", "false");
    expect(el).toHaveAccessibleName(NOT_WON);
    await withMotion("full", async () => {
      await userEvent.click(el);
      await frames(3);
      expect(animations()).toHaveLength(0);
    });
    spy.mockClear();

    // The click left the focus on the toggle, so Space is a key press on it.
    await userEvent.keyboard(" ");
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenLastCalledWith(true);
    expect(el).toHaveAttribute("aria-checked", "false");
    expect(el).toHaveAccessibleName(NOT_WON);

    // The check is the outline cut, and the icon is decorative: the name is the word alone.
    expect(innerOf(el.querySelector("svg")!)).toBe(cutMarkup("w600"));
    await parkPointer();
    await finish(canvasElement);
  },
};

export const Won: Story = {
  render: args => () => page("Win toggle won", labelled("won true", h(UiWinToggle, {
    won: true,
    onToggle: spied(args).onToggle,
  }))),
  async play({ canvasElement, args }) {
    const spy = spied(args).onToggle;
    spy.mockClear();
    const el = await findToggle(canvasElement, WON);
    expect(el).toHaveAttribute("aria-checked", "true");

    await userEvent.click(el);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenLastCalledWith(false);
    expect(el).toHaveAttribute("aria-checked", "true");
    expect(el).toHaveAccessibleName(WON);

    el.focus();
    await userEvent.keyboard(" ");
    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy).toHaveBeenLastCalledWith(false);

    // Won and not Won differ by shape as well as colour: the filled cut of the check.
    expect(innerOf(el.querySelector("svg")!)).toBe(cutMarkup("w700-fill"));
    expect(cutMarkup("w700-fill")).not.toBe(cutMarkup("w600"));
    await parkPointer();
    await finish(canvasElement);
  },
};

export const Hover: Story = {
  render: args => () => page("Win toggle hover", ...pair(spied(args), { class: "is-hover" })),
  async play({ canvasElement }) {
    const open = await findToggle(canvasElement, NOT_WON);
    const won = await findToggle(canvasElement, WON);

    // The colour a hovered Open toggle takes, read from a probe: the token's own value, not a copy of it.
    const probe = document.createElement("span");
    probe.style.color = "var(--color-won-text)";
    canvasElement.append(probe);
    const wonText = getComputedStyle(probe).color;
    const onAccent = (() => {
      probe.style.color = "var(--color-on-accent)";
      return getComputedStyle(probe).color;
    })();
    probe.remove();

    // Reduced first: the token is zero, so there is no lift, and `--dur-hover` is zero, so the change to it starts no
    // transition.
    await withMotion("reduce", async () => {
      await settled();
      expect(getComputedStyle(open).translate).toBe("0px");
      expect(animations()).toHaveLength(0);
    });

    await withMotion("full", async () => {
      // Workspace: the lift is half of `--hover-lift`, -2px (R01).
      await withDialect(null, async () => {
        await settled();
        for (const el of [open, won]) {
          expect(getComputedStyle(el).translate).toBe("0px -2px");
          expect(getComputedStyle(el).rotate).toBe("none");
        }
        // An Open toggle hints at what a press does; a Won one only lifts.
        expect(getComputedStyle(open).color).toBe(wonText);
        expect(getComputedStyle(won).color).toBe(onAccent);
        // The lip grows as far as the disc rises: 5px and 2px more.
        expect(getComputedStyle(open).boxShadow).toMatch(/ 0px 7px 0px -1px$/);
        expect(getComputedStyle(won).boxShadow).toMatch(/ 0px 7px 0px -1px$/);
      });

      // Broadcast sets `--hover-lift: 0` (the token): no lift, and no code for it.
      await withDialect("broadcast", async () => {
        await settled();
        expect(getComputedStyle(open).translate).toBe("0px");
      });

      await withDialect("showcase", async () => {
        await settled();
        for (const el of [open, won]) {
          expect(getComputedStyle(el).translate).toBe("0px -4px");
          expect(getComputedStyle(el).rotate).toBe("-1deg");
        }
      });
    });
    await parkPointer();
    await finish(canvasElement);
  },
};

export const Active: Story = {
  render: args => () => page("Win toggle active", ...pair(spied(args), { class: "is-active" })),
  async play({ canvasElement }) {
    const open = await findToggle(canvasElement, NOT_WON);
    const won = await findToggle(canvasElement, WON);
    await withDialect(null, async () => {
      await settled();
      for (const el of [open, won]) {
        // The press collapses the lip: it moves down by the lip less 1px (R02), 4px.
        expect(getComputedStyle(el).translate).toBe("0px 4px");
        expect(getComputedStyle(el).boxShadow).toMatch(/ 0px 1px 0px -1px$/);
      }
    });
    await parkPointer();
    await finish(canvasElement);
  },
};

export const Focus: Story = {
  // Both rings are forced, so the picture does not depend on where the real focus sits when it is taken; the play checks
  // the real one.
  render: args => () => page("Win toggle focus", ...pair(spied(args), { class: "is-focus" })),
  async play({ canvasElement }) {
    const open = await findToggle(canvasElement, NOT_WON);
    const won = await findToggle(canvasElement, WON);
    for (const el of [open, won]) {
      expect(getComputedStyle(el).outlineStyle).toBe("solid");
      expect(getComputedStyle(el).outlineWidth).not.toBe("0px");
    }

    // Tab, so the focus is keyboard-driven and `:focus-visible` matches.
    await userEvent.tab();
    expect(open).toHaveFocus();
    expect(open.matches(":focus-visible")).toBe(true);
    // R32: the ring appears at once and never animates.
    await frames(2);
    expect(animations()).toHaveLength(0);
    const ring = getComputedStyle(open);
    expect(ring.outlineStyle).toBe("solid");
    expect(ring.outlineWidth).not.toBe("0px");
    expect(ring.transitionProperty).not.toMatch(/outline|\ball\b/);
    await parkPointer();
    await finish(canvasElement);
  },
};

export const Disabled: Story = {
  render: args => () => page("Win toggle disabled", ...pair(spied(args), { disabled: true, class: "is-hover" })),
  async play({ canvasElement, args }) {
    const spy = spied(args).onToggle;
    spy.mockClear();
    const open = await findToggle(canvasElement, NOT_WON);
    const won = await findToggle(canvasElement, WON);
    for (const el of [open, won]) {
      expect(el).toBeDisabled();
      expect(getComputedStyle(el).opacity).toBe("0.45");
      expect(getComputedStyle(el).cursor).toBe("not-allowed");
      // No lift, though the story says it is hovered.
      expect(getComputedStyle(el).translate).toBe("none");
      await userEvent.click(el);
    }
    await userEvent.keyboard(" ");
    await userEvent.tab();
    expect([open, won].includes(document.activeElement as HTMLElement)).toBe(false);
    expect(spy).not.toHaveBeenCalled();
    await parkPointer();
    await finish(canvasElement);
  },
};

export const Busy: Story = {
  render: args => () => page("Win toggle busy", ...pair(spied(args), { busy: true })),
  async play({ canvasElement, args }) {
    const spy = spied(args).onToggle;
    spy.mockClear();
    const toggles = [await findToggle(canvasElement, NOT_WON), await findToggle(canvasElement, WON)];

    // Reduced first: the end state is the still icon, and nothing is started.
    await expectQuietAfter(async () => {
      for (const el of toggles)
        expect(el.querySelector("svg")).not.toBeNull();
    });

    for (const el of toggles) {
      expect(el).toHaveAttribute("aria-busy", "true");
      // A busy toggle stays focusable: it is not `disabled`.
      expect(el).not.toBeDisabled();
      expect(getComputedStyle(el).cursor).toBe("progress");
      expect(getComputedStyle(el).translate).toBe("none");
      el.focus();
      expect(el).toHaveFocus();
      await userEvent.click(el);
      await userEvent.keyboard("{Enter}");
      await userEvent.keyboard(" ");
    }
    expect(spy).not.toHaveBeenCalled();
    // Busy keeps the state's name and shape: the spinner replaces only the check.
    expect(toggles[0]).toHaveAttribute("aria-checked", "false");
    expect(toggles[1]).toHaveAttribute("aria-checked", "true");

    await withMotion("full", async () => {
      // R35: the spinner turns on the engine's `spin` loop, one animation on each icon.
      for (const el of toggles) {
        const svg = el.querySelector("svg")!;
        await waitFor(() => expect(svg.getAnimations().filter(a => a.playState === "running")).toHaveLength(1));
        expect(svg.getAnimations()).toHaveLength(1);
      }
    });
    await parkPointer();
    await finish(canvasElement);
  },
};

// A stand-in for R3's `challenge-row`, which R2 does not have: the three parts the Won recipes move (the mid panel, the face
// disc and the Won sticker), the list they travel in, and the toggle. It is R3's contract in miniature: on `toggle` the row
// runs `playWon` or `playUnwon` with its own elements and sets `won` only in `commit`. Nini, the progress bar, C02, drag and
// the rest of the row are not here.
interface PlaceholderRow { id: string; name: string; won: boolean }

const PlaceholderList = defineComponent({
  name: "WinToggleRowList",
  props: {
    onToggle: { type: Function, default: undefined },
  },
  setup(props) {
    const { m } = useMotionStory();
    const rows = reactive<PlaceholderRow[]>([
      { id: "boss", name: "Boss Rush", won: false },
      { id: "dark", name: "Dark Souls", won: false },
      { id: "celeste", name: "Celeste", won: true },
    ]);
    // Open first, then Won, each in its original order.
    const sorted = computed(() => rows
      .map((row, index) => ({ row, index }))
      .sort((a, b) => Number(a.row.won) - Number(b.row.won) || a.index - b.index)
      .map(({ row }) => row));
    const list = ref<HTMLElement | null>(null);

    const liOf = (id: string) => list.value?.querySelector<HTMLElement>(`[data-key="${id}"]`) ?? null;
    const part = (id: string, name: string) => liOf(id)?.querySelector<HTMLElement>(`[data-${name}]`) ?? null;
    const rowEls = (): [string, HTMLElement][] =>
      [
        ...(list.value?.querySelectorAll<HTMLElement>("[data-row]") ?? []),
      ].map(el => [el.dataset.key!, el]);

    // A second press while one is running is ignored, as R3's row does; the toggle still emitted it.
    let pending = false;
    async function onToggle(row: PlaceholderRow, next: boolean) {
      (props.onToggle as ((next: boolean) => void) | undefined)?.(next);
      if (pending)
        return;
      pending = true;
      try {
        await (next
          ? playWon
          : playUnwon)(m, {
          key: row.id,
          rows: rowEls,
          mid: () => part(row.id, "mid"),
          face: () => part(row.id, "face"),
          sticker: () => part(row.id, "sticker"),
          commit: async () => {
            row.won = next;
            await nextTick();
          },
        });
      }
      finally {
        pending = false;
      }
    }

    return () => h("ul", {
      ref: list,
      style: "display:flex;flex-direction:column;gap:var(--row-gap);width:min(520px,100%);margin:0;padding:0;list-style:none",
    }, sorted.value.map(row => h("li", {
      "key": row.id,
      "data-row": "",
      "data-key": row.id,
    }, [
      h("div", {
        "data-mid": "",
        "style": "position:relative;display:flex;align-items:center;gap:14px;height:var(--row-h);"
          + "padding:var(--row-pad);border-radius:var(--row-radius);color:var(--color-text);"
          + `background:${row.won
            ? "var(--color-won-surface)"
            : "var(--color-surface)"}`,
      }, [
        h("div", {
          "data-face": "",
          "aria-hidden": "true",
          "style": "display:flex;flex:none;align-items:center;justify-content:center;border-radius:var(--radius-round);"
            + "width:var(--face-row);height:var(--face-row);font-family:var(--font-display);font-size:var(--text-xl);"
            + `color:var(--color-on-accent);background:${row.won
              ? "var(--color-won)"
              : "var(--color-ready)"}`,
        }, row.name[0]),
        h("span", {
          style: "flex:1;min-width:0;font-family:var(--font-display);font-size:var(--text-lg)",
        }, row.name),
        h(UiWinToggle, {
          won: row.won,
          onToggle: (next: boolean) => onToggle(row, next),
        }),
        // Static: no `v-loop`, so the picture is stable.
        row.won
          ? h("span", {
              "data-sticker": "",
              "aria-hidden": "true",
              "style": "position:absolute;top:-8px;left:-8px;display:flex;align-items:center;justify-content:center;"
                + "width:30px;height:30px;border-radius:var(--radius-round);background:var(--color-complete);"
                + "color:var(--color-on-accent);transform:rotate(12deg)",
            }, "★")
          : null,
      ]),
    ])));
  },
});

/** The animations whose target is `el`. */
const on = (el: Element | null) => animations().filter(a => (a.effect as KeyframeEffect | null)?.target === el);
const keyframes = (a: Animation) => (a.effect as KeyframeEffect).getKeyframes();
/** Whether an animation moves its target along y: a flip or an arc. */
const travels = (a: Animation) => keyframes(a).some(k => String(k.transform).includes("translateY"));
/** The arc has a tilt on its middle frame, which the plain flip never has. */
const tilts = (a: Animation) => keyframes(a).some(k => String(k.transform).includes("rotate("));

export const Row: Story = {
  render: args => () => page("Win toggle in a row", h(PlaceholderList, { onToggle: spied(args).onToggle })),
  async play({ canvasElement, args, step }) {
    const spy = spied(args).onToggle;
    spy.mockClear();
    const li = (id: string) => canvasElement.querySelector<HTMLElement>(`[data-key="${id}"]`)!;
    const mid = (id: string) => li(id).querySelector<HTMLElement>("[data-mid]")!;
    const face = (id: string) => li(id).querySelector<HTMLElement>("[data-face]")!;
    const sticker = (id: string) => li(id).querySelector<HTMLElement>("[data-sticker]");
    const toggle = (id: string) => within(li(id)).getByRole("switch");
    const order = () => [
      ...canvasElement.querySelectorAll<HTMLElement>("[data-row]"),
    ].map(el => el.dataset.key);
    await waitFor(() => expect(order()).toEqual(["boss", "dark", "celeste"]));

    // Reduced first: a finished full-motion animation stays in the document and would fail the quiet check.
    await step("reduced: Won at once, nothing animated", async () => {
      await expectQuietAfter(async () => {
        await userEvent.click(toggle("boss"));
        // A few milliseconds, not the 630 of the jelly.
        await waitFor(() => expect(toggle("boss")).toHaveAttribute("aria-checked", "true"), { timeout: 300 });
        expect(order()).toEqual(["dark", "boss", "celeste"]);
        expect(sticker("boss")).not.toBeNull();
        expect(spy).toHaveBeenLastCalledWith(true);
      });
      await expectQuietAfter(async () => {
        await userEvent.click(toggle("boss"));
        await waitFor(() => expect(toggle("boss")).toHaveAttribute("aria-checked", "false"), { timeout: 300 });
        expect(order()).toEqual(["boss", "dark", "celeste"]);
        expect(sticker("boss")).toBeNull();
        expect(spy).toHaveBeenLastCalledWith(false);
      });
    });

    await step("full: C01, the arc, the landing; R18 back", () => withMotion("full", () => withDialect(null, async () => {
      await userEvent.click(toggle("boss"));
      // The toggle asked; the row has not taken it yet, because C01 plays first.
      expect(toggle("boss")).toHaveAttribute("aria-checked", "false");
      let jelly!: Animation;
      await waitFor(() => {
        jelly = on(mid("boss"))[0]!;
        expect(jelly).toBeDefined();
      });
      await waitFor(() => expect(on(face("boss")).length).toBeGreaterThan(0));
      await waitFor(() => expect(particleCount()).toBeGreaterThan(0));

      await waitFor(() => expect(toggle("boss")).toHaveAttribute("aria-checked", "true"), { timeout: 4000 });
      expect(order()).toEqual(["dark", "boss", "celeste"]);
      // R17: the row travels (an arc: a translate with a tilt), then lands and slaps its sticker.
      let arc!: Animation;
      await waitFor(() => {
        arc = on(li("boss")).find(a => travels(a) && tilts(a))!;
        expect(arc).toBeDefined();
      }, { timeout: 4000 });
      // A new animation has no start time until its first frame.
      await Promise.all([jelly.ready, arc.ready]);
      expect(Number(jelly.startTime)).toBeLessThan(Number(arc.startTime));
      await waitFor(() => {
        expect(on(mid("boss")).some(a => Number(a.startTime) > Number(arc.startTime))).toBe(true);
        expect(on(sticker("boss"))).not.toHaveLength(0);
      }, { timeout: 4000 });

      // Every animation ends and the last particle falls: a particle lives up to 1.7 s.
      await waitFor(() => {
        expect(animations()).toHaveLength(0);
        expect(particleCount()).toBe(0);
      }, { timeout: 4000 });

      // R18: no C01 to wait for, no particle, no sticker, and one slide of the row.
      await userEvent.click(toggle("boss"));
      await waitFor(() => expect(toggle("boss")).toHaveAttribute("aria-checked", "false"), { timeout: 300 });
      expect(particleCount()).toBe(0);
      expect(sticker("boss")).toBeNull();
      expect(order()).toEqual(["boss", "dark", "celeste"]);
      await waitFor(() => {
        const slides = on(li("boss"));
        expect(slides).toHaveLength(1);
        expect(travels(slides[0]!)).toBe(true);
        expect(tilts(slides[0]!)).toBe(false);
      });
      await waitFor(() => expect(animations()).toHaveLength(0), { timeout: 4000 });

      // Dark Souls is the second Open row and stays where it is: the helper's guard sends it straight to the landing.
      await userEvent.click(toggle("dark"));
      await waitFor(() => expect(toggle("dark")).toHaveAttribute("aria-checked", "true"), { timeout: 4000 });
      expect(order()).toEqual(["boss", "dark", "celeste"]);
      await waitFor(() => expect(on(sticker("dark"))).not.toHaveLength(0));
      expect(on(li("dark"))).toHaveLength(0);
      expect(on(mid("dark")).length).toBeGreaterThan(0);
      await waitFor(() => {
        expect(animations()).toHaveLength(0);
        expect(particleCount()).toBe(0);
      }, { timeout: 4000 });

      // Back to Open, so the page ends as it began.
      await userEvent.click(toggle("dark"));
      await waitFor(() => expect(toggle("dark")).toHaveAttribute("aria-checked", "false"), { timeout: 300 });
      await waitFor(() => expect(animations()).toHaveLength(0), { timeout: 4000 });
    })));

    await step("full: a second press while one is running is ignored", () => withMotion("full", () => withDialect(null, async () => {
      spy.mockClear();
      await userEvent.click(toggle("boss"));
      await userEvent.click(toggle("boss"));
      // The toggle emitted both; the row started one C01.
      expect(spy).toHaveBeenCalledTimes(2);
      expect(on(mid("boss"))).toHaveLength(1);
      await waitFor(() => expect(toggle("boss")).toHaveAttribute("aria-checked", "true"), { timeout: 4000 });
      await waitFor(() => {
        expect(animations()).toHaveLength(0);
        expect(particleCount()).toBe(0);
      }, { timeout: 4000 });
      await userEvent.click(toggle("boss"));
      await waitFor(() => expect(toggle("boss")).toHaveAttribute("aria-checked", "false"), { timeout: 300 });
      await waitFor(() => expect(animations()).toHaveLength(0), { timeout: 4000 });
    })));

    expect(order()).toEqual(["boss", "dark", "celeste"]);
    await parkPointer();
    await finish(canvasElement);
  },
};
