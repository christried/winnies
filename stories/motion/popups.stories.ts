import type { Meta, StoryObj } from "@storybook/vue3-vite";
import type { TransitionHooks } from "../../app/composables/use-motion-transition";
import { expect, waitFor, within } from "storybook/test";
import { defineComponent, h, nextTick, onBeforeUnmount, ref, Teleport, Transition, vShow, withDirectives } from "vue";
import { useMotionTransition } from "../../app/composables/use-motion-transition";
import { isPlainAnimation } from "../../app/utils/motion/surface";
import { resolved } from "../support/html";
import { expectQuietWhenReduced } from "../support/motion-checks";
import { block, page, readout, replayButton, reset, section, stage } from "../support/motion-kit";
import { clickReplay, frames, live, withMotion } from "../support/motion-play";
import { useMotionStory, withMotionSurface } from "../support/motion-surface";

// The popups (R04 to R10, #305): a menu, a modal, two toasts and a tooltip. The first three are a `<Transition
// :css="false">` driven by `useMotionTransition`, the way the app's components use it (#302), so the story is also the
// real-browser check of those hooks and of the quieting of #300. The tooltip has no leave recipe: it is a recipe call.
//
// Each section host carries what the hooks did, as data attributes the play function reads: `data-enters` and
// `data-leaves` count the Transition's after-enter and after-leave, `data-live-at-done` is how many plain animations
// were still running under the element when `onAfterEnter` fired, and `data-css-live-at-done` how many CSS transitions.

type Popup = "menu" | "modal" | "toast" | "tooltip";

const host = (id: Popup) => document.querySelector<HTMLElement>(`[data-section="${id}"]`);
const count = (id: Popup, name: "enters" | "leaves") => Number(host(id)?.dataset[name] ?? 0);
function zero(id: Popup) {
  const el = host(id);
  if (el) {
    el.dataset.enters = "0";
    el.dataset.leaves = "0";
  }
}
function bump(id: Popup, name: "enters" | "leaves") {
  const el = host(id);
  if (el)
    el.dataset[name] = String(count(id, name) + 1);
}
/** What was still going under the element when Vue called `onAfterEnter`: the hooks must not have been early. */
function recordAtEnd(id: Popup, el: Element) {
  const el0 = host(id);
  if (!el0)
    return;
  const all = el.getAnimations({ subtree: true });
  el0.dataset.liveAtDone = String(all.filter(a => isPlainAnimation(a) && (a.playState === "running" || a.playState === "paused")).length);
  el0.dataset.cssLiveAtDone = String(all.filter(a => a instanceof CSSTransition && a.playState === "running").length);
}

