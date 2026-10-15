import { expect, test as base, type BrowserContextOptions } from "@playwright/test";
import { deleteUsers, devReady, makeUser, signInWithMfa } from "./admin-helpers";

// /brand is admin-only (aal2), so every test here runs signed in as a throwaway dev admin.
base.describe.configure({ mode: "serial" });
base.skip(!devReady, "needs .env.local (dev)");
let state: BrowserContextOptions["storageState"];
base.beforeAll(async ({ browser, baseURL }) => {
  const ctx = await browser.newContext({ baseURL });
  await signInWithMfa(await ctx.newPage(), await makeUser({ role: "admin" }));
  state = await ctx.storageState();
  await ctx.close();
});
base.afterAll(deleteUsers);
const test = base.extend({
  page: async ({ browser, baseURL }, provide) => {
    const ctx = await browser.newContext({ storageState: state, baseURL });
    await provide(await ctx.newPage());
    await ctx.close();
  },
});

const WIDTHS = [
  [360, 800],
  [390, 844],
  [768, 1024],
  [1440, 900],
] as const;

for (const [width, height] of WIDTHS) {
  test(`/brand at ${width}px: no horizontal scroll, screenshot`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto("/brand");
    await page.evaluate(() => document.fonts.ready);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    await page.screenshot({ path: `screenshots/step0/brand-${width}.png`, fullPage: true });
  });
}

test("bottom sheet: Esc closes and focus returns to the trigger", async ({ page }) => {
  await page.goto("/brand");
  const trigger = page.getByRole("button", { name: "Open filters" });
  await trigger.click();
  const sheet = page.getByRole("dialog", { name: "Filters" });
  await expect(sheet).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(sheet).toBeHidden();
  await expect(trigger).toBeFocused();
});

test("touch targets are at least 44px", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/brand");
  const small = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>("main a, main button, main label:has(input.sr-only), main select")]
      .filter((el) => el.offsetParent !== null)
      .map((el) => {
        const r = el.getBoundingClientRect();
        // Pseudo-element hit areas (e.g. photo remove ×) are not measurable here; inline text links are exempt.
        const inline = getComputedStyle(el).display === "inline";
        return {
          text: (el.getAttribute("aria-label") ?? el.textContent ?? "").trim().slice(0, 30),
          w: r.width,
          h: r.height,
          inline,
        };
      })
      .filter((t) => !t.inline && (t.w < 44 || t.h < 44)),
  );
  expect(small).toEqual([]);
});

test("keyboard focus is never hidden under the sticky bar", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/brand");
  await page.locator("#b-name").focus();
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press("Tab");
    const hidden = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      const bar = document.querySelector<HTMLElement>(".sticky.bottom-0");
      // Safari tabs through form controls only, then to <body>: that is no focus target.
      if (!el || el === document.body || !bar || bar.contains(el)) return false;
      return el.getBoundingClientRect().bottom > bar.getBoundingClientRect().top;
    });
    expect(hidden).toBe(false);
  }
});

test("/brand is hidden from search engines", async ({ page }) => {
  const res = await page.request.get("/brand");
  expect(res.url()).toMatch(/\/brand$/);
  expect(res.headers()["x-robots-tag"]).toBe("noindex");
});
