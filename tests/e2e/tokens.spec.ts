import type { Page } from "@playwright/test";
import { seedWinnie } from "../support/owner-api";
import { expect, test, visit } from "./fixtures";

// What the handoff's foundation does to the built app (#259): the body's backdrop, font and ink, the Overlay's
// transparent page, utilities that read the live tokens, the Tailwind entry's spacing, palette and variants, and
// fonts from Winnies' own origin. The class names below are literal strings on purpose: Tailwind generates a
// utility only when the scanner finds its name in a source file, and main.css scans this one (`@source`).
// The tests set `data-theme`, `data-dialect` and `data-motion` themselves; the plumbing that writes them is
// other tickets (#260 to #262).

const RGB_PAGE = "rgb(255, 227, 236)"; // --p-pink-100, the last layer of --backdrop-dots
const RGB_INK = "rgb(74, 43, 58)"; // --p-cocoa-900
const RGB_SURFACE_LIGHT = "rgb(255, 248, 251)"; // --p-pink-50
const RGB_SURFACE_DARK = "rgb(53, 34, 48)"; // --p-night-700

interface Switches {
  theme?: string;
  dialect?: string;
  motion?: string;
}

/** Sets or removes the three attributes the variants key on: `data-theme` and `data-motion` on <html>, `data-dialect` on <body>. */
async function switchAttributes(page: Page, switches: Switches) {
  await page.evaluate(({ theme, dialect, motion }) => {
    const set = (element: HTMLElement, name: string, value: string | undefined) =>
      value === undefined
        ? element.removeAttribute(name)
        : element.setAttribute(name, value);
    set(document.documentElement, "data-theme", theme);
    set(document.body, "data-dialect", dialect);
    set(document.documentElement, "data-motion", motion);
  }, switches);
}

/** Computed style of the page's <body>. */
async function bodyStyle(page: Page) {
  return page.evaluate(() => {
    const style = getComputedStyle(document.body);
    return {
      backgroundColor: style.backgroundColor,
      backgroundImage: style.backgroundImage,
      fontFamily: style.fontFamily,
      fontWeight: style.fontWeight,
      color: style.color,
    };
  });
}

/** Appends one div per class string to <body>, in order, and returns each one's computed padding-top. */
async function paddingOf(page: Page, classes: string[]) {
  return page.evaluate((names) => {
    document.getElementById("probe")?.remove();
    const probe = document.createElement("div");
    probe.id = "probe";
    probe.innerHTML = names.map(name => `<div class="${name}"></div>`).join("");
    document.body.append(probe);
    return [...probe.children].map(child => getComputedStyle(child).paddingTop);
  }, classes);
}

const VARIANTS = [
  "dark:p-5",
  "broadcast:p-6",
  "showcase:p-7",
  "reduced:p-9",
];