const Popups = defineComponent({
  name: "PopupsStory",
  setup() {
    const { m } = useMotionStory();
    const panel = ref<HTMLElement | null>(null);
    const tip = ref<HTMLElement | null>(null);
    const toastEl = ref<HTMLElement | null>(null);
    const errorEl = ref<HTMLElement | null>(null);
    const menuOpen = ref(false);
    const modalOpen = ref(false);
    const toastOpen = ref(false);

    const menuHooks = useMotionTransition({
      enter: (engine, el) => engine.menuIn(el),
      leave: (engine, el) => engine.menuOut(el),
    });
    const modalHooks = useMotionTransition({
      enter: (engine, el) => engine.modalIn(el.querySelector("[data-scrim]"), el.querySelector("[data-card]")),
      leave: (engine, el) => engine.modalOut(el.querySelector("[data-scrim]"), el.querySelector("[data-card]")),
    });
    const toastHooks = useMotionTransition({
      enter: (engine, el) => engine.toastIn(el),
      leave: (engine, el) => engine.toastOut(el),
    });
    const errorHooks = useMotionTransition({
      enter: (engine, el) => engine.toastIn(el, true),
      leave: (engine, el) => engine.toastOut(el),
    });
    // The modal's CSS transition, set after the recipe has started: a style change the browser has already seen, so it
    // is a transition and not the first style. It outlives the enter by design (see the probe's block below).
    const enterModal: TransitionHooks["onEnter"] = (el, done) => {
      modalHooks.onEnter(el, done);
      const probe = el.querySelector<HTMLElement>("[data-css-probe]");
      if (probe) {
        void getComputedStyle(probe).opacity;
        probe.style.opacity = "0.5";
      }
    };

    // A Replay supersedes the one before it, and an unmounted story stops: the holds below are timers.
    const runs: Record<Popup, number> = {
      menu: 0,
      modal: 0,
      toast: 0,
      tooltip: 0,
    };
    onBeforeUnmount(() => {
      for (const id of Object.keys(runs) as Popup[])
        runs[id]++;
    });
    /** Closes a popup that is still open, so the Replay starts from a closed one; the leave then ends or is cancelled. */
    async function close(flag: { value: boolean }) {
      if (flag.value) {
        flag.value = false;
        await nextTick();
      }
    }

    async function menu(interrupted = false) {
      const mine = ++runs.menu;
      zero("menu");
      await close(menuOpen);
      // The panel is not reset here: the hooks release a leave's held end state on the next enter, and that is what the
      // play function checks. The group's Replay resets it.
      menuOpen.value = true;
      if (interrupted) {
        await m.wait(m.T().D.toast + 100);
        if (mine !== runs.menu)
          return;
        menuOpen.value = false;
        await m.wait(60);
        if (mine !== runs.menu)
          return;
        menuOpen.value = true;
      }
      await m.wait(1400);
      if (mine !== runs.menu)
        return;
      menuOpen.value = false;
    }
    async function modal(interrupted = false) {
      const mine = ++runs.modal;
      zero("modal");
      await close(modalOpen);
      modalOpen.value = true;
      await m.wait(interrupted ? 100 : 1200);
      if (mine !== runs.modal)
        return;
      modalOpen.value = false;
    }
    async function toast() {
      const mine = ++runs.toast;
      zero("toast");
      await close(toastOpen);
      toastOpen.value = true;
      await m.wait(1000);
      if (mine !== runs.toast)
        return;
      toastOpen.value = false;
    }
    function tooltip() {
      zero("tooltip");
      reset(tip.value);
      m.tipIn(tip.value);
    }

    const after = (id: Popup) => ({
      onAfterEnter: (el: Element) => {
        bump(id, "enters");
        recordAtEnd(id, el);
      },
      onAfterLeave: () => bump(id, "leaves"),
    });

    const toastBlock = (r: typeof toastEl, error: boolean) => block({
      ref: r,
      w: 280,
      h: 48,
      tone: error ? "gold" : "won",
      attrs: {
        "data-toast": error ? "error" : "ok",
      },
      style: "margin:8px 10px",
    });

    // Built on every render: a vnode is not reused.
    const items = () => Array.from({ length: 4 }, (_, i) => block({
      w: 140,
      h: 24,
      tone: "muted",
      attrs: { "data-item": i },
    }));

    return () => page("Popups", {
      replay: async () => {
        reset(panel.value, tip.value, toastEl.value, errorEl.value);
        await Promise.all([
          menu(),
          modal(),
          toast(),
          tooltip(),
        ]);
      },
    }, [
      section({
        id: "menu",
        title: "Menu",
        moment: "R04 R05",
        replay: () => menu(),
      }, [
        h(Transition, {
          css: false,
          ...menuHooks,
          ...after("menu"),
        }, {
          default: () => withDirectives(block({
            ref: panel,
            w: 160,
            attrs: { "data-menu": "" },
            style: "height:auto;padding:6px;display:flex;flex-direction:column;gap:6px",
          }, items()), [
            [vShow, menuOpen.value],
          ]),
        }),
        h("div", { style: "display:flex;flex-direction:column;gap:8px" }, [
          replayButton({
            id: "menu-interrupted",
            label: "menu interrupted",
            onClick: () => menu(true),
          }),
          readout("dialect", () => document.body.dataset.dialect ?? "workspace"),
          readout("gain", () => resolved("--motion-gain")),
        ]),
      ]),
      section({
        id: "modal",
        title: "Modal",
        moment: "R06 R07",
        replay: () => modal(),
      }, [
        // Teleported to <body>, as the app's modals are: it is outside the surface's root, which is what #300's
        // document-wide cancel has to reach. So it is not a block of the story's own flow: it is fixed to the corner.
        h(Teleport, { to: "body" }, [
          h(Transition, {
            css: false,
            ...modalHooks,
            onEnter: enterModal,
            ...after("modal"),
          }, {
            default: () => modalOpen.value
              ? h("div", {
                  "data-modal": "",
                  "style": "position:fixed;right:16px;bottom:16px;width:min(320px,calc(100vw - 32px));height:200px;overflow:hidden;z-index:var(--z-modal)",
                }, [
                  block({
                    tone: "muted",
                    attrs: { "data-scrim": "" },
                    style: "position:absolute;inset:0;width:auto;height:auto",
                  }),
                  block({
                    attrs: { "data-card": "" },
                    style: "position:absolute;inset:24px;width:auto;height:auto",
                  }, [
                    // A CSS transition on a descendant that outlives the enter: it must not hold `done` (#302).
                    block({
                      w: 40,
                      h: 16,
                      tone: "accent",
                      attrs: { "data-css-probe": "" },
                      style: "margin:8px;opacity:1;transition:opacity calc(var(--dur-celebrate) * 2)",
                    }),
                  ]),
                ])
              : null,
          }),
        ]),
        block({
          w: 40,
          h: 40,
          round: true,
          tone: "accent",
        }),
        readout("modal", () => "fixed, bottom right"),
        replayButton({
          id: "modal-interrupted",
          label: "modal interrupted",
          onClick: () => modal(true),
        }),
      ]),
      section({
        id: "toast",
        title: "Toast",
        moment: "R08 R09",
        replay: toast,
      }, [
        stage({ clip: true, w: 300, h: 64 }, [
          h(Transition, {
            css: false,
            ...toastHooks,
            ...after("toast"),
          }, {
            default: () => toastOpen.value
              ? toastBlock(toastEl, false)
              : null,
          }),
        ]),
        stage({ clip: true, w: 300, h: 64 }, [
          h(Transition, { css: false, ...errorHooks }, {
            default: () => toastOpen.value
              ? toastBlock(errorEl, true)
              : null,
          }),
        ]),
        readout("second", () => "error toast: shakes after the slide"),
      ]),
      section({
        id: "tooltip",
        title: "Tooltip",
        moment: "R10",
        replay: tooltip,
      }, [
        stage({ w: 120, h: 80, style: "margin-top:40px" }, [
          block({
            w: 120,
            h: 40,
            tone: "accent",
            style: "position:absolute;bottom:0",
          }),
          // The resting frame of `tipIn`: translated up by its own height and centred on the trigger.
          block({
            ref: tip,
            w: 80,
            h: 28,
            tone: "gold",
            style: "position:absolute;left:50%;top:0;transform:translate(-50%,-100%)",
          }),
        ]),
      ]),
    ]);
  },
});

