import type { Meta, StoryObj } from "@storybook/vue3-vite";
import type { ToastKind } from "../../app/utils/toast-timer";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import { h, ref } from "vue";
import UiButton from "../../app/components/ui/button.vue";
import UiToastStack from "../../app/components/ui/toast-stack.vue";
import { expectQuietAfter, finish, parkPointer, settled } from "../support/component-checks";
import { headingCss } from "../support/html";
import { animations, frames, withMotion } from "../support/motion-play";
import { withMotionSurface } from "../support/motion-surface";

// The app's own UiToastStack (#315): the handoff's bottom-right stack (03-components.md, `toast-stack`). It plays R08 on a toast it
// adds and R09 plus the engine's FLIP on the rest when one leaves; the parent owns the list. The stack is `position: fixed`, so
// the page wraps it in a frame with a transform: that frame is its containing block, and the picture is the frame. Every
// string below is story copy, not product copy.

// What the stack's `toasts` prop holds (`Toast` of the `useToast` composable, which the stories cannot import: it needs the Nuxt globals).
interface Toast {
  id: string;
  message: string;
  kind: ToastKind;
  ttl?: number | null;
}

const FRAME_W = 520;
const FRAME_H = 460;
// `--space-4` and `--space-2-5`, in pixels, as the stack lays them out.
const INSET = 16;
const GAP = 10;

// Text sits on a surface panel, never straight on the dialect backdrop: axe cannot judge contrast over it.
function page(title: string, ...body: ReturnType<typeof h>[]) {
  return h("section", {
    "aria-label": title,
    "style": "display:flex;flex-direction:column;align-items:flex-start;gap:16px;padding:24px",
  }, [
    h("h1", { style: `${headingCss};font-size:var(--text-4xl)` }, title),
    ...body,
  ]);
}

function frame(...children: ReturnType<typeof h>[]) {
  return h("div", {
    "data-frame": "",
    "style": `position:relative;width:${FRAME_W}px;height:${FRAME_H}px;transform:translateZ(0);`
      + "background:var(--color-surface);border-radius:var(--radius-xl)",
  }, children);
}

