import type { Meta, StoryObj } from "@storybook/vue3-vite";
import { expect, within } from "storybook/test";
import { h } from "vue";
import UiFieldMessage from "../../app/components/ui/field-message.vue";
import { chip } from "../support/html";
import { page } from "../support/ui-kit";

// The app's own UiFieldMessage (#312): the small line under an input (03-components.md, `field-message`). It is also used
// alone, as the Create Winnie modal's `formError`. The copy is story copy, not product copy.

function card(story: string, width: number, ...body: ReturnType<typeof h>[]) {
  return h("div", {
    style: `box-sizing:border-box;width:${width}px;max-width:100%;display:flex;flex-direction:column;gap:12px;`
      + "padding:16px;background:var(--color-surface);border-radius:var(--radius-xl)",
  }, [
    h("div", {
      innerHTML: chip(story),
    }),
    ...body,
  ]);
}

const meta = {
  title: "UI/Field message",
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const LONG = "This Challenge already exists in this Winnie, so the game and the win condition together have to differ "
  + "from the one you already added above.";

export const Variants: Story = {
  render: () => () => page(
    "Field message variants",
    card(
      "hint, error, success",
      360,
      h(UiFieldMessage, { variant: "hint" }, () => "Target 1 to 9999"),
      h(UiFieldMessage, { variant: "error" }, () => "Game is required"),
      h(UiFieldMessage, { variant: "success" }, () => "Saved"),
    ),
    card(
      "custom icon",
      360,
      h(UiFieldMessage, { variant: "hint", icon: "check_circle" }, () => "A hint with the success icon"),
      h(UiFieldMessage, { variant: "error", icon: "info" }, () => "An error with the info icon"),
    ),
  ),
  async play({ canvasElement }) {
    const canvas = within(canvasElement);

    // Roles: an error is announced at once, a success politely, a hint not at all.
    const alerts = canvas.getAllByRole("alert");
    expect(alerts.map(el => el.textContent)).toEqual(["Game is required", "An error with the info icon"]);
    const statuses = canvas.getAllByRole("status");
    expect(statuses.map(el => el.textContent)).toEqual(["Saved"]);
    const hint = canvas.getByText("Target 1 to 9999").closest("p")!;
    expect(hint).not.toHaveAttribute("role");

    // The icon is decoration: the text speaks for itself.
    const messages = canvasElement.querySelectorAll("p");
    expect(messages).toHaveLength(5);
    for (const message of messages) {
      const icon = message.querySelector("svg")!;
      expect(icon).toHaveAttribute("aria-hidden", "true");
    }

    // Cherry for an error, muted for a hint: the colour is the variant's, not the icon's.
    const probe = document.createElement("span");
    document.body.append(probe);
    probe.style.color = "var(--color-danger-text)";
    const cherry = getComputedStyle(probe).color;
    probe.style.color = "var(--color-text-muted)";
    const muted = getComputedStyle(probe).color;
    probe.remove();
    expect(getComputedStyle(alerts[0]!).color).toBe(cherry);
    expect(getComputedStyle(hint).color).toBe(muted);
  },
};

export const LongMessage: Story = {
  render: () => () => page(
    "Field message long",
    card(
      "140 characters at 280px",
      280,
      h(UiFieldMessage, { variant: "error" }, () => LONG),
    ),
  ),
  async play({ canvasElement }) {
    const message = await within(canvasElement).findByRole("alert");
    const icon = message.querySelector("svg")!;
    const parent = message.parentElement!;

    // It wraps, the icon keeps its 18px, and nothing scrolls sideways.
    expect(LONG.length).toBeGreaterThanOrEqual(140);
    expect(message.getBoundingClientRect().height).toBeGreaterThan(Number.parseFloat(getComputedStyle(message).lineHeight) * 2);
    expect(icon.getBoundingClientRect().width).toBeCloseTo(18, 0);
    expect(icon.getBoundingClientRect().height).toBeCloseTo(18, 0);
    expect(message.scrollWidth).toBeLessThanOrEqual(message.clientWidth);
    expect(parent.scrollWidth).toBeLessThanOrEqual(parent.clientWidth);
  },
};
