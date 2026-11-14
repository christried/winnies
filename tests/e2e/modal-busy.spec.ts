import { seedWinnie } from "../support/owner-api";
import { expect, test, visit } from "./fixtures";

// The modal's two rules a person would notice (#314, #186 decision 5): while its request is in flight it cannot be
// closed, and when it is idle every way of closing it hands the focus back to the button that opened it.

const NAME = "Kitty vs. the world";

test("a Winnie being deleted ignores Esc, a scrim click and Cancel, then closes when the request finishes", async ({ ownerPage }) => {
  await seedWinnie(ownerPage.request, {
    name: NAME,
    challenges: [
      { game: "Speedrun", spec: "Any%" },
    ],
  });

  // Hold the DELETE until the test lets it go; every other call to the route goes on as it was.
  let deletes = 0;
  let release = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await ownerPage.route("**/api/winnies/*", async (route) => {
    if (route.request().method() !== "DELETE") {
      await route.fallback();
      return;
    }
    deletes++;
    await gate;
    await route.continue();
  });

  await visit(ownerPage, "/");
  const winnie = ownerPage.getByRole("button", { name: NAME, exact: true });
  await expect(winnie).toBeVisible();

  await ownerPage.getByRole("button", { name: "More actions" }).click();
  await ownerPage.getByRole("menuitem", { name: "Delete" }).click();

  const dialog = ownerPage.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "Delete Winnie" })).toBeVisible();
  await dialog.getByRole("button", { name: "Delete", exact: true }).click();

  const busy = dialog.getByRole("button", { name: "Deleting…" });
  await expect(busy).toBeVisible();
  await expect(busy).toHaveAttribute("aria-busy", "true");
  await expect(dialog.getByRole("button", { name: "Cancel" })).toBeDisabled();
  await expect(dialog.getByRole("button", { name: "Close" })).toBeDisabled();

  // Twice: a browser lets a second Esc close a dialog whose page refused the first.
  await ownerPage.keyboard.press("Escape");
  await ownerPage.keyboard.press("Escape");
  // The scrim is everything outside the card.
  await ownerPage.mouse.click(5, 5);
  // A negative cannot be awaited. The leave is 160 ms, so after this a modal that was going to close has closed.
  await ownerPage.waitForTimeout(600);
  await expect(dialog).toBeVisible();
  expect(deletes).toBe(1);

  release();
  await expect(dialog).toBeHidden();
  await expect(winnie).toHaveCount(0);
});

test("Esc, a scrim click and Cancel close an idle Create Winnie modal and focus goes back to the button that opened it", async ({ ownerPage }) => {
  await visit(ownerPage, "/");
  const trigger = ownerPage.getByRole("button", { name: "Create new Winnie" });
  const dialog = ownerPage.getByRole("dialog");

  const closers = [
    () => ownerPage.keyboard.press("Escape"),
    () => ownerPage.mouse.click(5, 5),
    () => dialog.getByRole("button", { name: "Cancel" }).click(),
  ];
  for (const close of closers) {
    await trigger.click();
    await expect(dialog.getByRole("heading", { name: "Create a new Winnie" })).toBeVisible();
    await expect(dialog.getByRole("textbox", { name: "Winnie name" })).toBeFocused();

    await close();
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
  }
});
