import type { Meta, StoryObj } from "@storybook/vue3-vite";
import { chip, grid, htmlStory, resolved, storyPage } from "../support/html";
import { declared } from "../support/tokens";

const names = declared("radius");

function block(name: string) {
  return `<div style="display:flex;flex-direction:column;gap:8px">`
    + `<span style="display:block;height:52px;background:var(--color-surface);border-radius:var(${name});box-shadow:var(--shadow-raised)"></span>`
    + `${chip(name)}${chip(resolved(name))}</div>`;
}

const meta: Meta = {
  title: "Tokens/Radii",
  render: () => htmlStory(() => storyPage("Radii", grid(names.map(block), 120))),
};

export default meta;

export const Default: StoryObj = {};
