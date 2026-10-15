import { randomBytes } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";

// Questionnaire → matching screen → private results link, against awdopt-dev with Cloudflare's
// always-pass Turnstile test keys (playwright.config.ts). Scores the 6 seeded fake dogs.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const key = process.env.SUPABASE_SECRET_KEY ?? "";
const h = { apikey: key, "Content-Type": "application/json" };
const PHONE = "70000 00042"; // fake, but a valid Indian mobile format
const E164 = "+917000000042";

test.skip(!key || new URL(url || "http://x").host !== "bdrkuwznuuklrryxddba.supabase.co", "needs .env.local (dev)");

const cleanup = () =>
  fetch(`${url}/rest/v1/adopters?phone=eq.${encodeURIComponent(E164)}`, { method: "DELETE", headers: h });
test.beforeAll(cleanup);
test.afterAll(cleanup);

async function shot(page: Page, name: string) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => [...document.images].every((img) => img.complete));
  await page.screenshot({ path: `docs/private/reviews/M3/${name}.png`, fullPage: true });
}
const group = (page: Page, name: string) => page.getByRole("group", { name });

/** Buttons, links and option labels under 44px (DESIGN.md §6). Links inside a sentence are exempt. */
const smallTargets = (page: Page) =>
  page.$$eval("a, button, label:has(input.sr-only)", (els) =>
    els
      .filter((el) => (el as HTMLElement).offsetParent !== null && !el.parentElement?.closest("p, label"))
      .map((el) => ({ text: el.textContent?.trim() || el.getAttribute("aria-label"), box: el.getBoundingClientRect() }))
      .filter(({ box }) => box.height < 44 || box.width < 44)
      .map(({ text }) => text),
  );