const meta = {
  title: "UI/Toast stack",
  decorators: [withMotionSurface],
  args: {
    onDismiss: fn(),
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const THREE: Toast[] = [
  {
    id: "a",
    kind: "success",
    message: "Timer reset",
    ttl: null,
  },
  {
    id: "b",
    kind: "info",
    message: "Your Overlay updates live.",
    ttl: null,
  },
  {
    id: "c",
    kind: "error",
    message: "Couldn't copy the link",
    ttl: null,
  },
];

const frameOf = (canvasElement: HTMLElement) => canvasElement.querySelector<HTMLElement>("[data-frame]")!;
const stackOf = (canvasElement: HTMLElement) => canvasElement.querySelector<HTMLElement>("[data-toast-stack]")!;

/** The stack announces what it gets: a polite live region with a name. */
function expectLiveRegion(canvasElement: HTMLElement) {
  const stack = within(canvasElement).getByRole("region", { name: "Notifications" });
  expect(stack).toBe(stackOf(canvasElement));
  expect(stack).toHaveAttribute("aria-live", "polite");
}
function idsOf(canvasElement: HTMLElement) {
  return [
    ...canvasElement.querySelectorAll<HTMLElement>("[data-toast-id]"),
  ].map(el => el.dataset.toastId!);
}
const toastOf = (canvasElement: HTMLElement, id: string) => canvasElement.querySelector<HTMLElement>(`[data-toast-id="${id}"]`);

/**
 * Where the toasts sit in the frame: in this order from the top, each one `INSET` from the frame's right edge, the lowest
 * `INSET` above its bottom, and `GAP` between two.
 * @param canvasElement the story's canvas
 * @param ids the toasts, oldest first
 */
function expectLayout(canvasElement: HTMLElement, ids: string[]) {
  expect(idsOf(canvasElement)).toEqual(ids);
  const box = frameOf(canvasElement).getBoundingClientRect();
  const rects = ids.map(id => toastOf(canvasElement, id)!.getBoundingClientRect());
  for (const rect of rects)
    expect(Math.abs(rect.right - (box.right - INSET))).toBeLessThan(1);
  expect(Math.abs(rects.at(-1)!.bottom - (box.bottom - INSET))).toBeLessThan(1);
  rects.slice(1).forEach((rect, i) => expect(Math.abs(rect.top - rects[i]!.bottom - GAP)).toBeLessThan(1));
}

function dismissOf(canvasElement: HTMLElement, id: string) {
  return within(toastOf(canvasElement, id)!).getByRole("button", { name: "Dismiss" });
}

export const Three: Story = {
  render: args => () => page("Toast stack", frame(h(UiToastStack, {
    toasts: THREE,
    onDismiss: (args as unknown as { onDismiss: () => void }).onDismiss,
  }))),
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    await canvas.findAllByRole("status");
    // The dom order is the prop order, and the newest is the lowest.
    expectLayout(canvasElement, ["a", "b", "c"]);
    expect(canvas.getAllByRole("status")).toHaveLength(2);
    expect(canvas.getAllByRole("alert")).toHaveLength(1);
    // The stack is the live region, as the old one was: it is there before a toast, so a card that comes is announced.
    expectLiveRegion(canvasElement);
    // Nothing animated in at mount.
    expect(animations()).toHaveLength(0);

    await parkPointer();
    await finish(canvasElement);
  },
};

// The animations a toast carries, by the first or last keyframe the recipe gave them.
function transformsOf(el: HTMLElement) {
  return el.getAnimations().map(a =>
    (a.effect as KeyframeEffect).getKeyframes().map(k => String(k.transform ?? "")));
}
const enterOf = (el: HTMLElement) => transformsOf(el).find(t => t[0]!.startsWith("translateY(120%)"));
const leaveOf = (el: HTMLElement) => transformsOf(el).find(t => t.at(-1) === "translateX(30px)");
const shakeOf = (el: HTMLElement) => transformsOf(el).find(t => t.includes("translateX(-6px)"));
const slideOf = (el: HTMLElement) => transformsOf(el).find(t => /^translateY\(-?[\d.]+px\)$/.test(t[0]!));
const slideStart = (el: HTMLElement) => Number.parseFloat(slideOf(el)![0]!.slice("translateY(".length));

/** Waits until nothing that ends is still running: the enter's jelly starts when the enter ends, so one `settled` can miss it. */
async function calm() {
  for (let i = 0; i < 6; i++) {
    await settled();
    if (!animations().some(a => a.playState === "running" && a.effect?.getComputedTiming().iterations !== Infinity))
      return;
  }
}

function expectAtRest(canvasElement: HTMLElement) {
  for (const el of canvasElement.querySelectorAll<HTMLElement>("[data-toast-id]")) {
    expect(getComputedStyle(el).transform).toBe("none");
    expect(getComputedStyle(el).opacity).toBe("1");
  }
}

export const Dismiss: Story = {
  render: () => {
    const list = ref<Toast[]>(THREE.map(t => ({ ...t })));
    let counter = 0;
    const add = (kind: Toast["kind"], message: string, ttl: number | null = null) => () => {
      counter += 1;
      list.value.push({
        id: `n${counter}`,
        kind,
        message,
        ttl,
      });
    };
    return () => page(
      "Toast stack dismiss",
      h("div", { style: "display:flex;gap:8px" }, [
        h(UiButton, {
          onClick: add("success", "Saved"),
        }, () => "Add success"),
        h(UiButton, {
          onClick: add("error", "Couldn't save that"),
        }, () => "Add error"),
        h(UiButton, {
          onClick: add("info", "Gone in a moment", 600),
        }, () => "Add short-lived"),
      ]),
      frame(h(UiToastStack, {
        toasts: list.value,
        onDismiss: (id: string) => {
          list.value = list.value.filter(t => t.id !== id);
        },
      })),
    );
  },
  async play({ canvasElement, step }) {
    const canvas = within(canvasElement);
    await parkPointer();
    await canvas.findAllByRole("status");
    const press = (name: string) => userEvent.click(canvas.getByRole("button", { name }));
    const appeared = async (id: string) => {
      await waitFor(() => expect(toastOf(canvasElement, id)).not.toBeNull());
      return toastOf(canvasElement, id)!;
    };

    // Reduced first: a finished full-motion animation would stay in the document and fail the quiet check.
    await step("reduced: a toast goes and one comes at once, nothing animates", () => expectQuietAfter(async () => {
      await userEvent.click(dismissOf(canvasElement, "b"));
      await waitFor(() => expect(toastOf(canvasElement, "b")).toBeNull());
      await frames();
      expectLayout(canvasElement, ["a", "c"]);

      await press("Add success");
      expect(await appeared("n1")).toBeVisible();
      expectLayout(canvasElement, ["a", "c", "n1"]);

      await userEvent.click(dismissOf(canvasElement, "n1"));
      await waitFor(() => expect(toastOf(canvasElement, "n1")).toBeNull());
      await frames();
      expectLayout(canvasElement, ["a", "c"]);
    }));

    await withMotion("full", async () => {
      await step("an added toast plays R08, an error adds the R33 shake", async () => {
        await press("Add success");
        const success = await appeared("n2");
        await waitFor(() => expect(enterOf(success)).toBeDefined());
        await calm();

        await press("Add error");
        const error = await appeared("n3");
        await waitFor(() => expect(enterOf(error)).toBeDefined());
        await waitFor(() => expect(shakeOf(error)).toBeDefined(), { timeout: 2000 });
        await calm();
        expectLayout(canvasElement, ["a", "c", "n2", "n3"]);
      });

      await step("a toast that leaves plays R09, then the older ones slide down", async () => {
        await userEvent.click(dismissOf(canvasElement, "c"));
        // It asks, and the stack keeps it in the DOM while it leaves.
        expect(toastOf(canvasElement, "c")).not.toBeNull();
        await waitFor(() => expect(leaveOf(toastOf(canvasElement, "c")!)).toBeDefined());
        await waitFor(() => expect(toastOf(canvasElement, "c")).toBeNull(), { timeout: 3000 });

        // The one above it starts where it was and slides down; the ones below it have not moved.
        await waitFor(() => expect(slideOf(toastOf(canvasElement, "a")!)).toBeDefined());
        expect(Math.abs(slideStart(toastOf(canvasElement, "a")!))).toBeGreaterThan(1);
        expect(slideOf(toastOf(canvasElement, "n2")!)).toBeUndefined();
        expect(slideOf(toastOf(canvasElement, "n3")!)).toBeUndefined();

        await calm();
        expectAtRest(canvasElement);
        expectLayout(canvasElement, ["a", "n2", "n3"]);
      });

      await step("two dismissals in a row end in the same layout", async () => {
        await userEvent.click(dismissOf(canvasElement, "n3"));
        // The second goes before the first has left.
        expect(toastOf(canvasElement, "n3")).not.toBeNull();
        await userEvent.click(dismissOf(canvasElement, "n2"));
        await waitFor(() => expect(idsOf(canvasElement)).toEqual(["a"]), { timeout: 3000 });
        await calm();
        expectAtRest(canvasElement);
        expectLayout(canvasElement, ["a"]);
      });

      await step("a toast whose time is up removes itself and the stack closes up", async () => {
        await press("Add short-lived");
        await appeared("n4");
        await waitFor(() => expect(toastOf(canvasElement, "n4")).toBeNull(), { timeout: 3000 });
        await calm();
        expectAtRest(canvasElement);
        expectLayout(canvasElement, ["a"]);
      });

      await step("no toasts: the stack has no children and no height", async () => {
        await userEvent.click(dismissOf(canvasElement, "a"));
        await waitFor(() => expect(idsOf(canvasElement)).toEqual([]), { timeout: 3000 });
        await calm();
        expect(stackOf(canvasElement).children).toHaveLength(0);
        expect(stackOf(canvasElement).getBoundingClientRect().height).toBe(0);
        // Empty, it is still the live region: a toast that comes next is announced.
        expectLiveRegion(canvasElement);
      });

      // The picture shows a fixed list: a success and an error, both sticky.
      await press("Add success");
      await appeared("n5");
      await press("Add error");
      await appeared("n6");
      await calm();
      expectLayout(canvasElement, ["n5", "n6"]);
    });

    await parkPointer();
    await finish(canvasElement);
  },
};