test("the body shows the backdrop, the body font at its weight and the ink", async ({ page }) => {
  await visit(page, "/changelog");
  const body = await bodyStyle(page);
  expect(body.backgroundColor).toBe(RGB_PAGE);
  expect(body.backgroundImage).toContain("radial-gradient");
  expect(body.fontFamily.replace(/"/g, "")).toMatch(/^M PLUS Rounded 1c/);
  expect(body.fontWeight).toBe("500");
  expect(body.color).toBe(RGB_INK);
});

test("the Overlay's page is transparent and the Shared View's keeps the backdrop", async ({ page, ownerPage }) => {
  const winnie = await seedWinnie(ownerPage.request, {
    name: "Tokens test Winnie",
    challenges: [
      { game: "Speedrun" },
    ],
  });

  await visit(page, `/shared/${winnie.shareSlug}/overlay`);
  const overlay = await bodyStyle(page);
  expect(overlay.backgroundColor).toBe("rgba(0, 0, 0, 0)");
  expect(overlay.backgroundImage).toBe("none");

  await visit(page, `/shared/${winnie.shareSlug}`);
  const sharedView = await bodyStyle(page);
  expect(sharedView.backgroundImage).toContain("radial-gradient");
  expect(sharedView.backgroundColor).toBe(RGB_PAGE);
});

test("a utility reads the live token: bg-surface follows data-theme", async ({ page }) => {
  await visit(page, "/changelog");
  const surface = () => page.evaluate(() => {
    document.getElementById("probe")?.remove();
    const probe = document.createElement("div");
    probe.id = "probe";
    probe.className = "bg-surface";
    document.body.append(probe);
    return getComputedStyle(probe).backgroundColor;
  });

  await switchAttributes(page, {});
  expect(await surface()).toBe(RGB_SURFACE_LIGHT);
  await switchAttributes(page, { theme: "dark" });
  expect(await surface()).toBe(RGB_SURFACE_DARK);
  await switchAttributes(page, {});
  expect(await surface()).toBe(RGB_SURFACE_LIGHT);
});

test("spacing is 4px a step, and Tailwind's default palette is gone", async ({ page }) => {
  await visit(page, "/changelog");
  const styles = await page.evaluate(() => {
    document.getElementById("probe")?.remove();
    const probe = document.createElement("div");
    probe.id = "probe";
    probe.innerHTML = "<div class='p-3'></div><div class='flex gap-3.5'></div><div class='bg-pink-500'></div>";
    document.body.append(probe);
    const [padded, flex, pink] = [...probe.children].map(child => getComputedStyle(child));
    return { padding: padded!.paddingTop, gap: flex!.columnGap, pink: pink!.backgroundColor };
  });
  expect(styles.padding).toBe("12px");
  expect(styles.gap).toBe("14px");
  // The class does not exist, so the element keeps the default: transparent.
  expect(styles.pink).toBe("rgba(0, 0, 0, 0)");
});

test.describe("the four variants match their attributes", () => {
  test("none applies without an attribute", async ({ page }) => {
    await visit(page, "/changelog");
    await switchAttributes(page, {});
    expect(await paddingOf(page, VARIANTS)).toEqual(["0px", "0px", "0px", "0px"]);
  });

  test("dark matches data-theme=\"dark\" on <html> and nothing else does", async ({ page }) => {
    await visit(page, "/changelog");
    await switchAttributes(page, { theme: "dark" });
    expect(await paddingOf(page, VARIANTS)).toEqual(["20px", "0px", "0px", "0px"]);
    await switchAttributes(page, { theme: "light" });
    expect(await paddingOf(page, VARIANTS)).toEqual(["0px", "0px", "0px", "0px"]);
  });

  test("broadcast and showcase match data-dialect on <body>, one each", async ({ page }) => {
    await visit(page, "/changelog");
    await switchAttributes(page, { dialect: "broadcast" });
    expect(await paddingOf(page, VARIANTS)).toEqual(["0px", "24px", "0px", "0px"]);
    await switchAttributes(page, { dialect: "showcase" });
    expect(await paddingOf(page, VARIANTS)).toEqual(["0px", "0px", "28px", "0px"]);
  });

  test("reduced matches data-motion=\"reduce\" on <html>", async ({ page }) => {
    await visit(page, "/changelog");
    await switchAttributes(page, { motion: "reduce" });
    expect(await paddingOf(page, VARIANTS)).toEqual(["0px", "0px", "0px", "36px"]);
  });

  test("a variant also matches below its attribute, on an ancestor", async ({ page }) => {
    await visit(page, "/changelog");
    await switchAttributes(page, {});
    const nested = await page.evaluate(() => {
      document.getElementById("probe")?.remove();
      const probe = document.createElement("div");
      probe.id = "probe";
      probe.innerHTML = "<div data-theme='dark'><section><div class='dark:p-5'></div></section></div>";
      document.body.append(probe);
      return getComputedStyle(probe.querySelector("section > div")!).paddingTop;
    });
    expect(nested).toBe("20px");
  });
});

test("both fonts load from Winnies' own origin, and no third-party font host is asked", async ({ page, baseURL }) => {
  const requests: { url: string; type: string }[] = [];
  page.on("request", request => requests.push({
    url: request.url(),
    type: request.resourceType(),
  }));

  await visit(page, "/changelog");
  // Nothing on the page uses Mochiy Pop One yet, so it is loaded explicitly.
  const loaded = await page.evaluate(async () => {
    await Promise.all([
      document.fonts.load("500 16px 'M PLUS Rounded 1c'"),
      document.fonts.load("400 16px 'Mochiy Pop One'"),
    ]);
    await document.fonts.ready;
    return [...document.fonts]
      .filter(face => face.status === "loaded")
      .map(face => face.family.replace(/["']/g, ""));
  });
  expect(loaded).toContain("M PLUS Rounded 1c");
  expect(loaded).toContain("Mochiy Pop One");

  const fonts = requests.filter(request => request.type === "font").map(request => new URL(request.url));
  expect(fonts.length).toBeGreaterThan(0);
  for (const font of fonts) {
    expect(font.origin).toBe(new URL(baseURL!).origin);
    expect(font.pathname).toMatch(/^\/_nuxt\/.+\.woff2$/);
  }
  const hosts = requests.map(request => new URL(request.url).hostname);
  expect(hosts.filter(host => host.includes("fonts.googleapis.com") || host.includes("fonts.gstatic.com"))).toEqual([]);
});

/** Appends a div that sets one property to `var(token)` under <body> and returns that property's computed value there. */
async function resolved(page: Page, property: string, token: string) {
  return page.evaluate(({ property, token }) => {
    document.getElementById("probe")?.remove();
    const probe = document.createElement("div");
    probe.id = "probe";
    probe.style.setProperty(property, `var(${token})`);
    document.body.append(probe);
    return getComputedStyle(probe).getPropertyValue(property);
  }, { property, token });
}

/** The vertical offset of a computed box-shadow's first layer: the lip, for the clay shadows. */
function firstLayerLip(boxShadow: string) {
  const lip = /^rgba?\([^)]*\) -?[\d.]+px (-?[\d.]+)px/.exec(boxShadow)?.[1];
  expect(lip, `no first layer in ${boxShadow}`).toBeDefined();
  return `${lip}px`;
}

// A composite token holds `var()`, so it is resolved where it is declared (on <html>) and <body> only inherits the
// finished value. A dialect that redeclares a token it reads (Showcase's lips, Broadcast's --text-base) therefore
// needs the composite redeclared under the dialect too (#268). Each shadow case is the lip of the first layer.
const DIALECTS = {
  workspace: {
    attribute: undefined,
    lips: {
      "--shadow-raised": "8px",
      "--shadow-raised-lg": "12px",
      "--shadow-raised-hover": "12px",
      "--shadow-popover": "12px",
    },
    btnText: "17px",
  },
  showcase: {
    attribute: "showcase",
    lips: {
      "--shadow-raised": "12px",
      "--shadow-raised-lg": "16px",
      "--shadow-raised-hover": "16px",
      "--shadow-popover": "16px",
    },
    btnText: "17px",
  },
  broadcast: {
    attribute: "broadcast",
    // Broadcast's --shadow-raised is the Overlay's own shadow, checked in its own test below.
    lips: { "--shadow-raised-lg": "12px", "--shadow-raised-hover": "12px", "--shadow-popover": "12px" },
    btnText: "18px",
  },
};

test.describe("the composites resolve under the dialect on <body>", () => {
  for (const theme of ["light", "dark"]) {
    for (const [name, expected] of Object.entries(DIALECTS)) {
      test(`${name}, ${theme}: the shadows have their dialect's lips`, async ({ page }) => {
        await visit(page, "/changelog");
        await switchAttributes(page, { theme, dialect: expected.attribute });
        const found: Record<string, string> = {};
        for (const token of Object.keys(expected.lips)) {
          found[token] = firstLayerLip(await resolved(page, "box-shadow", token));
        }
        expect(found).toEqual(expected.lips);
      });

      test(`${name}, ${theme}: --btn-text follows the dialect's --text-base`, async ({ page }) => {
        await visit(page, "/changelog");
        await switchAttributes(page, { theme, dialect: expected.attribute });
        expect(await resolved(page, "font-size", "--btn-text")).toBe(expected.btnText);
      });
    }

    test(`broadcast, ${theme}: --shadow-raised is the Overlay's shadow`, async ({ page }) => {
      await visit(page, "/changelog");
      await switchAttributes(page, { theme, dialect: "broadcast" });
      const raised = await resolved(page, "box-shadow", "--shadow-raised");
      expect(raised).not.toBe("none");
      expect(raised).toBe(await resolved(page, "box-shadow", "--overlay-shadow"));
    });
  }
});
