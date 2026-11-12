import { h, ref } from "vue";

/** The decorator bumps this after it has set the toolbar's attributes, so a story that read them draws again. */
export const attributesApplied = ref(0);

/**
 * Turns HTML into a Vue component. `h` needs no runtime template compiler, so the stories
 * hold on any Storybook builder, and they stay plain .ts files that `tsc` can check.
 * A function is called again on every toolbar change: Storybook mounts a Vue story once and does not
 * remount it for a global, so a string would keep the values it was built with.
 */
export function htmlStory(html: string | (() => string)) {
  return () => {
    void attributesApplied.value;
    return h("div", {
      innerHTML: typeof html === "string"
        ? html
        : html(),
    });
  };
}

// Every text in a story sits on a neutral chip (surface with text), never straight on a swatch or on the
// page backdrop: the backdrop is dots, blobs or grain by dialect, and axe cannot judge contrast over it.
const chipCss = "display:inline-block;max-width:100%;background:var(--color-surface);color:var(--color-text);"
  + "font:800 var(--text-xs)/1.3 ui-monospace,Menlo,monospace;padding:2px 8px;border-radius:var(--radius-xs)";

const headingCss = "display:inline-block;align-self:flex-start;background:var(--color-surface);color:var(--color-text);"
  + "font-family:var(--font-display);font-weight:var(--font-weight-display);line-height:var(--leading-label);"
  + "margin:0;padding:4px 16px;border-radius:var(--radius-md)";

/** The token's name (or any short label) as text, on a chip. */
export function chip(text: string) {
  return `<code style="${chipCss}">${text}</code>`;
}

/** The whole story: one labelled section with its h1, so axe finds a landmark and a heading. */
export function storyPage(label: string, body: string) {
  return `<section aria-label="${label}" style="display:flex;flex-direction:column;gap:24px;padding:24px">`
    + `<h1 style="${headingCss};font-size:var(--text-4xl)">${label}</h1>${body}</section>`;
}

/** A titled group of swatches or samples. */
export function group(title: string, body: string) {
  return `<div style="display:flex;flex-direction:column;gap:12px">`
    + `<h2 style="${headingCss};font-size:var(--text-xl)">${title}</h2>${body}</div>`;
}

/** A wrapping row of items; `min` is the column width, so a long label wraps inside its cell. */
export function grid(items: string[], min = 96) {
  return `<div style="display:grid;grid-template-columns:repeat(auto-fill,${min}px);gap:16px;align-items:start">`
    + `${items.join("")}</div>`;
}

/** What `getComputedStyle` says a token resolves to on <body>, where the dialect attribute sits. */
export function resolved(name: string) {
  return getComputedStyle(document.body).getPropertyValue(name).trim();
}
