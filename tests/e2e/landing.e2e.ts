import { expect, test } from "@playwright/test";

const WIDTHS = [
  [360, 800],
  [390, 844],
  [768, 1024],
  [1440, 900],
] as const;

for (const [width, height] of WIDTHS) {
  test(`/ at ${width}px: no horizontal scroll, screenshot`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    await page.screenshot({ path: `docs/private/reviews/M1/landing-${width}.png`, fullPage: true });
  });
}

test("landing: one h1, both CTAs reach their pages", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Better Matches. Better Adoptions.");
  await page.getByRole("main").getByRole("link", { name: "Find a Dog" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Dogs looking for a home");
  await page.goto("/");
  await page.getByRole("main").getByRole("link", { name: "List a Dog" }).first().click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("First, about you");
});

test("menu: opens, Esc closes and focus returns to the button", async ({ page }) => {
  await page.goto("/");
  const button = page.getByLabel("Menu");
  await button.click();
  const nav = page.getByRole("navigation", { name: "Main" });
  await expect(nav.getByRole("link", { name: "List a Dog" })).toBeVisible();
  await nav.getByRole("link", { name: "Find a Dog" }).focus();
  await page.keyboard.press("Escape");
  await expect(nav).toBeHidden();
  await expect(button).toBeFocused();
});

test("later form steps and the confirmation page are not indexed", async ({ page }) => {
  for (const path of ["/match/home", "/list/dog", "/list/submitted"]) {
    await page.goto(path);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  }
});

test("every interactive target on / is at least 44px", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/");
  const small = await page.$$eval("a, button, summary", (els) =>
    els
      .filter((el) => (el as HTMLElement).offsetParent !== null)
      .map((el) => ({ text: el.textContent?.trim() || el.getAttribute("aria-label"), box: el.getBoundingClientRect() }))
      .filter(({ box }) => box.height < 44 || box.width < 44)
      .map(({ text }) => text),
  );
  expect(small).toEqual([]);
});

test("privacy notice and footer contact", async ({ page }) => {
  await page.goto("/");
  const footer = page.getByRole("navigation", { name: "Footer" });
  await expect(footer.getByRole("link", { name: "Contact" })).toHaveAttribute("href", "mailto:hello.awdopt@gmail.com");
  await footer.getByRole("link", { name: "How we use your data" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Privacy notice");
  await expect(page.getByRole("heading", { name: "What we collect" })).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
});
