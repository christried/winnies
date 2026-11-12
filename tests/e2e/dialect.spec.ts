import { expect, test, visit } from "./fixtures";
import { openingTag } from "./support/served-html";
import { seedSpeedrunWinnie } from "./support/winnies";

// The dialect each surface speaks, as the server renders it on <body> (spec #257 § 5). The cases read the
// served HTML, not the hydrated DOM, because the token file's dialect blocks have to apply from the first
// paint. The one exception is the client navigation, which has no served HTML to read.

test("the Workspace (signed in, /) serves no dialect", async ({ ownerPage }) => {
  const html = await (await ownerPage.request.get("/")).text();

  expect(openingTag(html, "body")).not.toContain("data-dialect");
});

test("the Landing (signed out, /) serves Showcase", async ({ page }) => {
  const html = await (await page.request.get("/")).text();

  expect(openingTag(html, "body")).toContain("data-dialect=\"showcase\"");
});

test("the Changelog serves Showcase", async ({ page }) => {
  const html = await (await page.request.get("/changelog")).text();

  expect(openingTag(html, "body")).toContain("data-dialect=\"showcase\"");
});

test("the Shared View serves Broadcast, live and gone", async ({ page, ownerPage }) => {
  const winnie = await seedSpeedrunWinnie(ownerPage, "Dialect test Winnie");

  const live = openingTag(await (await page.request.get(`/shared/${winnie.shareSlug}`)).text(), "body");
  const gone = openingTag(await (await page.request.get("/shared/does-not-exist")).text(), "body");

  expect(live).toContain("data-dialect=\"broadcast\"");
  expect(gone).toContain("data-dialect=\"broadcast\"");
});

test("the Overlay serves Broadcast and keeps its transparent body", async ({ page, ownerPage }) => {
  const winnie = await seedSpeedrunWinnie(ownerPage, "Dialect test Winnie");

  const body = openingTag(await (await page.request.get(`/shared/${winnie.shareSlug}/overlay`)).text(), "body");

  expect(body).toContain("data-dialect=\"broadcast\"");
  expect(body).toMatch(/class="[^"]*\bbg-none\b[^"]*"/);
  expect(body).toMatch(/class="[^"]*\bbg-transparent\b[^"]*"/);
});

test("an error page serves no dialect", async ({ page }) => {
  const html = await (await page.request.get("/no-such-page")).text();

  expect(openingTag(html, "body")).not.toContain("data-dialect");
});

test("client navigation leaves no stale dialect behind", async ({ ownerPage }) => {
  await visit(ownerPage, "/");
  await expect(ownerPage.locator("body")).not.toHaveAttribute("data-dialect");

  // The footer link is a client-side NuxtLink: no reload, so the head is updated in the browser.
  await ownerPage.getByRole("link", { name: "Changelog" }).click();
  await expect(ownerPage).toHaveURL(/\/changelog$/);
  await expect(ownerPage.locator("body")).toHaveAttribute("data-dialect", "showcase");

  await ownerPage.goBack();
  await expect(ownerPage).toHaveURL(/\/$/);
  await expect(ownerPage.locator("body")).not.toHaveAttribute("data-dialect");
});
