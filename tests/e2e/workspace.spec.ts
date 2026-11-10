import { expect, test, visit } from "./fixtures";

const NAME = "Kitty vs. the world";

test("opens the Workspace already signed in as a fresh Owner", async ({ ownerPage }) => {
  await visit(ownerPage, "/");

  await expect(ownerPage.getByRole("button", { name: "Account Menu" })).toBeVisible();
  await expect(ownerPage.getByRole("button", { name: "Sign in with Discord" })).toHaveCount(0);
  await expect(ownerPage.getByRole("button", { name: "Create new Winnie" })).toBeVisible();
  // A fresh Owner has no Winnie yet.
  await expect(ownerPage.getByRole("button", { name: NAME, exact: true })).toHaveCount(0);
});

test("creates a Winnie and sees it", async ({ ownerPage }) => {
  await visit(ownerPage, "/");
  const winnie = ownerPage.getByRole("button", { name: NAME, exact: true });
  await expect(winnie).toHaveCount(0);

  await ownerPage.getByRole("button", { name: "Create new Winnie" }).click();

  // A <dialog> opened with showModal(); it has no accessible name of its own.
  const dialog = ownerPage.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "Create a new Winnie" })).toBeVisible();
  await dialog.getByRole("textbox", { name: "Winnie name" }).fill(NAME);
  // Exact, so Cancel and the header's "Create new Winnie" do not match. Not Enter: the form does not prevent its submit.
  await dialog.getByRole("button", { name: "Create", exact: true }).click();

  await expect(dialog).toBeHidden();
  await expect(winnie).toBeVisible();

  // It is on the server, not only on this page.
  await visit(ownerPage, "/");
  await expect(winnie).toBeVisible();
});
