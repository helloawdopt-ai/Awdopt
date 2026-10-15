import { expect, test, type Page } from "@playwright/test";
import sharp from "sharp";

// Full listing flow against awdopt-dev with Cloudflare's always-pass Turnstile test keys
// (playwright.config.ts). Creates one pending listing and deletes it afterwards.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const key = process.env.SUPABASE_SECRET_KEY ?? "";
const h = { apikey: key, "Content-Type": "application/json" };
const DOG = "E2E Test Dog";

test.skip(!key || new URL(url || "http://x").host !== "bdrkuwznuuklrryxddba.supabase.co", "needs .env.local (dev)");

// One worker for this file, so another worker's cleanup can't delete the listing mid-test.
test.describe.configure({ mode: "serial" });

async function cleanup() {
  const dogs = (await (
    await fetch(`${url}/rest/v1/dogs?name=eq.${encodeURIComponent(DOG)}&select=id,lister_id`, { headers: h })
  ).json()) as { id: string; lister_id: string }[];
  for (const d of dogs) {
    const objs = (await (
      await fetch(`${url}/storage/v1/object/list/listing-uploads`, {
        method: "POST",
        headers: h,
        body: JSON.stringify({ prefix: d.id }),
      })
    ).json()) as { name: string }[];
    if (objs.length)
      await fetch(`${url}/storage/v1/object/listing-uploads`, {
        method: "DELETE",
        headers: h,
        body: JSON.stringify({ prefixes: objs.map((o) => `${d.id}/${o.name}`) }),
      });
    await fetch(`${url}/rest/v1/dogs?id=eq.${d.id}`, { method: "DELETE", headers: h });
    await fetch(`${url}/rest/v1/listers?id=eq.${d.lister_id}`, { method: "DELETE", headers: h });
  }
}
test.beforeAll(cleanup);
test.afterAll(cleanup);

const photo = () =>
  sharp({ create: { width: 2000, height: 1500, channels: 3, background: { r: 200, g: 120, b: 160 } } })
    .withMetadata({ exif: { IFD0: { Artist: "e2e-exif-marker" } } })
    .jpeg()
    .toBuffer();

async function shot(page: Page, name: string) {
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: `docs/private/reviews/M2/${name}.png`, fullPage: true });
}

