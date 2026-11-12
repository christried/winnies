import type { Meta, StoryObj } from "@storybook/vue3-vite";
import { chip, htmlStory, resolved, storyPage } from "../support/html";

// No foundation card covers this one: it is a readout, so the toolbar's dialect and motion switches change a picture.
// Each value is what `getComputedStyle` returns on <body> when the story renders, not a copy of the token file.
const tokens = [
  "--dur-hover",
  "--hover-lift",
  "--lip-lg",
  "--text-xl",
  "--motion-gain",
];

const cellCss = "padding:6px 12px;text-align:left;border-bottom:1px solid var(--color-border)";

function row(label: string, value: string) {
  return `<tr><th scope="row" style="${cellCss}">${chip(label)}</th><td style="${cellCss};font-weight:800">${value}</td></tr>`;
}

function readout() {
  const { theme, motion } = document.documentElement.dataset;
  const { dialect } = document.body.dataset;
  return `<table style="border-collapse:collapse;background:var(--color-surface);color:var(--color-text);border-radius:var(--radius-md);font-size:var(--text-sm)">`
    + `<caption style="text-align:left;padding:8px 12px;font-weight:800;background:var(--color-surface);color:var(--color-text);border-radius:var(--radius-md)">Resolved when this story rendered</caption>`
    + `<thead><tr><th scope="col" style="${cellCss}">Name</th><th scope="col" style="${cellCss}">Value</th></tr></thead><tbody>${
      row("data-theme on html", theme ?? "none")
    }${row("data-dialect on body", dialect ?? "none (Workspace)")
    }${row("data-motion on html", motion ?? "none (full motion)")
    }${tokens.map(name => row(name, resolved(name))).join("")
    }</tbody></table>`;
}

const meta: Meta = {
  title: "Tokens/Switches",
  render: () => htmlStory(() => storyPage("Switches", readout())),
};

export default meta;

export const Default: StoryObj = {};
