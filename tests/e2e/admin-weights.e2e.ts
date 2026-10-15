import { expect, test } from "@playwright/test";
import {
  captureAction,
  deleteUsers,
  devReady,
  makeUser,
  noOverflow,
  replayWithoutAal2,
  sb,
  signInWithMfa,
  smallTargets,
} from "./admin-helpers";

// Weights editor and hard-constraint switches (scope #7: weights editable by admin). Changes the
// shared config, so it runs in its own Playwright project after every other suite, and puts the
// defaults back before and after. awdopt-dev only.
test.describe.configure({ mode: "serial" });
test.skip(!devReady, "needs .env.local (dev)");

const DEFAULTS = {
  lifestyle: 25,
  living: 20,
  time: 15,
  household: 10,
  experience: 10,
  size: 10,
  age: 5,
  special_needs: 5,
};
const ONE = "00000000-0000-4000-c000-000000000001"; // seeded fake adopter: 4 h alone
let admin: { email: string; password: string };
let adminNoMfa: { email: string; password: string };

async function restoreDefaults() {
  await sb("/rest/v1/match_weights", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates" },
    body: JSON.stringify(Object.entries(DEFAULTS).map(([category, weight]) => ({ category, weight }))),
  });
  await sb("/rest/v1/hard_constraints?key=not.is.null", { method: "PATCH", body: '{"enabled":true}' });
}
const weights = async () =>
  Object.fromEntries(
    (await sb<{ category: string; weight: number }[]>("/rest/v1/match_weights?select=category,weight")).map((w) => [
      w.category,
      w.weight,
    ]),
  );
const ranking = () =>
  sb<{ dog_id: string; rank: number | null; score: number | null; excluded_by: string[] }[]>(
    "/rest/v1/rpc/score_dogs_for_adopter",
    { method: "POST", body: JSON.stringify({ p_adopter_id: ONE }) },
  );

test.beforeAll(async () => {
  await restoreDefaults();
  [admin, adminNoMfa] = await Promise.all([makeUser({ role: "admin" }), makeUser({ role: "admin" })]);
});
test.afterAll(async () => {
  await restoreDefaults();
  await deleteUsers();
});

test("signed out: the weights page goes to the login and never renders", async ({ page }) => {
  await page.goto("/admin/weights");
  await expect(page).toHaveURL(/\/admin\/login$/);
  const r = await page.request.get("/admin/weights", { headers: { purpose: "prefetch" }, maxRedirects: 0 });
  expect(await r.text()).not.toMatch(/Hard constraints|Save weights/);
});

test("admin: edit weights (re-ranks), refuse all zero, switch a constraint off", async ({ browser, page, baseURL }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1280, height: 860 });
  await signInWithMfa(page, admin);
  await page.getByRole("navigation", { name: "Admin" }).getByRole("link", { name: "Match weights" }).click();
  await expect(page).toHaveURL(/\/admin\/weights$/);
  await expect(page.getByRole("spinbutton", { name: /^Lifestyle \/ activity/ })).toHaveValue("25");
  await expect(page.getByText("25%", { exact: true })).toHaveCount(1); // lifestyle's share
  await page.screenshot({ path: "docs/private/reviews/M4/admin-weights-1280.png", fullPage: true });

  // Replayed without an aal2 admin, a save changes nothing.
  await page.getByRole("spinbutton", { name: /^Size preference/ }).fill("90");
  const post = await captureAction(page, () =>
    page.getByRole("button", { name: "Save weights and constraints" }).click(),
  );
  console.log(
    "replayed weights without aal2:",
    (await replayWithoutAal2(browser, baseURL!, post, adminNoMfa)).join(", "),
  );
  expect(await weights()).toEqual(DEFAULTS);

  // All zero is refused (the form allows 0 per field; the set is checked on save).
  await page.goto("/admin/weights");
  for (const label of [
    /^Lifestyle/,
    /^Living/,
    /^Time/,
    /^Children/,
    /^Dog experience/,
    /^Size/,
    /^Age/,
    /^Special-needs/,
  ])
    await page.getByRole("spinbutton", { name: label }).fill("0");
  await page.getByRole("button", { name: "Save weights and constraints" }).click();
  await expect(page.getByText("At least one weight must be above 0. Nothing was saved.")).toBeVisible();
  expect(await weights()).toEqual(DEFAULTS);

  // A real change re-ranks the adopter: only size preference counts now.
  const before = await ranking();
  await page.goto("/admin/weights");
  for (const label of [/^Lifestyle/, /^Living/, /^Time/, /^Children/, /^Dog experience/, /^Age/, /^Special-needs/])
    await page.getByRole("spinbutton", { name: label }).fill("0");
  await page.getByRole("spinbutton", { name: /^Size preference/ }).fill("10");
  await page.getByRole("button", { name: "Save weights and constraints" }).click();
  await expect(page.getByText(/^Saved\./)).toBeVisible();
  await expect.poll(weights).toEqual({ ...Object.fromEntries(Object.keys(DEFAULTS).map((k) => [k, 0])), size: 10 });
  await expect(page.getByText("100%", { exact: true })).toHaveCount(1); // size is the only weight
  const after = await ranking();
  expect(after.map((r) => [r.dog_id, r.score])).not.toEqual(before.map((r) => [r.dog_id, r.score]));

  // Switching "alone time" off brings back a dog it excluded for this adopter (4 h alone).
  const aloneOnly = before.find((r) => r.excluded_by.length === 1 && r.excluded_by[0] === "alone_time");
  expect(aloneOnly, "seed has a dog excluded only by alone time").toBeTruthy();
  await page.getByLabel(/would be alone longer/).uncheck();
  await page.getByRole("button", { name: "Save weights and constraints" }).click();
  await expect(page.getByText(/^Saved\./)).toBeVisible();
  await expect
    .poll(async () => (await ranking()).find((r) => r.dog_id === aloneOnly!.dog_id)?.rank ?? null)
    .not.toBeNull();
  await expect(page.getByLabel(/would be alone longer/)).not.toBeChecked();
  await page.goto(`/admin/adopters/${ONE}`);
  const recs = page.getByRole("region", { name: "Current recommendations" });
  await expect(recs.getByText(/would be alone longer/)).toHaveCount(0);

  // 390px: no page overflow, every control is 44px.
  await page.setViewportSize({ width: 390, height: 844 });
  const res = await page.goto("/admin/weights");
  expect(res?.headers()["x-robots-tag"]).toBe("noindex");
  expect(res?.headers()["cache-control"]).toContain("no-store");
  expect(await noOverflow(page)).toBeLessThanOrEqual(0);
  expect(await smallTargets(page)).toEqual([]);
  await page.screenshot({ path: "docs/private/reviews/M4/admin-weights-390.png", fullPage: true });
});
