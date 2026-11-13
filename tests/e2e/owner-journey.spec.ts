import type { Locator, Page } from "@playwright/test";
import type { ChallengeInput } from "../support/owner-api";
import { seedWinnie } from "../support/owner-api";
import { expect, test, visit } from "./fixtures";

// The Owner's journey from an empty Workspace to a Complete Winnie, one test per step of it. Every
// assertion pins what the app does today, placeholder copy included: the ticket that rebuilds the
// Workspace updates this file in its PR and names the change.

const NAME = "Kitty vs. the world";

// Only the step a test is about goes through the UI; the rest is seeded through the API as the Owner
// (`seedWinnie`, on the page's own request context), to keep a failure local.

// Challenges are ordered (Pinned, open, Won last), never by insertion, so a row is found by its game.
// Keep the games of one test from being substrings of each other.
function rowOf(page: Page, game: string) {
  return page.getByRole("listitem").filter({ hasText: game });
}

// The add row's form is always open since #258 took the collapse out; the click on its title is harmless, no longer required.
async function addChallengeThroughForm(page: Page, challenge: ChallengeInput) {
  await page.getByText(/Create your (first|next) Challenge/).click();
  await page.getByPlaceholder("Game").fill(challenge.game);
  if (challenge.spec !== undefined)
    await page.getByPlaceholder("Win Condition").fill(challenge.spec);

  if (challenge.target !== undefined) {
    const counterToggle = page.getByRole("button", { name: "Counter target" });
    await counterToggle.click();
    await expect(counterToggle).toHaveAttribute("aria-pressed", "true");
    await page.getByPlaceholder("Target", { exact: true }).fill(String(challenge.target));
  }

  await page.getByRole("button", { name: "Add challenge" }).click();
  // Ends once the row is there, so the caller never races its own next add.
  await expect(rowOf(page, challenge.game)).toBeVisible();
}

// A paused timer must not move. There is no event for "nothing happened", so wait one full tick of the
// page clock (it ticks every second) and look again. This can only pass wrongly, never fail wrongly.
async function expectFrozen(timeText: Locator) {
  const before = await timeText.textContent();
  await timeText.page().waitForTimeout(2_200);
  await expect(timeText).toHaveText(before ?? "");
}

const TIME_TEXT = /^\d{1,2}:\d{2}(:\d{2})?$/;

test("adds a timer Challenge and a Counter Challenge", async ({ ownerPage }) => {
  await seedWinnie(ownerPage.request, { name: NAME });
  await visit(ownerPage, "/");
  await expect(ownerPage.getByText("Create your first Challenge")).toBeVisible();

  // The timer Challenge first: the form keeps its Target field open after a Counter Challenge is added.
  await addChallengeThroughForm(ownerPage, { game: "Speedrun", spec: "Any%" });
  await addChallengeThroughForm(ownerPage, { game: "Boss Rush", spec: "Beat 3 bosses", target: 3 });

  const expectBothRows = async () => {
    const speedrun = rowOf(ownerPage, "Speedrun");
    await expect(speedrun).toContainText("Any%");
    await expect(speedrun.getByRole("textbox", { name: "Speedrun count" })).toHaveCount(0);

    const bossRush = rowOf(ownerPage, "Boss Rush");
    await expect(bossRush).toContainText("Beat 3 bosses");
    await expect(bossRush.getByRole("textbox", { name: "Boss Rush count" })).toHaveValue("0");
    await expect(bossRush.getByText("/ 3")).toBeVisible();
    await expect(ownerPage.getByText(/0 \/ 2 won/)).toBeVisible();
  };
  await expectBothRows();

  // They are on the server, not only on this page.
  await visit(ownerPage, "/");
  await expectBothRows();
});

test("starts a Challenge Timer and pauses it", async ({ ownerPage }) => {
  await seedWinnie(ownerPage.request, {
    name: NAME,
    challenges: [
      { game: "Speedrun", spec: "Any%" },
    ],
  });
  await visit(ownerPage, "/");

  const row = rowOf(ownerPage, "Speedrun");
  const timeText = row.getByText(TIME_TEXT);
  await expect(timeText).toHaveText("00:00");
  await expect(ownerPage.getByRole("button", { name: "Start Winnie" })).toBeVisible();

  await row.getByRole("button", { name: "Start timer" }).click();
  // The label flips at the click and the button is disabled while the request runs: enabled again
  // means the server has answered.
  await expect(row.getByRole("button", { name: "Pause timer" })).toBeEnabled();
  await expect(ownerPage.getByText("1 running")).toBeVisible();
  // Starting a Challenge Timer starts the Total Timer too.
  await expect(ownerPage.getByRole("button", { name: "Pause Winnie" })).toBeVisible();
  // The text is recomputed every second; 10 s is headroom for a loaded machine.
  await expect(timeText).not.toHaveText("00:00", { timeout: 10_000 });

  // The start is on the server, not only on this page.
  await visit(ownerPage, "/");
  await expect(row.getByRole("button", { name: "Pause timer" })).toBeVisible();
  await expect(ownerPage.getByText("1 running")).toBeVisible();

  await row.getByRole("button", { name: "Pause timer" }).click();
  await expect(row.getByRole("button", { name: "Start timer" })).toBeEnabled();
  await expect(ownerPage.getByText("1 running")).toHaveCount(0);

  await visit(ownerPage, "/");
  await expect(row.getByRole("button", { name: "Start timer" })).toBeVisible();
  await expectFrozen(timeText);
});

