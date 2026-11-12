import type { Meta, StoryObj } from "@storybook/vue3-vite";
import { chip, grid, group, htmlStory, resolved, storyPage } from "../support/html";
import { declared } from "../support/tokens";

const shadows = declared("shadow");
const lips = declared("lip");

// The well is an inset: it sits on the sunken surface, as the card shows it.
function shadowBlock(name: string) {
  const fill = name === "--shadow-well"
    ? "--color-surface-sunken"
    : "--color-surface";
  return `<div style="display:flex;flex-direction:column;gap:12px;align-items:flex-start">`
    + `<span style="display:block;width:120px;height:72px;background:var(${fill});border-radius:var(--radius-xl);box-shadow:var(${name})"></span>`
    + `${chip(name)}</div>`;
}

// A solid offset in the lip colour: the token is the offset, so the block carries no blur.
function lipBlock(name: string) {
  return `<div style="display:flex;flex-direction:column;gap:12px;align-items:flex-start">`
    + `<span style="display:block;width:120px;height:56px;background:var(--color-surface);border-radius:var(--radius-lg);box-shadow:0 var(${name}) 0 0 var(--color-lip)"></span>`
    + `${chip(name)}${chip(resolved(name))}</div>`;
}

// The material card draws grain, fingerprint and gloss on a surface. The fingerprint is masked as the hero card masks it;
// the mask itself is not a picture, so it is not drawn on its own.
const textures = declared("texture").filter(name => !name.endsWith("-mask"));

function textureBlock(name: string) {
  const mask = name === "--texture-fingerprint"
    ? ";-webkit-mask-image:var(--texture-fingerprint-mask);mask-image:var(--texture-fingerprint-mask)"
    : "";
  return `<div style="display:flex;flex-direction:column;gap:12px;align-items:flex-start">`
    + `<span style="position:relative;display:block;width:150px;height:70px;background:var(--color-surface);border-radius:var(--radius-xl);box-shadow:var(--shadow-raised)">`
    + `<span style="position:absolute;inset:0;border-radius:inherit;background:var(${name})${mask}"></span></span>`
    + `${chip(name)}</div>`;
}

const meta: Meta = {
  title: "Tokens/Lips and shadows",
  render: () => htmlStory(() => storyPage("Lips and shadows", [
    group("Shadows", `<div style="padding-bottom:24px">${grid(shadows.map(shadowBlock), 180)}</div>`),
    group("Lips", `<div style="padding-bottom:16px">${grid(lips.map(lipBlock), 140)}</div>`),
    group("Textures", `<div style="padding-bottom:16px">${grid(textures.map(textureBlock), 180)}</div>`),
  ].join(""))),
};

export default meta;

export const Default: StoryObj = {};
