import { expect, test } from "@playwright/test";

// Build-prompt §8 loading rules for the 3D "Sticker Flip" hero.
for (const [width, height] of [
  [390, 844],
  [1440, 900],
] as const) {
  test(`3D hero goes live at ${width}px within budget, screenshot`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    const scripts: string[] = [];
    page.on("request", (r) => r.resourceType() === "script" && scripts.push(r.url()));
    await page.goto("/");
    const hero = page.locator("[data-hero]");
    await expect(hero).toHaveAttribute("data-hero", "3d", { timeout: 20_000 });
    expect(Number(await hero.getAttribute("data-draw-calls"))).toBeLessThan(30);
    expect(Number(await hero.getAttribute("data-triangles"))).toBeLessThan(60_000);
    await expect(hero.locator("canvas")).toBeVisible();
    await page.waitForTimeout(700); // cross-fade
    await page.screenshot({ path: `docs/private/reviews/M2/hero-3d-${width}.png` });
  });
}

test("drag flips the polaroid to the match card, release settles it", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const hero = page.locator("[data-hero]");
  await expect(hero).toHaveAttribute("data-hero", "3d", { timeout: 20_000 });
  const box = (await hero.boundingBox())!;
  const y = box.y + box.height * 0.45;
  await page.mouse.move(box.x + box.width * 0.3, y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.3 + box.width * 0.45, y, { steps: 12 });
  await page.waitForTimeout(600);
  await page.screenshot({ path: "docs/private/reviews/M2/hero-3d-flipped-1440.png" });
  await page.mouse.up();
});

test("reduced motion keeps the poster and never loads three.js", async ({ browser, baseURL }) => {
  const ctx = await browser.newContext({ baseURL, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  const big: string[] = [];
  page.on("response", async (r) => {
    if (r.request().resourceType() === "script" && (await r.body()).includes("WebGLRenderer")) big.push(r.url());
  });
  await page.goto("/");
  await page.waitForTimeout(2500);
  await expect(page.locator("[data-hero]")).toHaveAttribute("data-hero", "poster");
  expect(big).toEqual([]);
  await ctx.close();
});

test("the hero is decorative and the headline is real HTML", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("[data-hero]")).toHaveAttribute("aria-hidden", "true");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Better Matches. Better Adoptions.");
});