test("questionnaire: 5 steps, progress kept on refresh, 18+, consent, results link", async ({ page }) => {
  test.setTimeout(90_000);
  const violations: string[] = [];
  page.on("console", (m) => /Content Security Policy/i.test(m.text()) && violations.push(m.text()));
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto("/match");
  await expect(page).toHaveURL(/\/match\/basic$/);
  await expect(page.getByText("Step 1 of 5 · About you")).toBeVisible();

  // About you: required fields and 18+ block Next.
  await page.getByRole("button", { name: "Next: Your home" }).click();
  await expect(page.getByText("Enter your name")).toBeVisible();
  await page.getByLabel("What's your name?").fill("E2E Adopter");
  await page.getByLabel("How old are you?").fill("17");
  await page.getByLabel("Which city do you live in?").fill("Mumbai");
  await page.getByLabel("Phone / WhatsApp number").fill(PHONE);
  await page.getByRole("button", { name: "Next: Your home" }).click();
  await expect(page.getByText("You need to be 18 or older to adopt")).toBeVisible();
  await shot(page, "quiz-basic-errors-390");
  await page.getByLabel("How old are you?").fill("30");
  await page.getByRole("button", { name: "Next: Your home" }).click();

  // Your home, then a refresh: answers come back from sessionStorage.
  await expect(page).toHaveURL(/\/match\/home$/);
  await group(page, "What kind of home do you live in?").getByText("Apartment with balcony").click();
  await group(page, "Who do you live with?").getByText("Partner").click();
  await group(page, "Any children under 12 at home?").getByText("No").click();
  await group(page, "Any dogs at home?").getByText("No").click();
  await group(page, "Any cats at home?").getByText("No").click();
  await page.reload();
  await expect(group(page, "Who do you live with?").getByRole("radio", { name: "Partner" })).toBeChecked();
  await shot(page, "quiz-home-390");
  await page.getByRole("button", { name: "Next: Your days" }).click();

  await group(page, "How active are you?").getByText("High").click();
  await page.getByLabel("On a normal day, how many hours would the dog be alone?").fill("3");
  await group(page, "How much time can you give the dog each day?").getByText("2–4 hrs").click();
  await group(page, "Have you had a dog before?").getByText("Some experience").click();
  await shot(page, "quiz-lifestyle-390");
  await page.getByRole("button", { name: "Next: What you're looking for" }).click();

  // Preferences can be skipped; pick one size to show multi-pick chips.
  await group(page, "Size").getByText("Medium").click();
  await group(page, "Open to a dog with special needs?").getByText("No").click();
  await group(page, "Open to a senior dog?").getByText("Yes").click();
  await shot(page, "quiz-preferences-390");
  await page.getByRole("button", { name: "Next: Why adopt" }).click();

  await group(page, "When are you hoping to adopt?").getByText("Within a month").click();
  await page.getByRole("button", { name: "Find My Matches" }).click();
  await expect(page.getByText("Please confirm to see your matches")).toBeVisible();
  await expect(page.getByRole("checkbox", { name: /I agree to AWDOPT storing/ })).not.toBeChecked();
  await page.getByRole("checkbox", { name: /I agree to AWDOPT storing/ }).check();
  await expect(page.locator('input[name="cf-turnstile-response"]')).toHaveValue(/.+/, { timeout: 20_000 });
  await shot(page, "quiz-intent-390");
  await page.getByRole("button", { name: "Find My Matches" }).click();

  // Matching screen, then the private link.
  await expect(page.getByText("sniffing out")).toBeVisible();
  await expect(page.getByRole("status").getByText("Special-needs fit")).toBeVisible();
  await page.waitForTimeout(1000); // the 8 ticks land 120ms apart
  await page.screenshot({ path: "docs/private/reviews/M3/matching-390.png" });
  await expect(page).toHaveURL(/\/r\/[A-Za-z0-9_-]{43}$/, { timeout: 20_000 });
  await expect(page.getByRole("heading", { level: 1, name: "Your top matches" })).toBeVisible();
  expect(await smallTargets(page), "results").toEqual([]);

  // Seeded dogs ranked best first, each with a score; Pepper and Rocket (2 h alone at most) and
  // Tofu (needs a large space) are left out, with a line saying why.
  const rows = page.getByRole("main").getByRole("listitem");
  expect(await rows.count()).toBeGreaterThanOrEqual(3);
  await expect(rows.first()).toContainText(/#1/);
  await expect(rows.first()).toContainText(/\d+%/);
  await expect(page.getByText(/shown because/).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Retake the quiz" })).toHaveAttribute("href", "/match/basic");

  // Answers are gone from the tab; name and number stay for the enquiry prefill.
  const storage = await page.evaluate(() => [
    sessionStorage.getItem("awdopt-match"),
    sessionStorage.getItem("awdopt-contact"),
  ]);
  expect(storage[0]).toBeNull();
  expect(JSON.parse(storage[1]!)).toEqual({ name: "E2E Adopter", phone: PHONE, email: "" });

  // The page never shows contact details; the share link is this page.
  const link = page.url();
  await expect(page.getByText("E2E Adopter")).toHaveCount(0);
  await expect(page.getByText(PHONE)).toHaveCount(0);
  await expect(page.getByRole("link", { name: "WhatsApp" })).toHaveAttribute(
    "href",
    `https://wa.me/?text=${encodeURIComponent(`My AWDOPT matches: ${link}`)}`,
  );
  await shot(page, "results-390");
  for (const [w, hgt] of [
    [360, 800],
    [768, 1024],
    [1440, 900],
  ] as const) {
    await page.setViewportSize({ width: w, height: hgt });
    await shot(page, `results-${w}`);
  }

  // Match detail: all 8 bars, explanations, and empty bars named for what they are.
  await page.setViewportSize({ width: 390, height: 844 });
  await rows.first().getByRole("link").click();
  await expect(page).toHaveURL(/\/r\/[A-Za-z0-9_-]{43}\/sample-[a-z]+$/);
  const bars = page.getByRole("region", { name: "Score by category" });
  for (const label of [
    "Lifestyle / activity",
    "Living situation",
    "Time availability",
    "Children / other pets",
    "Dog experience",
    "Size preference",
    "Age preference",
    "Special-needs fit",
  ])
    await expect(bars.getByText(label)).toBeVisible();
  await expect(bars.getByText("Doesn't apply")).toBeVisible(); // no kids or pets at home
  await expect(bars.getByText("No preference")).toBeVisible(); // age preference skipped
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/fit|look/);
  await expect(page.getByRole("heading", { name: "Why this could work" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Things to consider" })).toBeVisible();
  await expect(page.getByRole("link", { name: /I.m Interested/ })).toHaveAttribute("href", /\/interested$/);
  await expect(page.getByRole("link", { name: "Back to your matches" })).toHaveAttribute(
    "href",
    new URL(link).pathname,
  );
  expect(await smallTargets(page), "detail").toEqual([]);
  for (const [w, hgt] of [
    [390, 844],
    [360, 800],
    [768, 1024],
    [1440, 900],
  ] as const) {
    await page.setViewportSize({ width: w, height: hgt });
    await shot(page, `detail-${w}`);
  }

  // Profile from results: score sticker and "I'm Interested" instead of "See if we match".
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("link", { name: /full profile/ }).click();
  await expect(page).toHaveURL(/\/profile$/);
  await expect(page.getByText(/^\d+% match, /)).toHaveCount(1); // the score sticker
  await expect(page.getByRole("link", { name: /I.m Interested/ })).toHaveAttribute("href", /\/interested$/);
  await expect(page.getByRole("link", { name: "See if we match" })).toHaveCount(0);
  await shot(page, "profile-from-results-390");
  await page.setViewportSize({ width: 1440, height: 900 });
  await shot(page, "profile-from-results-1440");

  // I'm Interested: prefilled from this tab's answers, unticked consent, Turnstile, then sent.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("link", { name: /I.m Interested/ }).click();
  await expect(page).toHaveURL(/\/interested$/);
  await expect(page.getByText("We filled this in from your answers.")).toBeVisible();
  await expect(page.getByLabel("Your name")).toHaveValue("E2E Adopter");
  await expect(page.getByLabel("Phone / WhatsApp")).toHaveValue(PHONE);
  expect(await smallTargets(page), "interested").toEqual([]);
  await page.getByRole("button", { name: "Send my interest" }).click();
  await expect(page.getByText("Please confirm so the team can contact you")).toBeVisible();
  await page.getByLabel("Message").fill("E2E test message");
  await page.getByRole("checkbox", { name: /I agree to AWDOPT using these details/ }).check();
  await expect(page.locator('input[name="cf-turnstile-response"]')).toHaveValue(/.+/, { timeout: 20_000 });
  for (const [w, hgt] of [
    [390, 844],
    [360, 800],
    [768, 1024],
    [1440, 900],
  ] as const) {
    await page.setViewportSize({ width: w, height: hgt });
    await shot(page, `interested-${w}`);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Send my interest" }).click();
  await expect(page.getByRole("heading", { name: "interest sent!" })).toBeVisible();
  await expect(page.getByText("Your private matches link")).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to my matches" })).toHaveAttribute("href", new URL(link).pathname);
  await shot(page, "sent-390");
  await page.setViewportSize({ width: 1440, height: 900 });
  await shot(page, "sent-1440");
  expect(violations).toEqual([]);

  // Stored for the admin with a score snapshot; a second open enquiry for the same dog is refused.
  const [adopter] = (await (
    await fetch(`${url}/rest/v1/adopters?phone=eq.${encodeURIComponent(E164)}&select=id`, { headers: h })
  ).json()) as { id: string }[];
  const enquiries = (await (
    await fetch(
      `${url}/rest/v1/enquiries?adopter_id=eq.${adopter!.id}&select=phone,message,status,score,weights,dogs(slug)`,
      { headers: h },
    )
  ).json()) as {
    phone: string;
    message: string;
    status: string;
    score: number;
    weights: object;
    dogs: { slug: string };
  }[];
  expect(enquiries).toHaveLength(1);
  expect(enquiries[0]).toMatchObject({ phone: E164, message: "E2E test message", status: "interested" });
  expect(enquiries[0]!.score).toBeGreaterThan(0);
  expect(Object.keys(enquiries[0]!.weights)).toHaveLength(8);

  await page.goto(`${new URL(link).pathname}/${enquiries[0]!.dogs.slug}/interested`);
  await page.getByRole("checkbox", { name: /I agree to AWDOPT using these details/ }).check();
  await expect(page.locator('input[name="cf-turnstile-response"]')).toHaveValue(/.+/, { timeout: 20_000 });
  await page.getByRole("button", { name: "Send my interest" }).click();
  await expect(page.getByText("You've already told us you're interested in this dog.")).toBeVisible();

  // A new tab has nothing to prefill from: the link never reveals contact details.
  const fresh = await page.context().newPage();
  await fresh.goto(`${new URL(link).pathname}/${enquiries[0]!.dogs.slug}/interested`);
  await expect(fresh.getByLabel("Your name")).toHaveValue("");
  await expect(fresh.getByText("We filled this in from your answers.")).toHaveCount(0);
  await fresh.close();

  // A dog this adopter can't be matched with isn't reachable through the link.
  for (const path of ["/sample-tofu", "/sample-tofu/profile", "/sample-tofu/interested", "/no-such-dog"])
    expect((await page.request.get(link + path)).status()).toBe(404);

  // Stored once, with a 90-day link and the E.164 number.
  const rowsDb = (await (
    await fetch(`${url}/rest/v1/adopters?phone=eq.${encodeURIComponent(E164)}&select=age,token_expires_at`, {
      headers: h,
    })
  ).json()) as { age: number; token_expires_at: string }[];
  expect(rowsDb).toHaveLength(1);
  expect(rowsDb[0]!.age).toBe(30);
});

test("results links are private: headers, wrong and malformed tokens", async ({ page, request }) => {
  const wrong = `/r/${randomBytes(32).toString("base64url")}`;
  for (const path of [
    wrong,
    "/r/not-a-token",
    `${wrong}/sample-biscuit`,
    `${wrong}/sample-biscuit/profile`,
    `${wrong}/sample-biscuit/interested`,
  ]) {
    const res = await request.get(path);
    expect(res.status()).toBe(404);
    const hd = res.headers();
    expect(hd["referrer-policy"]).toBe("no-referrer");
    expect(hd["cache-control"]).toContain("no-store");
    expect(hd["x-robots-tag"]).toBe("noindex");
  }
  await page.goto(wrong);
  await expect(page.getByRole("heading", { name: "This link doesn't work" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Take the quiz again" })).toHaveAttribute("href", "/match/basic");
});

test("questionnaire: every target is at least 44px at 360", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  for (const step of ["basic", "home", "lifestyle", "preferences", "intent"]) {
    await page.goto(`/match/${step}`);
    expect(await smallTargets(page), step).toEqual([]);
  }
});

test("questionnaire steps at 360, 768 and 1440", async ({ page }) => {
  for (const [w, hgt] of [
    [360, 800],
    [768, 1024],
    [1440, 900],
  ] as const) {
    await page.setViewportSize({ width: w, height: hgt });
    await page.goto("/match/lifestyle");
    await expect(page.getByText("Step 3 of 5 · Your days")).toBeVisible();
    await shot(page, `quiz-lifestyle-${w}`);
  }
});
