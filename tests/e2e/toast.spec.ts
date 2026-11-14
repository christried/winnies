import type { Locator } from "@playwright/test";
import { expect, test, visit } from "./fixtures";
import { seedSpeedrunWinnie } from "./support/winnies";

// Where a toast shows up and that it can be sent away, in the built app (#315). The two layouts that render the stack are
// only wired here: the component's own behaviour is pinned by its stories. The stack sits `--space-4` (16px) from the corner;
// 40px leaves room for a scrollbar and for the enter's jelly, which is still a few pixels off when the box is read.
const CORNER_MAX_PX = 40;

/**
 * Waits until the toast's right and bottom edges are near the viewport's: the enter's animation has settled.
 * @param toast the toast
 */
async function expectInCorner(toast: Locator) {
  const page = toast.page();
  await expect.poll(async () => {
    const box = await toast.boundingBox();
    const view = page.viewportSize();
    if (!box || !view)
      return Number.POSITIVE_INFINITY;
    return Math.max(view.width - (box.x + box.width), view.height - (box.y + box.height));
  }, { message: "the toast sits in the bottom right corner" }).toBeLessThan(CORNER_MAX_PX);
}

test("a Winnie's Workspace shows its toast in the bottom right, and Dismiss removes it", async ({ ownerPage }) => {
  await seedSpeedrunWinnie(ownerPage, "Toast test Winnie");
  await visit(ownerPage, "/");

  // The stack is the live region and is in the page before the first toast, so the card that comes is announced.
  await expect(ownerPage.getByRole("region", { name: "Notifications" })).toHaveAttribute("aria-live", "polite");

  await ownerPage.getByRole("button", { name: "Challenge actions" }).click();
  await ownerPage.getByText("Reset timer", { exact: true }).click();

  const toast = ownerPage.getByRole("status").filter({ hasText: "Timer reset" });
  await expect(toast).toBeVisible();
  await expectInCorner(toast);

  await toast.getByRole("button", { name: "Dismiss" }).click();
  await expect(toast).toHaveCount(0);
});

// An error toast stays until it is closed: the time a success toast would have gone in, and more.
const STICKY_CHECK_MS = 5_000;

test("a failed copy on the Shared View shows a sticky error toast that Dismiss removes", async ({ page, ownerPage }) => {
  const winnie = await seedSpeedrunWinnie(ownerPage, "Toast test Winnie");
  await page.addInitScript(() => Object.defineProperty(navigator, "clipboard", { value: undefined }));
  await visit(page, `/shared/${winnie.shareSlug}`);

  await page.getByRole("button", { name: "Copy link" }).click();

  const toast = page.getByRole("alert").filter({ hasText: "Couldn't copy" });
  await expect(toast).toBeVisible();
  await expectInCorner(toast);

  // The point is that nothing happens in that time.
  await page.waitForTimeout(STICKY_CHECK_MS);
  await expect(toast).toBeVisible();

  await toast.getByRole("button", { name: "Dismiss" }).click();
  await expect(toast).toHaveCount(0);
});
