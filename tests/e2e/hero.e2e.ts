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
    // The scene writes its first-frame stats on the stage element inside the hero.
    const stage = hero.locator("[data-draw-calls]");
    const calls = Number(await stage.getAttribute("data-draw-calls"));
    const triangles = Number(await stage.getAttribute("data-triangles"));
    expect(calls).toBeGreaterThan(0);
    expect(calls).toBeLessThan(30);
    expect(triangles).toBeGreaterThan(0);
    expect(triangles).toBeLessThan(60_000);
    await expect(hero.locator("canvas")).toBeVisible();
    await page.waitForTimeout(700); // cross-fade
    await page.screenshot({ path: `screenshots/M2/hero-3d-${width}.png` });
  });
}

test("3D waits for the page: nothing loads until a visitor acts (or 4 s after load)", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/", { waitUntil: "load" });
  const hero = page.locator("[data-hero]");
  await page.waitForTimeout(1500); // idle, no input: still the poster
  await expect(hero).not.toHaveAttribute("data-hero", "3d");
  await expect(hero.locator("canvas")).toHaveCount(0);
  await page.mouse.move(400, 300); // first sign of a visitor
  await expect(hero).toHaveAttribute("data-hero", "3d", { timeout: 10_000 });
});

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
  await page.screenshot({ path: "screenshots/M2/hero-3d-flipped-1440.png" });
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
