import type { Page } from "@playwright/test";
import { THEME_COOKIE } from "../../shared/constants";
import { seedWinnie } from "../support/owner-api";
import { expect, test, visit } from "./fixtures";

// How the one theme preference reaches the page (#260, spec #257 § 4): `<html data-theme="light|dark">` is
// rendered by the server for Light and Dark, an inline <head> script resolves Match system before the first
// paint, and the Overlay is light only. Served HTML is read raw (`request.get`), which is what a browser
// gets before any script runs.

const HTML_TAG = /<html\b[^>]*>/;

/** The `data-theme` on the opening <html> tag of a served page, or undefined when the server left it off. */
async function servedTheme(page: Page, path: string) {
  const response = await page.request.get(path);
  expect(response.ok()).toBe(true);
  const html = await response.text();
  // Only <html> may carry it: the whole body holds at most one.
  expect(html.match(/\sdata-theme="/g)?.length ?? 0).toBeLessThanOrEqual(1);
  return HTML_TAG.exec(html)![0].match(/\sdata-theme="([^"]*)"/)?.[1];
}

/** Whether the app's own scripts ran: Nuxt's client entry puts `useNuxtApp` on the window (what `visit` waits on). */
function isAppRunning(page: Page) {
  return page.evaluate(() => typeof (window as unknown as { useNuxtApp?: unknown }).useNuxtApp === "function");
}

/** Resolves once the page has had time to run a media-query change handler and re-render its head. */
async function settle(page: Page) {
  await page.evaluate(() => new Promise<void>(resolve =>
    requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(resolve, 100))),
  ));
}

