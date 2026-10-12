import { expect, test } from "@playwright/test";

// Runs against the dev seed (supabase/seed/dev.sql): 6 approved fake dogs, 2 pending, 1 adopted, 1 removed.
const WIDTHS = [
  [360, 800],
  [390, 844],
  [768, 1024],
  [1440, 900],
] as const;

const PAGES = [
  ["discovery", "/dogs"],
  ["discovery-filtered", "/dogs?size=small&breed=indie"],
  ["profile", "/dogs/sample-biscuit"],
  ["profile-unknowns", "/dogs/sample-mango"],
] as const;

for (const [width, height] of WIDTHS) {
  for (const [name, path] of PAGES) {
    test(`${name} at ${width}px: no horizontal scroll, screenshot`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto(path);
      await page.getByRole("heading", { level: 1 }).waitFor();
      // Full-page shots never scroll, so lazy images would stay blank.
      await page.evaluate(async () => {
        for (const img of document.images) img.loading = "eager";
        await Promise.all([...document.images].map((img) => img.decode().catch(() => {})));
        await document.fonts.ready;
      });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(0);
      await page.screenshot({ path: `docs/private/reviews/M2/${name}-${width}.png`, fullPage: true });
    });
  }
}

test("filters sheet at 390px: screenshot", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/dogs?size=medium&breed=indie");
  await page.getByRole("button", { name: /Filters · 2/ }).click();
  await expect(page.getByRole("dialog", { name: "Filters" })).toBeVisible();
  await page.waitForTimeout(300);
  await page.screenshot({ path: "docs/private/reviews/M2/filters-390.png" });
});

test("discovery lists approved dogs only", async ({ page }) => {
  await page.goto("/dogs");
  await expect(page.getByText("6 dogs · Mumbai")).toBeVisible();
  const names = await page.getByRole("main").getByRole("heading", { level: 2 }).allTextContents();
  expect(names.filter((n) => n.startsWith("Sample")).sort()).toEqual([
    "Sample Biscuit",
    "Sample Mango",
    "Sample Noodle",
    "Sample Pepper",
    "Sample Rocket",
    "Sample Tofu",
  ]);
  for (const hidden of ["Pickle", "Chutney", "Ladoo", "Samosa"]) await expect(page.getByText(hidden)).toHaveCount(0);
});

test("filters live in the URL and chips remove them (mobile sheet)", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/dogs");
  await page.getByRole("button", { name: "Filters" }).click();
  const sheet = page.getByRole("dialog", { name: "Filters" });
  await sheet.getByText("Small", { exact: true }).click();
  await sheet.getByText("Indie", { exact: true }).click();
  await sheet.getByRole("button", { name: "Show dogs" }).click();
  await expect(page).toHaveURL(/size=small/);
  await expect(page).toHaveURL(/breed=indie/);
  await expect(page.getByText("2 dogs match your filters · Mumbai")).toBeVisible();
  await page.getByRole("link", { name: "Remove filter: Small" }).click();
  await expect(page).not.toHaveURL(/size=small/);
  await expect(page.getByText("4 dogs match your filters · Mumbai")).toBeVisible();
});

test("filter sheet closes with Esc and returns focus", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/dogs");
  const trigger = page.getByRole("button", { name: "Filters" });
  await trigger.click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Filters" })).toBeHidden();
  await expect(trigger).toBeFocused();
});

test("desktop: sidebar filters by area and age", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/dogs");
  const side = page.locator("#filters-side");
  await side.getByText("Western suburbs").click();
  await side.getByText("Puppy").click();
  await side.getByRole("button", { name: "Show dogs" }).click();
  await expect(page).toHaveURL(/area=western&age=puppy/);
  await expect(page.getByRole("main").getByRole("heading", { level: 2, name: "Sample Pepper" })).toBeVisible();
  await expect(page.getByText("1 dog match your filters · Mumbai")).toBeVisible();
});

test("no matches shows the empty state", async ({ page }) => {
  await page.goto("/dogs?size=large&energy=high");
  await expect(page.getByRole("heading", { name: "No dogs match these filters" })).toBeVisible();
  await page.getByRole("link", { name: "Clear filters" }).click();
  await expect(page).toHaveURL(/\/dogs$/);
});

test("profile: fields, Not known yet, video link, CTA", async ({ page }) => {
  await page.goto("/dogs");
  await page.getByRole("link", { name: /Sample Biscuit/ }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Sample Biscuit");
  await expect(page.getByText("Male · 2 yrs · Indie · Medium · Bandra")).toBeVisible();
  await expect(page.getByRole("region", { name: "Photos of Sample Biscuit" }).getByRole("img")).toHaveCount(3);
  // Biscuit's cat answer is unknown.
  const cats = page.locator("dl div", { hasText: "Cats" });
  await expect(cats).toContainText("Not known yet");
  await expect(cats).toHaveCSS("border-top-style", "dashed");
  await page.getByRole("link", { name: "See if we match" }).click();
  await expect(page).toHaveURL(/\/match$/);
});

test("profile hides pending, adopted and removed dogs", async ({ page }) => {
  for (const slug of ["sample-pending-pickle", "sample-adopted-ladoo", "sample-removed-samosa"]) {
    await page.goto(`/dogs/${slug}`);
    await expect(page.getByText(/could not be found/i)).toBeVisible();
    const robots = await page
      .locator('meta[name="robots"]')
      .evaluateAll((m) => m.map((e) => e.getAttribute("content")));
    expect(robots.length > 0 && robots.every((c) => c?.includes("noindex"))).toBe(true);
  }
});

test("every interactive target on /dogs and a profile is at least 44px", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  for (const path of ["/dogs?size=small", "/dogs/sample-biscuit"]) {
    await page.goto(path);
    const small = await page.$$eval("a, button, summary", (els) =>
      els
        .filter((el) => (el as HTMLElement).offsetParent !== null)
        .map((el) => ({
          text: el.textContent?.trim() || el.getAttribute("aria-label"),
          box: el.getBoundingClientRect(),
        }))
        .filter(({ box }) => box.height < 44 || box.width < 44)
        .map(({ text }) => text),
    );
    expect(small, path).toEqual([]);
  }
});