const meta = {
  title: "Motion/Popups",
  decorators: [withMotionSurface],
  parameters: { motion: {} },
  render: () => Popups,
} satisfies Meta;

export default meta;

export const Default: StoryObj<typeof meta> = {
  async play({ canvasElement, step }) {
    // The story mounts one tick after the surface has read its tokens, so the first element has to be waited for.
    await within(canvasElement).findByRole("button", { name: "Replay" });
    const hostOf = (id: Popup) => document.querySelector<HTMLElement>(`[data-section="${id}"]`)!;
    const modalEl = () => document.querySelector<HTMLElement>("[data-modal]");
    const plain = () => live().filter(isPlainAnimation);
    const panel = () => canvasElement.querySelector<HTMLElement>("[data-menu]")!;

    await step("#302: the hooks wait for both animations of the modal, and not for a CSS transition", () => withMotion("full", async () => {
      await clickReplay(canvasElement, "modal");
      await waitFor(() => expect(modalEl()).not.toBeNull());
      const root = modalEl()!;
      const running = root.getAnimations({ subtree: true }).filter(isPlainAnimation);
      expect(running.length).toBeGreaterThanOrEqual(2);
      const targets = running.map(a => (a.effect as KeyframeEffect).target);
      expect(targets).toContain(root.querySelector("[data-scrim]"));
      expect(targets).toContain(root.querySelector("[data-card]"));
      expect(targets).not.toContain(root);
      await waitFor(() => expect(hostOf("modal").dataset.enters).toBe("1"));
      expect(hostOf("modal").dataset.liveAtDone).toBe("0");
      // The CSS transition on the probe is 4.8 s long and still running when the enter is done.
      expect(Number(hostOf("modal").dataset.cssLiveAtDone)).toBeGreaterThanOrEqual(1);
      await waitFor(() => expect(modalEl()).toBeNull(), { timeout: 4000 });
    }));

    await step("#302: a leave's held end state is released on the next enter and on a cancelled leave", () => withMotion("full", async () => {
      await clickReplay(canvasElement, "menu");
      await waitFor(() => expect(hostOf("menu").dataset.leaves).toBe("1"), { timeout: 5000 });
      // The panel now holds its leave's end state (opacity 0, a scale); the next enter must release it.
      await clickReplay(canvasElement, "menu");
      await waitFor(() => expect(hostOf("menu").dataset.enters).toBe("1"));
      expect(getComputedStyle(panel()).opacity).toBe("1");
      expect(getComputedStyle(panel()).transform).toBe("none");
      await waitFor(() => expect(hostOf("menu").dataset.leaves).toBe("1"), { timeout: 5000 });

      await clickReplay(canvasElement, "menu-interrupted");
      // The first enter ends, the leave is cancelled by the second open, and that enter ends: two enters, no leave.
      await waitFor(() => expect(hostOf("menu").dataset.enters).toBe("2"), { timeout: 3000 });
      expect(hostOf("menu").dataset.leaves).toBe("0");
      expect(getComputedStyle(panel()).opacity).toBe("1");
      // The hold ends in one leave: no timer is left running.
      await waitFor(() => expect(hostOf("menu").dataset.leaves).toBe("1"), { timeout: 5000 });
    }));

    await step("#302: a leave during an enter resolves done once", () => withMotion("full", async () => {
      await clickReplay(canvasElement, "modal-interrupted");
      await waitFor(() => expect(modalEl()).not.toBeNull());
      await waitFor(() => expect(hostOf("modal").dataset.enters).toBe("0"));
      // Vue waits for `done`: one frame after the close the modal is still there, leaving.
      await frames(1);
      await waitFor(() => expect(hostOf("modal").dataset.leaves).toBe("1"), { timeout: 4000 });
      expect(modalEl()).toBeNull();
      // Not called twice: a second `done` could only show up later, so the check waits for it.
      await new Promise(resolve => setTimeout(resolve, 400));
      expect(hostOf("modal").dataset.leaves).toBe("1");
      // The enter was cancelled, so it has no after-enter.
      expect(hostOf("modal").dataset.enters).toBe("0");
    }));

    await step("#300: reduced motion cancels every plain animation, the teleported modal's too", () => withMotion("full", async () => {
      await clickReplay(canvasElement, "modal");
      await waitFor(() => expect(plain().length).toBeGreaterThan(0));
      await waitFor(() => expect(modalEl()).not.toBeNull());
      await withMotion("reduce", async () => {
        await waitFor(() => expect(plain()).toHaveLength(0));
      });
      // The hold is a timer that started under full motion: let it end, so none is left.
      await waitFor(() => expect(modalEl()).toBeNull(), { timeout: 4000 });
    }));

    await step("the toasts and the tooltip play, and the toasts leave", () => withMotion("full", async () => {
      await clickReplay(canvasElement, "toast");
      await waitFor(() => expect(hostOf("toast").dataset.enters).toBe("1"));
      await waitFor(() => expect(hostOf("toast").dataset.leaves).toBe("1"), { timeout: 5000 });
      await clickReplay(canvasElement, "tooltip");
      await waitFor(() => expect(live().length).toBeGreaterThan(0));
    }));

    await step("a replay creates no animation when reduced", () => expectQuietWhenReduced(canvasElement));
  },
};
