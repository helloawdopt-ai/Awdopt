import { expect, test } from "@playwright/test";
import { checkAdminPage, deleteUsers, devReady, makeUser, sb, signInWithMfa } from "./admin-helpers";

// Admin adopter view (scope #12): answers, contact, enquiries and the current ranking, which must
// be exactly what score_dogs_for_adopter returns. Read-only: uses the two seeded fake adopters.
test.skip(!devReady, "needs .env.local (dev)");

const ONE = "00000000-0000-4000-c000-000000000001";
const TWO = "00000000-0000-4000-c000-000000000002";
let admin: { email: string; password: string };

test.beforeAll(async () => {
  admin = await makeUser({ role: "admin" });
});
test.afterAll(deleteUsers);

test("signed out: adopter pages go to the login and never render", async ({ page }) => {
  for (const path of ["/admin/adopters", `/admin/adopters/${ONE}`]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/admin\/login$/);
    const r = await page.request.get(path, { headers: { purpose: "prefetch" }, maxRedirects: 0 });
    expect(await r.text(), path).not.toMatch(/Sample Adopter|\+910000000101/);
  }
});

test("admin: adopters list, answers, contact, enquiries and current recommendations", async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1280, height: 860 });
  await signInWithMfa(page, admin);

  await page.getByRole("navigation", { name: "Admin" }).getByRole("link", { name: "Adopters" }).click();
  const table = page.getByRole("region", { name: "All adopters" });
  await expect(table.getByRole("row", { name: /Sample Adopter One .*Until/ })).toBeVisible();
  await expect(table.getByRole("row", { name: /Sample Adopter Two .*Expired/ })).toBeVisible();
  await page.screenshot({ path: "screenshots/M4/admin-adopters-1280.png", fullPage: true });

  await table.getByRole("link", { name: "Sample Adopter One" }).click();
  await expect(page).toHaveURL(new RegExp(`/admin/adopters/${ONE}$`));
  await expect(page.getByRole("heading", { level: 1, name: "Sample Adopter One" })).toBeVisible();
  await expect(page.getByText("+910000000101")).toBeVisible();
  for (const answer of ["Apartment with balcony", "4 hrs", "Young, Adult", "Zoomies, Balanced", "Within a month"])
    await expect(page.getByText(answer, { exact: true })).toBeVisible();
  const enquiries = page.getByRole("region", { name: "Enquiries from this adopter" });
  await expect(enquiries.getByRole("row", { name: /Sample Biscuit 89% Interested/ })).toBeVisible();

  // The ranking is the scoring function's, row for row (other suites may add dogs: re-read until stable).
  const recs = page.getByRole("region", { name: "Current recommendations" });
  await expect(async () => {
    await page.reload();
    const [rows, names] = await Promise.all([
      sb<{ dog_id: string; rank: number | null; score: number | null }[]>("/rest/v1/rpc/score_dogs_for_adopter", {
        method: "POST",
        body: JSON.stringify({ p_adopter_id: ONE }),
      }),
      sb<{ id: string; name: string }[]>("/rest/v1/dogs?status=eq.approved&select=id,name"),
    ]);
    const name = new Map(names.map((d) => [d.id, d.name]));
    const expected = rows
      .filter((r) => r.rank !== null)
      .map((r) => `#${r.rank} ${name.get(r.dog_id)} ${Math.round(r.score!)}%`);
    const shown = await recs
      .locator("tbody tr")
      .filter({ hasText: /^#/ })
      .evaluateAll((trs) =>
        trs.map((tr) =>
          [...tr.querySelectorAll("td")]
            .slice(0, 3)
            .map((td) => td.textContent?.trim())
            .join(" "),
        ),
      );
    expect(expected.length).toBeGreaterThan(0);
    expect(shown).toEqual(expected);
    expect(await recs.getByText("Left out").count()).toBe(rows.filter((r) => r.rank === null).length);
  }).toPass({ timeout: 20_000 });
  await expect(recs.getByText(/would be alone longer|large space/).first()).toBeVisible();
  await page.screenshot({ path: "screenshots/M4/admin-adopter-1280.png", fullPage: true });

  // The results-link hash never reaches the page.
  const html = await page.content();
  expect(html).not.toMatch(/results_token|token_hash|\\x[0-9a-f]{64}/);

  // Adopter Two: kids and a dog at home, expired link, no enquiries.
  await page.goto(`/admin/adopters/${TWO}`);
  await expect(page.getByText(/Results link: Expired/)).toBeVisible();
  await expect(page.getByText("No enquiries yet.")).toBeVisible();

  // 360–1440: headers, no page overflow, 44px controls on phones and tablets, screenshots.
  await checkAdminPage(page, "/admin/adopters", "admin-adopters");
  await checkAdminPage(page, `/admin/adopters/${ONE}`, "admin-adopter");
});
