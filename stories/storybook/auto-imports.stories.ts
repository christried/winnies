import type { Meta, StoryObj } from "@storybook/vue3-vite";
import { expect, within } from "storybook/test";
import { h } from "vue";
import Fixture from "../../.storybook/fixtures/auto-imports.vue";
import { FAKE_START, withMotionSurface } from "../support/motion-surface";

// A plumbing check, not a design (#307): that Storybook resolves the app's auto-imports as Nuxt does. The fixture has no
// import in it; it calls an app composable (`useSurfaceClock`), a Vue API (`computed`) and renders a component
// (`<UiIcon>`). The surface is the decorator's, with its clock frozen at FAKE_START. Never shot: see UNSHOT_PREFIXES.

const meta = {
  title: "Storybook/Auto-imports",
  decorators: [withMotionSurface],
  // So slow that the clock reads FAKE_START for the whole run.
  parameters: {
    motion: { rate: 0.000001 },
  },
  render: () => () => h(Fixture),
} satisfies Meta;

export default meta;

export const Default: StoryObj<typeof meta> = {
  async play({ canvasElement }) {
    // The decorator mounts the story one tick late.
    const clock = await within(canvasElement).findByRole("status");
    // Read in the fixture: a story file's own `import.meta` is left as written.
    expect(canvasElement.querySelector("[data-dev]")?.textContent).toBe("true");
    expect(clock.textContent).toBe(new Date(FAKE_START).toISOString());
    expect(canvasElement.querySelector("[data-cell] svg")).not.toBeNull();
  },
};
