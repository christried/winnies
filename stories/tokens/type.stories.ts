import type { Meta, StoryObj } from "@storybook/vue3-vite";
import { chip, group, htmlStory, resolved, storyPage } from "../support/html";
import { declared } from "../support/tokens";

// The scale, 2xs to 8xl. A name the token file adds later is picked up; component sizes (--text-*) are not declared.
const sizes = declared("text").filter(name => /^--text-(?:\d?xs|sm|md|base|lg|\d?xl)$/.test(name));

const faces = [
  { label: "Mochiy Pop One 400", family: "var(--font-display)", weight: "var(--font-weight-display)" },
  { label: "M PLUS Rounded 1c 500", family: "var(--font-body)", weight: "var(--font-weight-body)" },
  { label: "M PLUS Rounded 1c 700", family: "var(--font-body)", weight: "var(--font-weight-strong)" },
  { label: "M PLUS Rounded 1c 800", family: "var(--font-body)", weight: "var(--font-weight-heavy)" },
];

const panelCss = "display:flex;flex-direction:column;gap:8px;background:var(--color-surface);color:var(--color-text);"
  + "padding:16px;border-radius:var(--radius-lg);box-shadow:var(--shadow-raised)";

// The sample wraps (it is the sample that scales down, never the token): 120px must not overflow at desktop width.
function sample(text: string, size: string, face: typeof faces[number]) {
  return `<div style="display:flex;flex-direction:column;gap:2px;padding-bottom:20px">${chip(face.label)}`
    + `<span style="font-family:${face.family};font-weight:${face.weight};font-size:var(${size});line-height:var(--leading-tight);overflow-wrap:anywhere">${text}</span></div>`;
}

function row(size: string) {
  const big = Number.parseInt(resolved(size)) >= 92;
  const text = big ? "Kitty" : "Kitty vs. the world";
  // wider columns for the two display sizes, so a word is not broken across lines
  const column = big ? 480 : 280;
  return `<div style="${panelCss}">${chip(`${size} · ${resolved(size)}`)}`
    + `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(${column}px,1fr));gap:12px">${faces.map(face => sample(text, size, face)).join("")}</div></div>`;
}

// Every digit is Mochiy, in the timer and wherever a number is read: the body face's digits are the contrast.
function digits(face: typeof faces[number]) {
  return `<div style="${panelCss}">${chip(face.label)}`
    + `<span style="font-family:${face.family};font-weight:${face.weight};font-size:var(--text-5xl);line-height:var(--leading-tight)">0123456789</span>`
    + `<span style="font-family:${face.family};font-weight:${face.weight};font-size:var(--text-5xl);line-height:var(--leading-tight)">1:23:45</span></div>`;
}

const meta: Meta = {
  title: "Tokens/Type",
  render: () => htmlStory(() => storyPage("Type", [
    group("Scale", `<div style="display:flex;flex-direction:column;gap:16px">${sizes.map(row).join("")}</div>`),
    group("Digits are Mochiy", `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(360px,1fr));gap:16px">${[faces[0]!, faces[2]!].map(digits).join("")}</div>`),
  ].join(""))),
};

export default meta;

export const Default: StoryObj = {};