for (const theme of ["light", "dark"]) {
  test(`a ${theme} cookie is rendered by the server on <html> and nowhere else`, async ({ page, context, baseURL }) => {
    await context.addCookies([
      { name: THEME_COOKIE, value: theme, url: baseURL! },
    ]);

    expect(await servedTheme(page, "/")).toBe(theme);
    const html = await (await page.request.get("/")).text();
    expect(html.match(/\sdata-theme="/g)).toHaveLength(1);
  });
}

test("an Owner whose account says dark gets dark in a fresh browser", async ({ browser, ownerPage, owner }) => {
  const saved = await ownerPage.request.put("/api/user/theme", {
    data: { theme: "dark" },
  });
  expect(saved.ok()).toBe(true);

  // A new context: the session cookies only, no theme cookie.
  const fresh = await browser.newContext();
  await fresh.addCookies(owner.cookies);
  const page = await fresh.newPage();

  expect(await servedTheme(page, "/")).toBe("dark");
  await fresh.close();
});

test.describe("a cookie outside the three values", () => {
  test("falls back to the account's value", async ({ browser, ownerPage, owner, baseURL }) => {
    await ownerPage.request.put("/api/user/theme", {
      data: { theme: "dark" },
    });
    const fresh = await browser.newContext();
    await fresh.addCookies([
      ...owner.cookies,
      { name: THEME_COOKIE, value: "purple", url: baseURL! },
    ]);
    const page = await fresh.newPage();

    expect(await servedTheme(page, "/")).toBe("dark");
    await fresh.close();
  });

  test("falls back to Match system when signed out: no attribute is served", async ({ page, context, baseURL }) => {
    await context.addCookies([
      { name: THEME_COOKIE, value: "purple", url: baseURL! },
    ]);

    expect(await servedTheme(page, "/")).toBeUndefined();
  });
});

test("a system cookie leaves the attribute off, whatever the account says", async ({ browser, ownerPage, owner, baseURL }) => {
  await ownerPage.request.put("/api/user/theme", {
    data: { theme: "dark" },
  });
  const fresh = await browser.newContext();
  await fresh.addCookies([
    ...owner.cookies,
    { name: THEME_COOKIE, value: "system", url: baseURL! },
  ]);
  const page = await fresh.newPage();

  expect(await servedTheme(page, "/")).toBeUndefined();
  await fresh.close();
});

test.describe("Match system before the first paint", () => {
  for (const scheme of ["dark", "light"] as const) {
    test.describe(`in a browser preferring ${scheme}`, () => {
      test.use({ colorScheme: scheme });

      test("the inline script alone resolves the document, with the app's own scripts blocked", async ({ page }) => {
        await page.route("**/_nuxt/**", route => route.abort());

        // Not `visit`: it waits for hydration, which never comes here.
        await page.goto("/", { waitUntil: "domcontentloaded" });

        await expect(page.locator("html")).toHaveAttribute("data-theme", scheme);
        // Nothing but the served markup and that script ran: the server left the attribute off, and the app never started.
        expect(await servedTheme(page, "/")).toBeUndefined();
        expect(await isAppRunning(page)).toBe(false);
      });
    });
  }
});

test.describe("Match system follows the OS", () => {
  test.use({ colorScheme: "dark" });

  test("flips the attribute live, without a navigation", async ({ page }) => {
    await visit(page, "/");
    // The marker the blocked-scripts test above relies on being absent.
    expect(await isAppRunning(page)).toBe(true);
    let navigations = 0;
    page.on("framenavigated", () => navigations++);
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

    await page.emulateMedia({ colorScheme: "light" });
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

    await page.emulateMedia({ colorScheme: "dark" });
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    expect(navigations).toBe(0);
  });
});

test.describe("the Overlay is light only", () => {
  const NAME = "Theme test Winnie";

  test("with a dark cookie, the served page and the hydrated document say light", async ({ page, context, ownerPage, baseURL }) => {
    const winnie = await seedWinnie(ownerPage.request, { name: NAME });
    const path = `/shared/${winnie.shareSlug}/overlay`;
    await context.addCookies([
      { name: THEME_COOKIE, value: "dark", url: baseURL! },
    ]);

    expect(await servedTheme(page, path)).toBe("light");
    await visit(page, path);
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  });

  test("with the Owner's account on dark, it says light", async ({ ownerPage }) => {
    await ownerPage.request.put("/api/user/theme", {
      data: { theme: "dark" },
    });
    const winnie = await seedWinnie(ownerPage.request, { name: NAME });
    const path = `/shared/${winnie.shareSlug}/overlay`;

    expect(await servedTheme(ownerPage, path)).toBe("light");
    await visit(ownerPage, path);
    await expect(ownerPage.locator("html")).toHaveAttribute("data-theme", "light");
  });

  test.describe("under an OS preferring dark, with Match system", () => {
    test.use({ colorScheme: "dark" });

    test("it stays light after hydration and after the OS scheme flips both ways", async ({ page, ownerPage }) => {
      const winnie = await seedWinnie(ownerPage.request, { name: NAME });
      await visit(page, `/shared/${winnie.shareSlug}/overlay`);
      const html = page.locator("html");
      await expect(html).toHaveAttribute("data-theme", "light");

      for (const scheme of ["light", "dark"] as const) {
        await page.emulateMedia({ colorScheme: scheme });
        await settle(page);
        await expect(html).toHaveAttribute("data-theme", "light");
      }
    });
  });
});

test.describe("after hydration the attribute is never removed", () => {
  test.use({ colorScheme: "light" });

  test("cycling the theme control through all three steps leaves a value on <html> at every moment", async ({ page, ownerPage }) => {
    const winnie = await seedWinnie(ownerPage.request, { name: "Theme test Winnie" });
    // Records every mutation of data-theme that left the attribute absent, from before any script runs.
    await page.addInitScript(() => {
      (window as unknown as { __themeRemovals: string[] }).__themeRemovals = [];
      new MutationObserver((records) => {
        for (const record of records) {
          if (!(record.target as Element).hasAttribute("data-theme"))
            (window as unknown as { __themeRemovals: string[] }).__themeRemovals.push(record.oldValue ?? "");
        }
      }).observe(document, {
        subtree: true,
        attributes: true,
        attributeFilter: ["data-theme"],
        attributeOldValue: true,
      });
    });
    await visit(page, `/shared/${winnie.shareSlug}`);
    const html = page.locator("html");
    await expect(html).toHaveAttribute("data-theme", "light");

    // system -> light -> dark -> system (which resolves to the OS: light).
    await page.getByRole("button", { name: "Theme: System. Change theme" }).click();
    await expect(html).toHaveAttribute("data-theme", "light");
    await page.getByRole("button", { name: "Theme: Light. Change theme" }).click();
    await expect(html).toHaveAttribute("data-theme", "dark");
    await page.getByRole("button", { name: "Theme: Dark. Change theme" }).click();
    await expect(html).toHaveAttribute("data-theme", "light");
    await expect(page.getByRole("button", { name: "Theme: System. Change theme" })).toBeVisible();

    const removals = await page.evaluate(() => (window as unknown as { __themeRemovals: string[] }).__themeRemovals);
    expect(removals).toEqual([]);
  });
});
