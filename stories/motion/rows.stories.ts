import type { Meta, StoryObj } from "@storybook/vue3-vite";
import type { VNode } from "vue";
import { expect, waitFor, within } from "storybook/test";
import { defineComponent, h, nextTick, onBeforeUnmount, ref } from "vue";
import { resolved } from "../support/html";
import { expectQuietWhenReduced } from "../support/motion-checks";
import { block, page, readout, reset, section } from "../support/motion-kit";
import { animations, clickReplay, withMotion } from "../support/motion-play";
import { useMotionStory, withMotionSurface } from "../support/motion-surface";

// A list of rows that changes (R13 to R18, #305): a row added, deleted, cloned, pinned, won and un-won. Every change
// goes the way the product's does, FLIP: the rows' places are captured BEFORE the state changes, the state changes,
// the DOM settles, and then the recipes play. A Replay first puts the list back silently, with no recipe.

const START = ["a", "b", "c"];

/** One list of rows and what a section needs of it. */
function rowList(decorate?: (key: string) => VNode | null) {
  const rows = ref<string[]>([...START]);
  const list = ref<HTMLElement | null>(null);
  const els = (): [string, HTMLElement][] => [
    ...(list.value?.children ?? []),
  ].map(el => [(el as HTMLElement).dataset.key!, el as HTMLElement]);
  const el = (key: string) => els().find(([k]) => k === key)?.[1];
  const mid = (key: string) => el(key)?.querySelector<HTMLElement>("[data-mid]");
  const vnode = () => h("div", { ref: list, style: "max-width:100%" }, rows.value.map(key => h("div", {
    "key": key,
    "data-key": key,
    "style": "display:block;position:relative;width:280px;max-width:100%;margin-bottom:8px",
  }, [
    block({
      w: 280,
      h: 44,
      attrs: { "data-mid": "" },
      style: "max-width:100%",
    }),
    decorate?.(key) ?? null,
  ])));
  /** Back to the start list, silently: no recipe, and nothing a forwards fill left behind. */
  async function restore() {
    reset(...els().map(([, e]) => e));
    rows.value = [...START];
    await nextTick();
    reset(...els().map(([, e]) => e));
  }
  return { rows, els, el, mid, vnode, restore };
}

const Rows = defineComponent({
  name: "RowsStory",
  setup() {
    const { m } = useMotionStory();
    const tape = ref<HTMLElement | null>(null);
    // The tape rests at -10 degrees and .92: the engine's `tape` ends there. `reset` clears an inline opacity, so the
    // resting value is put back after it.
    const restTape = () => {
      if (tape.value)
        tape.value.style.opacity = "0.92";
    };
    const lists = {
      add: rowList(),
      delete: rowList(),
      clone: rowList(),
      pin: rowList(key => key === "c"
        ? block({
            ref: tape,
            w: 36,
            h: 16,
            tone: "gold",
            attrs: { "data-tape": "" },
            style: "position:absolute;top:-8px;left:12px;transform:rotate(-10deg);opacity:.92",
          })
        : null),
      won: rowList(),
      unwon: rowList(),
    };

    // A Replay supersedes the one before it, and an unmounted story stops: the delete waits for its exit.
    const runs: Record<keyof typeof lists, number> = {
      add: 0,
      delete: 0,
      clone: 0,
      pin: 0,
      won: 0,
      unwon: 0,
    };
    onBeforeUnmount(() => {
      for (const id of Object.keys(runs) as (keyof typeof runs)[])
        runs[id]++;
    });

    /** The common frame: put the list back, capture, change, let the DOM settle, and hand over what the recipes need. */
    async function change(id: keyof typeof lists, next: (rows: string[]) => string[], play: (prev: Map<string, DOMRect>) => void) {
      const mine = ++runs[id];
      const list = lists[id];
      await list.restore();
      if (id === "pin")
        restTape();
      if (mine !== runs[id])
        return;
      const prev = m.capture(list.els());
      list.rows.value = next(list.rows.value);
      await nextTick();
      play(prev);
    }

    const add = () => change("add", rows => ["n", ...rows], (prev) => {
      m.enterRow(lists.add.el("n"));
      m.flip(prev, lists.add.els());
    });
    async function del() {
      const mine = ++runs.delete;
      const list = lists.delete;
      await list.restore();
      if (mine !== runs.delete)
        return;
      await m.exitRow(list.el("b"));
      if (mine !== runs.delete)
        return;
      // Captured after the exit, so the rows below close up from where they stand.
      const prev = m.capture(list.els());
      list.rows.value = list.rows.value.filter(k => k !== "b");
      await nextTick();
      m.flip(prev, list.els());
    }
    const clone = () => change("clone", () => ["a", "b", "b2", "c"], (prev) => {
      const list = lists.clone;
      const b = list.el("b");
      const b2 = list.el("b2");
      m.jelly("resp", list.mid("b"), 0.5);
      // A new row is not in `prev`, so `flip` would skip it: the clone recipe is called by hand.
      if (b && b2)
        m.clone(b2, b2.getBoundingClientRect().top - b.getBoundingClientRect().top);
      m.flip(prev, list.els());
    });
    const pin = () => change("pin", rows => [
      "c",
      ...rows.filter(k => k !== "c"),
    ], (prev) => {
      m.flip(prev, lists.pin.els(), 1, (k, el, dy) => k === "c" && Math.abs(dy) > 1
        ? (m.arc(el, dy), true)
        : false);
      m.tape(tape.value);
    });
    const won = () => change("won", rows => [
      ...rows.filter(k => k !== "a"),
      "a",
    ], (prev) => {
      m.flip(prev, lists.won.els(), 1, (k, el, dy) => {
        if (k !== "a" || Math.abs(dy) <= 1)
          return false;
        m.arc(el, dy, () => m.land(el.querySelector<HTMLElement>("[data-mid]")));
        return true;
      });
    });
    const unwon = () => change("unwon", rows => [
      "c",
      ...rows.filter(k => k !== "c"),
    ], (prev) => {
      m.flip(prev, lists.unwon.els());
    });

    return () => page("Rows", {
      replay: async () => {
        await Promise.all([
          add(),
          del(),
          clone(),
          pin(),
          won(),
          unwon(),
        ]);
      },
    }, [
      section({
        id: "add",
        title: "Add",
        moment: "R13",
        replay: add,
      }, [
        lists.add.vnode(),
        readout("dialect", () => document.body.dataset.dialect ?? "workspace"),
        readout("gain", () => resolved("--motion-gain")),
      ]),
      section({
        id: "delete",
        title: "Delete",
        moment: "R14",
        replay: del,
      }, [
        lists.delete.vnode(),
      ]),
      section({
        id: "clone",
        title: "Clone",
        moment: "R15",
        replay: clone,
      }, [
        lists.clone.vnode(),
      ]),
      section({
        id: "pin",
        title: "Pin",
        moment: "R16",
        replay: pin,
      }, [
        lists.pin.vnode(),
      ]),
      section({
        id: "won",
        title: "Won",
        moment: "R17",
        replay: won,
      }, [
        lists.won.vnode(),
      ]),
      section({
        id: "unwon",
        title: "Un-won",
        moment: "R18",
        replay: unwon,
      }, [
        lists.unwon.vnode(),
      ]),
    ]);
  },
});

