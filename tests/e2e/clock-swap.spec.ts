import type { Page } from "@playwright/test";
import { ownerRequest, seedWinnie } from "../support/owner-api";
import { expect, test, visit } from "./fixtures";

// What the surface clock must keep doing for an Owner and a Viewer, pinned on the old clocks first (#304, ADR-0001:
// behaviour stays): a Winnie refreshed on return, a tab title that counts, a Viewer's timers that tick. The one
// intended change, row timers that now keep counting in a hidden tab, is never asserted here.

const NAME = "Clock swap Winnie";
const TIME_TEXT = /^\d{1,2}:\d{2}(:\d{2})?$/;
// A running Winnie's tab title: `mm:ss · <brand>`, or `h:mm:ss · <brand>` from an hour on.
const RUNNING_TITLE = /^\d+:\d{2}(:\d{2})? · /;

async function startTimer(page: Page, challengeId: string) {
  await ownerRequest(page.request, "POST", `/api/challenges/${challengeId}/timer`, { action: "start" });
}

// Headless Chromium has no hidden state to enter, so the tab is made to say it is hidden, and to come back.
async function setHidden(page: Page, hidden: boolean) {
  await page.evaluate((value) => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => value,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  }, hidden);
}

test("the Workspace shows a Challenge started elsewhere once the window is focused again", async ({ ownerPage }) => {
  const winnie = await seedWinnie(ownerPage.request, {
    name: NAME,
    challenges: [
      { game: "Speedrun" },
    ],
  });
  await visit(ownerPage, "/");
  const row = ownerPage.getByRole("listitem").filter({ hasText: "Speedrun" });
  await expect(row.getByRole("button", { name: "Start timer" })).toBeVisible();

  // The page does not know about this start.
  await startTimer(ownerPage, winnie.challengeIds[0]!);
  await ownerPage.evaluate(() => window.dispatchEvent(new Event("focus")));

  await expect(row.getByRole("button", { name: "Pause timer" })).toBeVisible();
  await expect(ownerPage.getByText("1 running")).toBeVisible();
});

test("the Workspace shows a Challenge started elsewhere once the tab is visible again", async ({ ownerPage }) => {
  const winnie = await seedWinnie(ownerPage.request, {
    name: NAME,
    challenges: [
      { game: "Speedrun" },
    ],
  });
  await visit(ownerPage, "/");
  const row = ownerPage.getByRole("listitem").filter({ hasText: "Speedrun" });
  await expect(row.getByRole("button", { name: "Start timer" })).toBeVisible();

  // Away first, so coming back is a return.
  await setHidden(ownerPage, true);
  await startTimer(ownerPage, winnie.challengeIds[0]!);
  await setHidden(ownerPage, false);

  await expect(row.getByRole("button", { name: "Pause timer" })).toBeVisible();
  await expect(ownerPage.getByText("1 running")).toBeVisible();
});

test("an Owner's Shared View still asks for their current Winnie when the window is focused", async ({ ownerPage }) => {
  const winnie = await seedWinnie(ownerPage.request, {
    name: NAME,
    challenges: [
      { game: "Speedrun" },
    ],
  });
  // Opening the Workspace makes this Winnie the current one (the cookie `winnies:current-id`).
  await visit(ownerPage, "/");
  await expect(ownerPage.getByRole("button", { name: "Start timer" })).toBeVisible();
  await visit(ownerPage, `/shared/${winnie.shareSlug}`);
  await expect(ownerPage.getByText("View only")).toBeVisible();

  const refresh = ownerPage.waitForRequest(request => request.method() === "GET"
    && new URL(request.url()).pathname === `/api/winnies/${winnie.id}`);
  await ownerPage.evaluate(() => window.dispatchEvent(new Event("focus")));
  await refresh;
});

test("the tab title counts a running Winnie", async ({ ownerPage }) => {
  const winnie = await seedWinnie(ownerPage.request, {
    name: NAME,
    challenges: [
      { game: "Speedrun" },
    ],
  });
  await startTimer(ownerPage, winnie.challengeIds[0]!);
  await visit(ownerPage, "/");

  await expect.poll(() => ownerPage.title()).toMatch(RUNNING_TITLE);
  const first = await ownerPage.title();
  await expect.poll(() => ownerPage.title(), { timeout: 10_000 }).not.toBe(first);
});

test("the tab title keeps counting while the tab is hidden", async ({ ownerPage }) => {
  const winnie = await seedWinnie(ownerPage.request, {
    name: NAME,
    challenges: [
      { game: "Speedrun" },
    ],
  });
  await startTimer(ownerPage, winnie.challengeIds[0]!);
  await visit(ownerPage, "/");
  await expect.poll(() => ownerPage.title()).toMatch(RUNNING_TITLE);

  await setHidden(ownerPage, true);
  const first = await ownerPage.title();
  await expect.poll(() => ownerPage.title(), { timeout: 10_000 }).not.toBe(first);
});

test("a Viewer's row timer ticks on the Shared View", async ({ page, ownerPage }) => {
  const winnie = await seedWinnie(ownerPage.request, {
    name: NAME,
    challenges: [
      { game: "Speedrun" },
    ],
  });
  await startTimer(ownerPage, winnie.challengeIds[0]!);
  await visit(page, `/shared/${winnie.shareSlug}`);

  const time = page.getByRole("listitem").getByText(TIME_TEXT);
  await expect(time).toBeVisible();
  const first = await time.textContent();
  await expect(time).not.toHaveText(first ?? "", { timeout: 10_000 });
});

test("a Streamer's row timer ticks on the Overlay", async ({ page, ownerPage }) => {
  const winnie = await seedWinnie(ownerPage.request, {
    name: NAME,
    challenges: [
      { game: "Speedrun" },
    ],
  });
  await startTimer(ownerPage, winnie.challengeIds[0]!);
  await visit(page, `/shared/${winnie.shareSlug}/overlay`);

  const time = page.getByRole("listitem").getByText(TIME_TEXT);
  await expect(time).toBeVisible();
  const first = await time.textContent();
  await expect(time).not.toHaveText(first ?? "", { timeout: 10_000 });
});
