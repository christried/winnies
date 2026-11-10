import { expect, test, visit } from "./fixtures";

// Today's signed-out `/` is the Workspace shell with the sign-in button; the Landing (#124) replaces it.
// What is checked here is what survives that: a visitor can sign in, and sees no Workspace controls.
test("/ signed out shows the sign-in button and no Workspace controls", async ({ page }) => {
  await visit(page, "/");

  await expect(page.getByRole("button", { name: "Sign in with Discord" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Create new Winnie" })).toHaveCount(0);
  await expect(page).toHaveTitle("Winnies");
});
