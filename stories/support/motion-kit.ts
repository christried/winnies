import type { Ref, VNode, VNodeChild } from "vue";
// Building blocks of the motion stories (#306). Render functions, because Storybook has no template compiler here
// (the same reason `htmlStory` is a function). Colours, radii and lips are tokens, never a hex.
//
// The contract the play functions rely on, as attributes:
//   data-replay   "all" on the group button, the section's id on a section's button
//   data-section  a section's id
//   data-loop     a loop's name (stories/motion/loops.stories.ts)
//   data-probe    one of the two same-named loops whose phase the loops story compares
import { h, onBeforeUnmount, watch } from "vue";
import { attributesApplied, chip, headingCss } from "./html";

/** The fill of a block, by role. */
export type Tone = "surface" | "accent" | "won" | "complete" | "gold" | "muted";

const TONES: Record<Tone, string> = {
  surface: "var(--color-surface-raised)",
  accent: "var(--color-accent)",
  won: "var(--color-won-surface)",
  complete: "var(--color-complete-surface)",
  gold: "var(--color-highlight-gold)",
  muted: "var(--color-surface-sunken)",
};

/** What `block` draws. */
export interface BlockOptions {
  /** Pixels, default 96. */
  w?: number;
  /** Pixels, default 56. */
  h?: number;
  /** Default "surface". */
  tone?: Tone;
  /** A circle (radius 50%). */
  round?: boolean;
  ref?: Ref<HTMLElement | null>;
  attrs?: Record<string, unknown>;
  /** Appended to the block's own inline style. */
  style?: string;
}

/**
 * A box for a recipe to move. It holds no text of its own: axe measures contrast under an animated `opacity`, and a
 * textless block gives it nothing to measure. Labels go in a chip beside it.
 *
 * @param o the size, tone and extras
 * @param children what goes inside, for a block that carries another block (a ring, a face, a stamp)
 * @returns the element
 */
export function block(o: BlockOptions = {}, children?: VNodeChild): VNode {
  const { w = 96, h: height = 56, tone = "surface", round = false } = o;
  return h("div", {
    ref: o.ref,
    ...o.attrs,
    style: `box-sizing:border-box;flex:none;width:${w}px;height:${height}px;background:${TONES[tone]};`
      + `border:2px solid var(--color-border);border-radius:${round ? "50%" : "var(--radius-md)"}${o.style
        ? `;${o.style}`
        : ""}`,
  }, children as VNode[] | undefined);
}

/**
 * A positioned box that holds blocks, so a recipe that starts outside its own box (a banner, a card) has an edge to
 * come from.
 *
 * @param o the box
 * @param o.w width in pixels; the box shrinks to its content when absent
 * @param o.h height in pixels
 * @param o.clip hides what lies outside the box
 * @param o.style appended to the box's inline style
 * @param o.attrs extra attributes
 * @param children the blocks
 * @returns the element
 */
export function stage(o: { w?: number; h?: number; clip?: boolean; style?: string; attrs?: Record<string, unknown> }, children: VNodeChild[]): VNode {
  return h("div", {
    ...o.attrs,
    style: `position:relative;box-sizing:border-box;flex:none;max-width:100%;${o.w
      ? `width:${o.w}px;`
      : ""}${o.h
      ? `height:${o.h}px;`
      : ""}`
      + `${o.clip ? "overflow:hidden;" : ""}${o.style ?? ""}`,
  }, children as VNode[]);
}

/**
 * The button a section or a group replays with.
 *
 * @param o the button
 * @param o.id the `data-replay` value
 * @param o.label the accessible name is "Replay", or "Replay <label>" with one
 * @param o.onClick what a replay does
 * @returns the element
 */
export function replayButton(o: { id: string; label?: string; onClick: () => void | Promise<void> }): VNode {
  return h("button", {
    "type": "button",
    "data-replay": o.id,
    "onClick": () => {
      void o.onClick();
    },
    "style": "align-self:flex-start;cursor:pointer;background:var(--color-control);color:var(--color-text);"
      + "border:2px solid var(--color-control-lip);border-radius:var(--radius-md);box-shadow:0 var(--lip-sm) 0 var(--color-control-lip);"
      + "font:800 var(--text-sm)/1.2 var(--font-display);padding:6px 14px",
  }, o.label
    ? `Replay ${o.label}`
    : "Replay");
}

