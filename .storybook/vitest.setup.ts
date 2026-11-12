import * as a11yAnnotations from "@storybook/addon-a11y/preview";
import { setProjectAnnotations } from "@storybook/vue3-vite";
import { afterEach, expect } from "vitest";
import { page } from "vitest/browser";
import preview from "./preview";
import { isShot, screenshotName } from "./visual-variants";

const WIDTH = 1440;
const MIN_HEIGHT = 900;

// A found `setProjectAnnotations` replaces addon-vitest's own provisioning of the preview and the addons' annotations,
// which is how the desktop width gets in without a viewport option in Storybook's toolbar: the addon sets the
// viewport from these parameters before every story.
setProjectAnnotations([
  a11yAnnotations,
  preview,
  {
    parameters: {
      viewport: {
        options: {
          desktop: {
            name: "Desktop",
            styles: { width: `${WIDTH}px`, height: `${MIN_HEIGHT}px` },
          },
        },
        defaultViewport: "desktop",
      },
    },
  },
]);

// After the story's render and its axe run (a violation fails the test before this point is reached).
afterEach(async (ctx) => {
  const { story } = ctx as unknown as { story: { id: string } };
  if (!isShot(import.meta.env.WINNIES_VISUAL_VARIANT, story.id)) {
    return;
  }
  await document.fonts.ready;
  // The tester iframe clips what lies below the viewport, so the viewport is as tall as the story.
  await page.viewport(WIDTH, Math.max(MIN_HEIGHT, document.documentElement.scrollHeight));
  await expect.element(page.elementLocator(document.body)).toMatchScreenshot(screenshotName(story.id));
});