const meta = {
  title: "Motion/Rows",
  decorators: [withMotionSurface],
  parameters: { motion: {} },
  render: () => Rows,
} satisfies Meta;

export default meta;

export const Default: StoryObj<typeof meta> = {
  async play({ canvasElement, step }) {
    // The story mounts one tick after the surface has read its tokens, so the first element has to be waited for.
    await within(canvasElement).findByRole("button", { name: "Replay" });
    const keys = (id: string) => [
      ...canvasElement.querySelectorAll<HTMLElement>(`[data-section="${id}"] [data-key]`),
    ].map(el => el.dataset.key);

    await step("each change ends in its order, with every row at rest", () => withMotion("full", async () => {
      const expected: [string, string[]][] = [
        [
          "add",
          ["n", "a", "b", "c"],
        ],
        [
          "delete",
          ["a", "c"],
        ],
        [
          "clone",
          ["a", "b", "b2", "c"],
        ],
        [
          "pin",
          ["c", "a", "b"],
        ],
        [
          "won",
          ["b", "c", "a"],
        ],
        [
          "unwon",
          ["c", "a", "b"],
        ],
      ];
      for (const [id, order] of expected) {
        await clickReplay(canvasElement, id);
        await waitFor(() => expect(animations().length).toBeGreaterThan(0), { timeout: 3000 });
        await waitFor(() => expect(animations()).toHaveLength(0), { timeout: 5000 });
        expect(keys(id)).toEqual(order);
        for (const row of canvasElement.querySelectorAll<HTMLElement>(`[data-section="${id}"] [data-key]`)) {
          expect(getComputedStyle(row).opacity).toBe("1");
          expect(getComputedStyle(row).transform).toBe("none");
        }
      }
    }));

    await step("a replay puts every list back to its start", () => withMotion("full", async () => {
      for (let run = 0; run < 2; run++) {
        await clickReplay(canvasElement, "add");
        await waitFor(() => expect(animations().length).toBeGreaterThan(0), { timeout: 3000 });
        await waitFor(() => expect(animations()).toHaveLength(0), { timeout: 5000 });
      }
      expect(keys("add")).toEqual(["n", "a", "b", "c"]);
    }));

    await step("a replay creates no animation when reduced", () => expectQuietWhenReduced(canvasElement));
  },
};
