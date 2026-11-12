import type { Page } from "@playwright/test";
import { expect, test, visit } from "./fixtures";
import { seedSpeedrunWinnie } from "./support/winnies";

// The particle layer every surface renders once (#300, handoff 04-motion-and-sound rule 7): a transparent, fixed,
// full-viewport box above everything that lets every click through. It is plain markup, so these cases read what a
// Viewer's browser computes, not what the engine does with it.

/** The one layer's computed look and its box, read in the page. */
async function layerLook(page: Page) {
  return page.locator("[data-particle-layer]").evaluate((el) => {
    const style = getComputedStyle(el);
    const box = el.getBoundingClientRect();
    return {
      ariaHidden: el.getAttribute("aria-hidden"),
      position: style.position,
      pointerEvents: style.pointerEvents,
      zIndex: style.zIndex,
      background: style.backgroundColor,
      box: {
        left: box.left,
        top: box.top,
        width: box.width,
        height: box.height,
      },
      viewport: { width: window.innerWidth, height: window.innerHeight },
    };
  });
}

async function expectOneLayer(page: Page) {
  await expect(page.locator("[data-particle-layer]")).toHaveCount(1);
  const look = await layerLook(page);

  expect(look.ariaHidden).toBe("true");
  expect(look.position).toBe("fixed");
  expect(look.pointerEvents).toBe("none");
  expect(look.zIndex).toBe("80");
  expect(look.background).toBe("rgba(0, 0, 0, 0)");
  expect(look.box).toEqual({ left: 0, top: 0, ...look.viewport });
}

test("the Landing renders one particle layer", async ({ page }) => {
  await visit(page, "/");

  await expectOneLayer(page);
});

test("the Landing's sign-in button is not covered by the layer", async ({ page }) => {
  await visit(page, "/");

  // A trial click does the hit test without clicking: it fails when something else would receive the click.
  await page.getByRole("button", { name: "Sign in with Discord" }).click({ trial: true });
});

test("the Workspace renders one particle layer", async ({ ownerPage }) => {
  await visit(ownerPage, "/");

  await expectOneLayer(ownerPage);
});

test("the Changelog renders one particle layer", async ({ page }) => {
  await visit(page, "/changelog");

  await expectOneLayer(page);
});

test("the Shared View renders one particle layer", async ({ page, ownerPage }) => {
  const winnie = await seedSpeedrunWinnie(ownerPage, "Particle layer Shared View");
  await visit(page, `/shared/${winnie.shareSlug}`);

  await expectOneLayer(page);
});

test("the Overlay renders one particle layer and stays transparent", async ({ page, ownerPage }) => {
  const winnie = await seedSpeedrunWinnie(ownerPage, "Particle layer Overlay");
  await visit(page, `/shared/${winnie.shareSlug}/overlay`);

  await expectOneLayer(page);
  const background = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(background).toBe("rgba(0, 0, 0, 0)");
});

test("client navigation to another page keeps exactly one layer", async ({ page }) => {
  await visit(page, "/");
  await expect(page.locator("[data-particle-layer]")).toHaveCount(1);

  // The footer link is a client-side NuxtLink: the layout stays, so its one instance and one layer stay too.
  await page.getByRole("link", { name: "Changelog" }).click();
  await expect(page).toHaveURL(/\/changelog$/);

  await expectOneLayer(page);
});