test("counts a Counter to its Target and wins the timer Challenge until the Winnie is Complete", async ({ ownerPage }) => {
  await seedWinnie(ownerPage.request, {
    name: NAME,
    challenges: [
      { game: "Speedrun", spec: "Any%" },
      // A small Target on purpose: fewer clicks, fewer ways to race the save.
      { game: "Boss Rush", spec: "Beat 3 bosses", target: 2 },
    ],
  });
  await visit(ownerPage, "/");

  const banner = ownerPage.getByText(/Win-challenge complete/);
  const bossRush = rowOf(ownerPage, "Boss Rush");
  const count = bossRush.getByRole("textbox", { name: "Boss Rush count" });
  const increase = bossRush.getByRole("button", { name: "Increase Boss Rush" });

  await expect(banner).toHaveCount(0);
  await expect(ownerPage.getByText(/0 \/ 2 won/)).toBeVisible();

  await increase.click();
  await expect(count).toHaveValue("1");

  // The count is saved 400 ms after the last click. Reaching the Target wins the Challenge on the
  // page at once, so wait for the save of the final count before anything reloads.
  const saved = ownerPage.waitForResponse(response => response.request().method() === "PATCH"
    && /\/api\/challenges\/[^/]+\/counter$/.test(new URL(response.url()).pathname)
    && response.request().postDataJSON()?.count === 2);
  await Promise.all([
    saved,
    increase.click(),
  ]);

  await expect(count).toHaveValue("2");
  await expect(bossRush.getByRole("button", { name: "Mark as not won" })).toBeVisible();
  await expect(increase).toBeDisabled();
  await expect(ownerPage.getByText(/1 \/ 2 won/)).toBeVisible();
  // The timer Challenge is still open.
  await expect(banner).toHaveCount(0);

  const speedrun = rowOf(ownerPage, "Speedrun");
  await speedrun.getByRole("button", { name: "Mark as won" }).click();
  // Not optimistic: the label only changes once the server has saved the win.
  await expect(speedrun.getByRole("button", { name: "Mark as not won" })).toBeVisible();

  await expect(banner).toBeVisible();
  await expect(ownerPage.getByText(/2 \/ 2 won/)).toBeVisible();
  await expect(speedrun.getByRole("button", { name: "Start timer" })).toBeDisabled();
  // No timer ran in this test, so this was "Start Winnie" all along: a Complete Winnie cannot start.
  await expect(ownerPage.getByRole("button", { name: "Start Winnie" })).toBeDisabled();

  // Complete is on the server, not only on this page.
  await visit(ownerPage, "/");
  await expect(banner).toBeVisible();
  await expect(ownerPage.getByText(/2 \/ 2 won/)).toBeVisible();
});

test("renames a Winnie and sees the new name", async ({ ownerPage }) => {
  const renamed = "Kitty beats the world";
  await seedWinnie(ownerPage.request, { name: NAME });
  await visit(ownerPage, "/");

  await ownerPage.getByRole("button", { name: "More actions" }).click();
  await ownerPage.getByRole("menuitem", { name: "Rename" }).click();

  // The editor has no accessible name; it is the focused input, with the old name selected.
  const editor = ownerPage.locator("input:focus");
  await expect(editor).toHaveValue(NAME);
  await editor.fill(renamed);
  // It commits on Enter; leaving the field without it cancels.
  await editor.press("Enter");

  await expect(ownerPage.getByRole("button", { name: renamed, exact: true })).toBeVisible();
  await expect(ownerPage.getByRole("button", { name: NAME, exact: true })).toHaveCount(0);

  // The new name is on the server, not only on this page.
  await visit(ownerPage, "/");
  await expect(ownerPage.getByRole("button", { name: renamed, exact: true })).toBeVisible();
  await expect(ownerPage.getByRole("button", { name: NAME, exact: true })).toHaveCount(0);
});

test("deletes a Winnie and it is gone from the Workspace", async ({ ownerPage }) => {
  await seedWinnie(ownerPage.request, {
    name: NAME,
    challenges: [
      { game: "Speedrun", spec: "Any%" },
    ],
  });
  await visit(ownerPage, "/");

  const winnie = ownerPage.getByRole("button", { name: NAME, exact: true });
  await expect(winnie).toBeVisible();

  await ownerPage.getByRole("button", { name: "More actions" }).click();
  await ownerPage.getByRole("menuitem", { name: "Delete" }).click();

  const dialog = ownerPage.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "Delete Winnie" })).toBeVisible();
  await expect(dialog.getByText(NAME)).toBeVisible();
  // Exact: the dialog also holds a backdrop button named "close".
  await dialog.getByRole("button", { name: "Delete", exact: true }).click();

  await expect(dialog).toBeHidden();
  await expect(winnie).toHaveCount(0);
  // No Winnie, no card; the Owner is still in a working Workspace.
  await expect(ownerPage.getByRole("button", { name: "More actions" })).toHaveCount(0);
  await expect(ownerPage.getByRole("button", { name: "Create new Winnie" })).toBeVisible();

  // It is gone on the server, not only on this page.
  await visit(ownerPage, "/");
  await expect(winnie).toHaveCount(0);
});
