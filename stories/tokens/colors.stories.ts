import type { Meta, StoryObj } from "@storybook/vue3-vite";
import { chip, grid, group, htmlStory, storyPage } from "../support/html";
import { registered } from "../support/tokens";

const names = registered("color");

// Grouped as the foundation card groups them. A name no rule claims falls into "Surfaces and text".
const isState = (name: string) => /^--color-(?:danger|running|gone|offline)(?:-|$)|^--color-(?:won|pinned|complete)-(?:surface|text)/.test(name);
const isAccent = (name: string) => /^--color-(?:on-accent|accent|won|pinned|complete|ready|snooze)(?:-lip)?$|^--color-(?:highlight-gold|tear|vein|tape)/.test(name);

function swatch(name: string) {
  return `<div style="display:flex;flex-direction:column;gap:4px">`
    + `<i style="display:block;height:56px;border-radius:var(--radius-md);background:var(${name});box-shadow:inset 0 0 0 1px rgba(0,0,0,.1)"></i>`
    + `${chip(name)}</div>`;
}

// Text on an accent is --color-on-accent on these only: the pairs 07-accessibility.md measures at 4.5 and up.
function pill(name: string) {
  const accent = `--color-${name}`;
  return `<span style="background:var(${accent});color:var(--color-on-accent);font:400 var(--text-base)/var(--leading-label) var(--font-display);`
    + `padding:8px 16px;border-radius:var(--radius-pill);box-shadow:0 var(--lip-sm) 0 -1px var(${accent}-lip)">${name}</span>`;
}

// I1: these two are the only utilities in the stories. They prove the @theme inline registration on the installed
// Tailwind: a utility that reads `--color-surface` follows data-theme, so light and dark fill differently.
const utilityProbe = `<div style="display:flex;flex-wrap:wrap;gap:16px">`
  + `<div style="display:flex;flex-direction:column;gap:4px;width:160px">`
  + `<div class="bg-surface" style="height:72px;border-radius:var(--radius-md);box-shadow:inset 0 0 0 1px rgba(0,0,0,.1)"></div>${chip("bg-surface")}</div>`
  + `<div style="display:flex;flex-direction:column;gap:4px;width:160px">`
  + `<div class="bg-page" style="height:72px;border-radius:var(--radius-md);box-shadow:inset 0 0 0 1px rgba(0,0,0,.1)"></div>${chip("bg-page")}</div>`
  + `</div>`;

const meta: Meta = {
  title: "Tokens/Colours",
  render: () => htmlStory(() => storyPage("Colours", [
    group("Utility check (I1): bg-surface and bg-page", utilityProbe),
    group("Surfaces and text", grid(names.filter(name => !isState(name) && !isAccent(name)).map(swatch))),
    group("Accents", grid(names.filter(name => isAccent(name) && !isState(name)).map(swatch))),
    group("On accent", `<div style="display:flex;flex-wrap:wrap;gap:16px">${[
      "accent",
      "won",
      "pinned",
      "complete",
      "ready",
    ].map(pill).join("")}</div>`),
    group("States", grid(names.filter(isState).map(swatch))),
  ].join(""))),
};

export default meta;

export const Default: StoryObj = {};
