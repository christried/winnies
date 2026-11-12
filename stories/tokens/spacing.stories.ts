import type { Meta, StoryObj } from "@storybook/vue3-vite";
import { chip, htmlStory, resolved, storyPage } from "../support/html";
import { declared } from "../support/tokens";

const names = declared("space");

// A square of the token, with its name and pixel size, as the card shows them.
function square(name: string) {
  return `<div style="display:flex;flex-direction:column;gap:4px;align-items:center">`
    + `<span style="display:block;width:var(${name});height:var(${name});background:var(--color-accent);border-radius:4px"></span>`
    + `${chip(name)}${chip(resolved(name))}</div>`;
}

const meta: Meta = {
  title: "Tokens/Spacing",
  render: () => htmlStory(() => storyPage("Spacing", `<div style="display:flex;flex-wrap:wrap;gap:20px;align-items:flex-end">${names.map(square).join("")}</div>`)),
};

export default meta;

export const Default: StoryObj = {};