test("list a dog: 5 steps, photo pipeline, Turnstile, pending in the DB", async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/list");
  await expect(page).toHaveURL(/\/list\/you$/);

  // Step 1: required fields block Next.
  await page.getByRole("button", { name: "Next: About the dog" }).click();
  await expect(page.getByText("Enter your name")).toBeVisible();
  await expect(page.getByText("Choose one")).toBeVisible();
  await shot(page, "list-you-errors-390");
  await page.getByLabel("Your name").fill("E2E Lister");
  await page.getByLabel("Phone / WhatsApp").fill("98200 12345");
  await page.getByText("Rescuer", { exact: true }).click();
  await page.getByRole("button", { name: "Next: About the dog" }).click();

  // Step 2: a photo is required, then resized in the browser.
  await expect(page).toHaveURL(/\/list\/dog$/);
  await page.getByLabel("Dog's name").fill(DOG);
  await page.getByRole("button", { name: "Next: Health & story" }).click();
  await expect(page.getByText("Add at least one photo of the dog.")).toBeVisible();
  await page
    .locator('input[type="file"]')
    .setInputFiles({ name: "dog.jpg", mimeType: "image/jpeg", buffer: await photo() });
  await expect(page.getByRole("img", { name: "Photo 1" })).toBeVisible();
  await page.getByText("Medium", { exact: true }).click();
  await shot(page, "list-dog-390");
  await page.getByRole("button", { name: "Next: Health & story" }).click();

  // Step 3 + 4
  await expect(page).toHaveURL(/\/list\/health$/);
  await page.getByRole("button", { name: "Next: Home & routine" }).click();
  await expect(page).toHaveURL(/\/list\/home$/);
  await page.getByRole("button", { name: "Next: Last details" }).click();
  await expect(page.getByText("Choose the area").last()).toBeVisible();
  await page.getByLabel("Area").selectOption("Bandra");
  await page.getByLabel("Years").fill("2");
  await page.getByRole("button", { name: "Next: Last details" }).click();

  // Step 5: consent (unticked by default) + Turnstile, then send.
  await expect(page).toHaveURL(/\/list\/details$/);
  const consent = page.getByRole("checkbox", { name: /I can rehome this dog/ });
  await expect(consent).not.toBeChecked();
  await page.getByRole("button", { name: "Send for review" }).click();
  await expect(page.getByText("Please confirm to send the listing")).toBeVisible();
  await consent.check();
  await expect(page.locator('input[name="cf-turnstile-response"]')).toHaveValue(/.+/, { timeout: 20_000 });
  await shot(page, "list-details-390");
  await page.getByRole("button", { name: "Send for review" }).click();

  await expect(page).toHaveURL(/\/list\/submitted$/, { timeout: 30_000 });
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(`Thanks! ${DOG}’s listing is with our team.`);
  await shot(page, "list-submitted-390");

  // In the DB: pending, phone in E.164, one photo row, three files in the private bucket only.
  const dogs = (await (
    await fetch(
      `${url}/rest/v1/dogs?name=eq.${encodeURIComponent(DOG)}&select=id,status,size,age_months,locality,listers(phone,relationship),dog_photos(path_480,width)`,
      { headers: h },
    )
  ).json()) as {
    id: string;
    status: string;
    size: string;
    age_months: number;
    locality: string;
    listers: { phone: string; relationship: string };
    dog_photos: { path_480: string; width: number }[];
  }[];
  expect(dogs).toHaveLength(1);
  const d = dogs[0]!;
  expect(d).toMatchObject({ status: "pending", size: "medium", age_months: 24, locality: "Bandra" });
  expect(d.listers).toEqual({ phone: "+919820012345", relationship: "rescuer" });
  expect(d.dog_photos).toHaveLength(1);
  expect(d.dog_photos[0]!.width).toBe(1600);
  const objs = (await (
    await fetch(`${url}/storage/v1/object/list/listing-uploads`, {
      method: "POST",
      headers: h,
      body: JSON.stringify({ prefix: d.id }),
    })
  ).json()) as { name: string }[];
  expect(objs).toHaveLength(3);
  // The stored 480px file is re-encoded: no EXIF marker survives, and it is 480px wide.
  const file = Buffer.from(
    await (
      await fetch(`${url}/storage/v1/object/authenticated/listing-uploads/${d.dog_photos[0]!.path_480}`, { headers: h })
    ).arrayBuffer(),
  );
  expect(file.includes("e2e-exif-marker")).toBe(false);
  expect((await sharp(file).metadata()).width).toBe(480);
  expect((await fetch(`${url}/storage/v1/object/public/listing-uploads/${d.dog_photos[0]!.path_480}`)).ok).toBe(false);
  const pub = await (await fetch(`${url}/rest/v1/rpc/public_dogs?id=eq.${d.id}&select=id`, { headers: h })).json();
  expect(pub).toEqual([]);
});

test("listing answers survive a refresh (sessionStorage), consent does not", async ({ page }) => {
  await page.goto("/list/you");
  await page.getByLabel("Your name").fill("Refresh Test");
  await page.reload();
  await expect(page.getByLabel("Your name")).toHaveValue("Refresh Test");
  await page.goto("/list/details");
  await expect(page.getByRole("checkbox", { name: /I can rehome this dog/ })).not.toBeChecked();
});

const WIDTHS = [360, 768, 1440] as const;
for (const width of WIDTHS) {
  test(`listing step at ${width}px: no horizontal scroll, screenshot`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/list/dog");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    await shot(page, `list-dog-${width}`);
  });
}

test("listing step targets are at least 44px", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  for (const step of ["you", "dog", "home", "details"]) {
    await page.goto(`/list/${step}`);
    const small = await page.$$eval(
      "a, button, select, input:not([type=radio]):not([type=checkbox]):not([type=file]), label:has(input[type=radio])",
      (els) =>
        els
          // Inline links inside a sentence are exempt (WCAG 2.5.8).
          .filter((el) => (el as HTMLElement).offsetParent !== null && !el.matches("label a, p a"))
          .map((el) => ({
            text: el.textContent?.trim() || el.getAttribute("aria-label") || el.id,
            box: el.getBoundingClientRect(),
          }))
          .filter(({ box }) => box.height < 44 || box.width < 44)
          .map(({ text }) => text),
    );
    expect(small, step).toEqual([]);
  }
});
