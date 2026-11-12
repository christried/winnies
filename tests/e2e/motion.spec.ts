import type { Page } from "@playwright/test";
import { MOTION_COOKIE } from "../../shared/constants";
import { expect, test, visit } from "./fixtures";
import { openingTag } from "./support/served-html";
import { seedSpeedrunWinnie } from "./support/winnies";

// The Reduce motion preference (#262): the account's value and the cookie decide `data-motion` on <html>,
// and the server writes it, so the first paint is already still. What each page shows is read two ways: the
// served HTML's <html> tag (server rendering, not hydration) and the hydrated document. `--dur-base` is the
// token file's one duration that is 240ms normally and 0ms under `[data-motion="reduce"]`; Playwright's
// default has no OS reduced-motion setting, so the 240ms of the "off" cases proves the measurement is not vacuous.
// The build minifies the token file (`240ms` becomes `.24s`), so the duration is read through a probe element's
// computed `transition-duration`, which the browser normalises to seconds.

interface MotionOnPage {
  servedHtmlTag: string;
  attribute: string | null;
  /** `--dur-base` as a transition duration: "0.24s" normally, "0s" when reduced. */
  duration: string;
}

/** What a path serves and shows: the served <html> tag, then the hydrated attribute and `--dur-base`. */
async function motionOn(page: Page, path: string): Promise<MotionOnPage> {
  const served = await (await page.context().request.get(path)).text();
  await visit(page, path);
  const shown = await page.evaluate(() => ({
    attribute: document.documentElement.getAttribute("data-motion"),
    duration: (() => {
      const probe = document.createElement("div");
      probe.style.transitionDuration = "var(--dur-base)";
      document.documentElement.append(probe);
      const duration = getComputedStyle(probe).transitionDuration;
      probe.remove();
      return duration;
    })(),
  }));
  return {
    servedHtmlTag: openingTag(served, "html"),
    ...shown,
  };
}

/** Puts the preference on the Owner's account, as the switch will later. */
async function setAccountMotion(ownerPage: Page, reduceMotion: boolean) {
  const response = await ownerPage.request.put("/api/user/motion", {
    data: { reduceMotion },
  });
  expect(response.ok()).toBe(true);
}

async function setMotionCookie(page: Page, value: string, baseURL: string | undefined) {
  await page.context().addCookies([
    { name: MOTION_COOKIE, value, url: baseURL! },
  ]);
}

function expectReduced(surface: MotionOnPage) {
  expect(surface.servedHtmlTag).toContain("data-motion=\"reduce\"");
  expect(surface.attribute).toBe("reduce");
  expect(surface.duration).toBe("0s");
}

function expectNotReduced(surface: MotionOnPage) {
  expect(surface.servedHtmlTag).not.toContain("data-motion");
  expect(surface.attribute).toBeNull();
  expect(surface.duration).toBe("0.24s");
}

test("the account's preference on: a fresh browser gets it on the Workspace, the Shared View and the Overlay", async ({ ownerPage }) => {
  const winnie = await seedSpeedrunWinnie(ownerPage, "Motion test Winnie");
  await setAccountMotion(ownerPage, true);

  expectReduced(await motionOn(ownerPage, "/"));
  expectReduced(await motionOn(ownerPage, `/shared/${winnie.shareSlug}`));
  expectReduced(await motionOn(ownerPage, `/shared/${winnie.shareSlug}/overlay`));
});

test("the preference off and no cookie: no attribute on the Workspace, the Shared View and the Overlay", async ({ page, ownerPage }) => {
  const winnie = await seedSpeedrunWinnie(ownerPage, "Motion test Winnie");

  expectNotReduced(await motionOn(ownerPage, "/"));
  expectNotReduced(await motionOn(page, `/shared/${winnie.shareSlug}`));
  expectNotReduced(await motionOn(page, `/shared/${winnie.shareSlug}/overlay`));
});

test("the cookie alone, signed out, reduces the Shared View and the Overlay", async ({ page, ownerPage, baseURL }) => {
  const winnie = await seedSpeedrunWinnie(ownerPage, "Motion test Winnie");
  await setMotionCookie(page, "true", baseURL);

  expectReduced(await motionOn(page, `/shared/${winnie.shareSlug}`));
  expectReduced(await motionOn(page, `/shared/${winnie.shareSlug}/overlay`));
});

test("a cookie nobody can read is ignored: signed out it is off, signed in it follows the account", async ({ page, ownerPage, baseURL }) => {
  const winnie = await seedSpeedrunWinnie(ownerPage, "Motion test Winnie");
  await setMotionCookie(page, "banana", baseURL);
  expectNotReduced(await motionOn(page, `/shared/${winnie.shareSlug}`));

  await setAccountMotion(ownerPage, true);
  await setMotionCookie(ownerPage, "banana", baseURL);
  expectReduced(await motionOn(ownerPage, "/"));
});

test("the cookie wins over the account: preference on, cookie false, no attribute", async ({ ownerPage, baseURL }) => {
  await setAccountMotion(ownerPage, true);
  await setMotionCookie(ownerPage, "false", baseURL);

  expectNotReduced(await motionOn(ownerPage, "/"));
});
