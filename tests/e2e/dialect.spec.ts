import { seedWinnie } from "../support/owner-api";
import { expect, test, visit } from "./fixtures";

// The dialect each surface speaks, as the server renders it on <body> (spec #257 § 5). The cases read the
// served HTML, not the hydrated DOM, because the token file's dialect blocks have to apply from the first
// paint. The one exception is the client navigation, which has no served HTML to read.

/**
 * The opening <body> tag of a served page, or an empty string when there is none.
 *
 * @param html the served HTML
 * @returns the tag with its attributes
 */
function bodyTag(html: string) {
  return /<body\b[^>]*>/.exec(html)?.[0] ?? "";
}

test("the Workspace (signed in, /) serves no dialect", async ({ ownerPage }) => {
  const html = await (await ownerPage.request.get("/")).text();

  const body = bodyTag(html);
  // A missing body would pass the check below vacuously.
  expect(body).toMatch(/^<body\b/);
  expect(body).not.toContain("data-dialect");
});

test("the Landing (signed out, /) serves Showcase", async ({ page }) => {
  const html = await (await page.request.get("/")).text();

  const body = bodyTag(html);
  expect(body).toMatch(/^<body\b/);
  expect(body).toContain("data-dialect=\"showcase\"");
});

test("the Changelog serves Showcase", async ({ page }) => {
  const html = await (await page.request.get("/changelog")).text();

  const body = bodyTag(html);
  expect(body).toMatch(/^<body\b/);
  expect(body).toContain("data-dialect=\"showcase\"");
});

test("the Shared View serves Broadcast, live and gone", async ({ page, ownerPage }) => {
  const winnie = await seedWinnie(ownerPage.request, {
    name: "Dialect test Winnie",
    challenges: [
      { game: "Speedrun" },
    ],
  });

  const live = bodyTag(await (await page.request.get(`/shared/${winnie.shareSlug}`)).text());
  const gone = bodyTag(await (await page.request.get("/shared/does-not-exist")).text());

  expect(live).toMatch(/^<body\b/);
  expect(live).toContain("data-dialect=\"broadcast\"");
  expect(gone).toMatch(/^<body\b/);
  expect(gone).toContain("data-dialect=\"broadcast\"");
});

test("the Overlay serves Broadcast and keeps its transparent body", async ({ page, ownerPage }) => {
  const winnie = await seedWinnie(ownerPage.request, {
    name: "Dialect test Winnie",
    challenges: [
      { game: "Speedrun" },
    ],
  });

  const body = bodyTag(await (await page.request.get(`/shared/${winnie.shareSlug}/overlay`)).text());

  expect(body).toMatch(/^<body\b/);
  expect(body).toContain("data-dialect=\"broadcast\"");
  expect(body).toMatch(/class="[^"]*\bbg-none\b[^"]*"/);
  expect(body).toMatch(/class="[^"]*\bbg-transparent\b[^"]*"/);
});

test("an error page serves no dialect", async ({ page }) => {
  const html = await (await page.request.get("/no-such-page")).text();

  const body = bodyTag(html);
  expect(body).toMatch(/^<body\b/);
  expect(body).not.toContain("data-dialect");
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
