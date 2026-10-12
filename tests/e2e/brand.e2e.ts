import { expect, test } from "@playwright/test";

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
    await page.screenshot({ path: `docs/private/reviews/step0/brand-${width}.png`, fullPage: true });
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

test("/brand is hidden from search engines", async ({ request }) => {
  const res = await request.get("/brand");
  expect(res.headers()["x-robots-tag"]).toBe("noindex");
});