/** A chip as an element: `chip()` makes a string for `innerHTML`, so the text is escaped on the way in. */
function chipNode(text: string): VNode {
  const escaped = text.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  return h("span", {
    innerHTML: chip(escaped),
    style: "display:contents",
  });
}

/**
 * A titled group of blocks with its own Replay.
 *
 * @param o the section
 * @param o.id `data-section`, and the button's `data-replay`
 * @param o.title the h2, and the button's label
 * @param o.moment the handoff's moment IDs, on a chip
 * @param o.replay what the section's button does; no button without it
 * @param children what the section shows, in a wrapping row
 * @returns the element
 */
export function section(o: { id: string; title: string; moment?: string; replay?: () => void | Promise<void> }, children: VNodeChild[]): VNode {
  return h("div", { "data-section": o.id, "style": "display:flex;flex-direction:column;gap:12px" }, [
    h("h2", { style: `${headingCss};font-size:var(--text-xl)` }, o.title),
    h("div", { style: "display:flex;flex-wrap:wrap;gap:8px;align-items:center" }, [
      o.moment
        ? chipNode(o.moment)
        : null,
      o.replay
        ? replayButton({ id: o.id, label: o.title, onClick: o.replay })
        : null,
    ]),
    h("div", { style: "display:flex;flex-wrap:wrap;gap:16px;align-items:flex-start" }, children as VNode[]),
  ]);
}

/**
 * The whole story: a labelled landmark with its h1, as `storyPage` in html.ts, and the group button.
 *
 * @param title the landmark's label and the h1
 * @param o the group
 * @param o.replay runs every section together
 * @param children the sections
 * @returns the element
 */
export function page(title: string, o: { replay: () => void | Promise<void> }, children: VNodeChild[]): VNode {
  return h("section", { "aria-label": title, "style": "display:flex;flex-direction:column;gap:24px;padding:24px" }, [
    h("h1", { style: `${headingCss};font-size:var(--text-4xl)` }, title),
    replayButton({ id: "all", onClick: o.replay }),
    ...(children as VNode[]),
  ]);
}

/**
 * Takes the elements back to their resting look: every animation of each and of its subtree is cancelled, and the
 * inline filter and opacity a recipe may have landed are cleared. A forwards-filled recipe (`highlight`, `bannerOut`,
 * `stampOut`, `pageFlipOut`, `mute`) leaves its element hidden or muted until this runs, so a Replay calls it first.
 *
 * @param els the elements; null and undefined are skipped
 */
export function reset(...els: (HTMLElement | null | undefined)[]): void {
  for (const el of els) {
    if (!el)
      continue;
    el.getAnimations({ subtree: true }).forEach(a => a.cancel());
    [
      el,
      ...el.querySelectorAll<HTMLElement>("*"),
    ].forEach((node) => {
      node.style.filter = "";
      node.style.opacity = "";
    });
  }
}

/**
 * A chip "label: value" that draws again on a toolbar switch. The value is read live (`resolved(...)` from html.ts),
 * never from `m.T()`: the engine refreshes its tokens after a microtask, later than this redraw.
 *
 * @param label the name of the reading
 * @param value reads it
 * @returns the element
 */
export function readout(label: string, value: () => string): VNode {
  void attributesApplied.value;
  return chipNode(`${label}: ${value()}`);
}

/**
 * Calls back two animation frames after the toolbar changed a global. Call it in `setup`. Two frames, because the
 * engine's own observer reacts on a microtask and the stories' loops restart from this.
 *
 * @param cb what to do after a switch
 */
export function onSwitches(cb: () => void): void {
  let frame = 0;
  watch(attributesApplied, () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(cb);
    });
  });
  onBeforeUnmount(() => cancelAnimationFrame(frame));
}
