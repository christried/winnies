import type { Decorator, Preview } from "@storybook/vue3-vite";
import { setup } from "@storybook/vue3-vite";
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

// A story renders the app's own components without the Nuxt app, so a name Storybook has no stand-in for (NuxtLink,
// ClientOnly, a module's component or directive) is not resolved, and Vue only warns. That would draw a story with a
// hole in it and pass, so those two warnings throw; every other warning goes to the console as before.
const UNRESOLVED = /^Failed to resolve (?:component|directive): /;

setup((app) => {
  app.config.warnHandler = (message, _instance, trace) => {
    if (UNRESOLVED.test(message))
      throw new Error(`${message}\nA story renders without the Nuxt app: a component in it can use only what .storybook/nuxt/ resolves. Add a stub there, or take a prop instead of the Nuxt component.`);
    console.warn(`[Vue warn]: ${message}${trace}`);
  };
});

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
