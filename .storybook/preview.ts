import type { Decorator, Preview } from "@storybook/vue3-vite";
import { attributesApplied } from "../stories/support/html";
import "./preview.css";

/**
 * Sets the attributes the app sets, on the same elements: `data-theme` and `data-motion` on <html>,
 * `data-dialect` on <body>. Workspace carries no dialect attribute and full motion carries no motion attribute,
 * so those two are removed, not set to a value. The real attribute is used, not `prefers-reduced-motion` emulation.
 */
const withWinniesAttributes: Decorator = (story, context) => {
  const { theme, dialect, motion } = context.globals as Record<string, string>;
  const root = document.documentElement;

  // A short story would end the body, and with it the dialect backdrop (blobs, dots), partway down the canvas.
  document.body.style.minHeight = "100vh";

  root.dataset.theme = theme === "dark"
    ? "dark"
    : "light";

  if (motion === "reduce")
    root.dataset.motion = "reduce";
  else
    delete root.dataset.motion;

  if (dialect === "broadcast" || dialect === "showcase")
    document.body.dataset.dialect = dialect;
  else
    delete document.body.dataset.dialect;

  attributesApplied.value++;
  return story();
};

const preview: Preview = {
  globalTypes: {
    theme: {
      description: "data-theme on <html>",
      toolbar: {
        title: "Theme",
        icon: "circlehollow",
        items: [
          { value: "light", title: "Light" },
          { value: "dark", title: "Dark" },
        ],
        dynamicTitle: true,
      },
    },
    dialect: {
      description: "data-dialect on <body>",
      toolbar: {
        title: "Dialect",
        icon: "paintbrush",
        items: [
          { value: "workspace", title: "Workspace" },
          { value: "broadcast", title: "Broadcast" },
          { value: "showcase", title: "Showcase" },
        ],
        dynamicTitle: true,
      },
    },
    motion: {
      description: "data-motion on <html>",
      toolbar: {
        title: "Motion",
        icon: "lightning",
        items: [
          { value: "full", title: "Full motion" },
          { value: "reduce", title: "Reduced motion" },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: "light", dialect: "workspace", motion: "full" },
  decorators: [withWinniesAttributes],
  parameters: {
    layout: "fullscreen",
    // the body paints --backdrop-dots; Storybook's own background would hide it (I1)
    backgrounds: { disable: true },
    a11y: { test: "error" },
  },
};

export default preview;
