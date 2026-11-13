import { seedWinnie } from "../support/owner-api";
import { expect, test, visit } from "./fixtures";

// What an Owner sees and a screen reader hears when a field is refused (#312): the message under the input, announced,
// tied to the input and gone once the input is right. The look and the shake are pinned in the stories.

const NAME = "Kitty vs. the world";

test("the add row refuses an empty Game with a message tied to the input", async ({ ownerPage }) => {
  await seedWinnie(ownerPage.request, { name: NAME });
  await visit(ownerPage, "/");
  const game = ownerPage.getByRole("textbox", { name: "Game" });
  await expect(game).not.toHaveAttribute("aria-invalid", "true");

  // Emptied, not untouched: a field nobody has typed in holds `undefined`, which zod refuses with its own default
  // wording ("Invalid input: expected string, received undefined"), today's behaviour and not this ticket's to change.
  // Playwright's `fill("")` on an empty input fires no event, so a character goes in first.
  await game.fill("x");
  await game.fill("");
  await ownerPage.getByRole("button", { name: "Add challenge" }).click();

  const alert = ownerPage.getByRole("alert");
  await expect(alert).toHaveText("Game is required");
  await expect(game).toHaveAttribute("aria-invalid", "true");
  await expect(game).toHaveAccessibleDescription("Game is required");

  // The form validates on blur and change, so a value and a blur take the message away.
  await game.fill("Speedrun");
  await game.blur();
  await expect(alert).toHaveCount(0);
  await expect(game).not.toHaveAttribute("aria-invalid", "true");
});

test("Create Winnie refuses an empty name with a message tied to the input", async ({ ownerPage }) => {
  await visit(ownerPage, "/");
  await ownerPage.getByRole("button", { name: "Create new Winnie" }).click();

  const dialog = ownerPage.getByRole("dialog");
  const name = dialog.getByRole("textbox", { name: "Winnie name" });
  // Emptied, not untouched: see the add row's test.
  await name.fill("x");
  await name.fill("");
  await dialog.getByRole("button", { name: "Create", exact: true }).click();

  await expect(dialog.getByRole("alert")).toHaveText("Name is required");
  await expect(name).toHaveAttribute("aria-invalid", "true");
  await expect(name).toHaveAccessibleDescription("Name is required");
  // Refused, so the dialog stays.
  await expect(dialog).toBeVisible();
});
