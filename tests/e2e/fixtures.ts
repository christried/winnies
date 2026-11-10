import type { Page } from "@playwright/test";
import type { SignedInOwner } from "../support/owner";
import { waitForHydration } from "@nuxt/test-utils/e2e";
import { test as base, expect } from "@nuxt/test-utils/playwright";
import { signInAsOwner } from "../support/owner";

// Shared by every e2e spec. Helpers shared with the API tests live in tests/support/: owner.ts signs an
// Owner in, owner-api.ts seeds and reads as that Owner, rows.ts types the answers. A later e2e ticket
// adds files of its own and edits none of fixtures.ts, global-setup.ts or playwright.config.ts, and
// does not edit tests/support/test-server.ts or env.ts: a fixture or helper only this suite needs lives
// in tests/e2e/support/<topic>.ts (or in its spec file) and extends this `test` with `test.extend`.
// Every test creates its own Owner and its own Winnies through `owner` and never reads another test's
// data: the config runs tests in parallel.

export { expect };

export const test = base.extend<{ owner: SignedInOwner; ownerPage: Page }>({
  // A fresh Owner per test: its own user row, never shared.
  // eslint-disable-next-line no-empty-pattern
  owner: async ({}, use) => {
    await use(await signInAsOwner());
  },
  // A page in its own browser context that already holds the Owner's session cookies. The default
  // `page` stays signed out, so one test can hold a Viewer and an Owner side by side.
  ownerPage: async ({ browser, owner }, use) => {
    const context = await browser.newContext();
    await context.addCookies(owner.cookies);
    await use(await context.newPage());
    await context.close();
  },
});

/**
 * Goes to a path and waits until Nuxt has hydrated, so a click never lands on markup without handlers
 *
 * @param page the page to navigate
 * @param path where to go, relative to the server under test
 */
export async function visit(page: Page, path: string) {
  await page.goto(path);
  await waitForHydration(page, path, "hydration");
}
