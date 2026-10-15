import { randomBytes } from "node:crypto";
import { expect, test } from "@playwright/test";
import {
  captureAction,
  deleteListings,
  deleteUsers,
  devReady,
  dogStatus,
  makeUser,
  noOverflow,
  pendingListing,
  replayWithoutAal2,
  sb,
  signInWithMfa,
  smallTargets,
} from "./admin-helpers";

// Enquiries and outcome tracking (scope #12, #13): the 8 statuses, the reason field, the
// one-open-enquiry rule when reopening, and "Adopted" taking the dog off Find a Dog.
// awdopt-dev only: one fake dog, two fake adopters and their enquiries, all deleted afterwards.
test.describe.configure({ mode: "serial" });
test.skip(!devReady, "needs .env.local (dev)");

const PREFIX = "E2E Enquiry";
const PHONE = "+910000000301";
let dog: { id: string; slug: string };
let admin: { email: string; password: string };
let adminNoMfa: { email: string; password: string };

type Row = { status: string; reason: string | null };
const enquiry = async (name: string) =>
  (await sb<Row[]>(`/rest/v1/enquiries?name=eq.${encodeURIComponent(name)}&select=status,reason`))[0];

// Its own fake adopters, so the seeded ones (pinned by other suites) are never touched.
const deleteAdopters = () => sb(`/rest/v1/adopters?name=like.${encodeURIComponent(PREFIX)}*`, { method: "DELETE" });
const adopter = async (name: string) =>
  (
    await sb<{ id: string }[]>("/rest/v1/adopters", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        name,
        age: 30,
        city: "Mumbai",
        phone: PHONE,
        home_type: "independent_house",
        household: "family",
        has_children_under_12: false,
        has_dogs: false,
        has_cats: false,
        activity_level: "medium",
        hours_alone: 2,
        daily_time: "2_to_4h",
        experience: "some",
        open_to_special_needs: true,
        open_to_senior: true,
        timeline: "asap",
        results_token_hash: `\\x${randomBytes(32).toString("hex")}`,
        token_expires_at: new Date(Date.now() + 86_400_000).toISOString(),
        consent_at: new Date().toISOString(),
      }),
    })
  )[0]!.id;

test.beforeAll(async () => {
  await Promise.all([deleteListings(PREFIX), deleteAdopters()]); // enquiries go with either (cascade)
  const { id } = await pendingListing(`${PREFIX} Dog`);
  const approved = await sb<{ slug: string }[]>(`/rest/v1/dogs?id=eq.${id}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ status: "approved", approved_at: new Date().toISOString() }),
  });
  dog = { id, slug: approved[0]!.slug };
  const base = {
    dog_id: id,
    phone: PHONE,
    email: null,
    score: 81.4,
    confidence: 0.9,
    category_scores: { lifestyle: 1 },
    weights: { lifestyle: 25 },
    consent_at: new Date().toISOString(),
  };
  // Same phone, same dog: one open, one closed.
  await sb("/rest/v1/enquiries", {
    method: "POST",
    body: JSON.stringify([
      {
        ...base,
        adopter_id: await adopter(`${PREFIX} Adopter A`),
        name: "E2E Enquirer Open",
        message: "Fake: can we meet on Sunday?",
        status: "interested",
      },
      {
        ...base,
        adopter_id: await adopter(`${PREFIX} Adopter B`),
        name: "E2E Enquirer Closed",
        message: null,
        status: "rejected",
      },
    ]),
  });
  [admin, adminNoMfa] = await Promise.all([makeUser({ role: "admin" }), makeUser({ role: "admin" })]);
});

test.afterAll(async () => {
  await Promise.all([deleteListings(PREFIX), deleteAdopters()]);
  await deleteUsers();
});

test("signed out: the enquiries page goes to the login and never renders", async ({ page }) => {
  await page.goto("/admin/enquiries");
  await expect(page).toHaveURL(/\/admin\/login$/);
  const r = await page.request.get("/admin/enquiries", { headers: { purpose: "prefetch" }, maxRedirects: 0 });
  expect(await r.text()).not.toMatch(/E2E Enquirer|\+910000000301/);
});

test("admin: 8 statuses, reason, reopen refused, Adopted takes the dog off Find a Dog", async ({
  browser,
  page,
  baseURL,
}) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1280, height: 860 });
  await signInWithMfa(page, admin);

  // Recent enquiries on the overview, then the full table.
  await expect(page.getByRole("region", { name: "Recent enquiries" }).getByText("E2E Enquirer Open")).toBeVisible();
  await page.getByRole("navigation", { name: "Admin" }).getByRole("link", { name: "Enquiries" }).click();
  await expect(page).toHaveURL(/\/admin\/enquiries$/);
  const table = page.getByRole("region", { name: "All enquiries" });
  const open = table.getByRole("row", { name: /E2E Enquirer Open/ });
  await expect(open).toContainText("81%");
  await expect(open).toContainText("Fake: can we meet on Sunday?");
  await expect(open).toContainText(PHONE);
  const status = page.getByRole("combobox", { name: "Status for E2E Enquirer Open" });
  expect(await status.locator("option").allTextContents()).toEqual([
    "Interested",
    "Contacted",
    "Meeting",
    "Rejected",
    "Adoption in progress",
    "Adopted",
    "Adoption unsuccessful",
    "Follow-up required",
  ]);
  await page.screenshot({ path: "docs/private/reviews/M4/admin-enquiries-1280.png", fullPage: true });

  // Replayed without an aal2 admin, the status change does nothing.
  await status.selectOption("meeting");
  const post = await captureAction(page, () =>
    page.getByRole("button", { name: "Save status for E2E Enquirer Open" }).click(),
  );
  console.log(
    "replayed status without aal2:",
    (await replayWithoutAal2(browser, baseURL!, post, adminNoMfa)).join(", "),
  );
  await expect.poll(async () => (await enquiry("E2E Enquirer Open"))?.status).toBe("interested");

  // For real: Meeting.
  await page.goto("/admin/enquiries");
  await page.getByRole("combobox", { name: "Status for E2E Enquirer Open" }).selectOption("meeting");
  await page.getByRole("button", { name: "Save status for E2E Enquirer Open" }).click();
  await expect(page.getByText("Status saved.")).toBeVisible();
  await expect.poll(() => enquiry("E2E Enquirer Open")).toEqual({ status: "meeting", reason: null });
  await expect(page.getByRole("combobox", { name: "Status for E2E Enquirer Open" })).toHaveValue("meeting");

  // Reopening the closed one while the same phone has an open enquiry for this dog is refused.
  await page.getByRole("combobox", { name: "Status for E2E Enquirer Closed" }).selectOption("contacted");
  await page.getByRole("button", { name: "Save status for E2E Enquirer Closed" }).click();
  await expect(page.getByText(/already has an open enquiry/)).toBeVisible();
  await expect.poll(async () => (await enquiry("E2E Enquirer Closed"))?.status).toBe("rejected");

  // Unsuccessful, with a reason.
  await page.getByRole("combobox", { name: "Status for E2E Enquirer Open" }).selectOption("adoption_unsuccessful");
  await page.getByRole("textbox", { name: "Reason for E2E Enquirer Open" }).fill("Landlord does not allow pets");
  await page.getByRole("button", { name: "Save status for E2E Enquirer Open" }).click();
  await expect(page.getByText("Status saved.")).toBeVisible();
  await expect
    .poll(() => enquiry("E2E Enquirer Open"))
    .toEqual({
      status: "adoption_unsuccessful",
      reason: "Landlord does not allow pets",
    });
  await expect(page.getByRole("textbox", { name: "Reason for E2E Enquirer Open" })).toHaveValue(
    "Landlord does not allow pets",
  );

  // Adopted (the other one, now nothing is open): the dog is marked adopted and leaves Find a Dog.
  await page.getByRole("combobox", { name: "Status for E2E Enquirer Closed" }).selectOption("adopted");
  await page.getByRole("button", { name: "Save status for E2E Enquirer Closed" }).click();
  await expect(page.getByText("Status saved.")).toBeVisible();
  await expect.poll(async () => (await enquiry("E2E Enquirer Closed"))?.status).toBe("adopted");
  await expect.poll(() => dogStatus(dog.id)).toBe("adopted");
  await expect(table.getByRole("row", { name: /E2E Enquirer Closed/ })).toContainText("Adopted");
  await page.goto(`/dogs/${dog.slug}`);
  await expect(page.getByRole("heading", { level: 1, name: new RegExp(PREFIX) })).toHaveCount(0);

  // 390px: the table scrolls inside its card, the page doesn't; controls are 44px.
  await page.setViewportSize({ width: 390, height: 844 });
  for (const [path, name] of [
    ["/admin/enquiries", "admin-enquiries-390"],
    ["/admin", "admin-overview-enquiries-390"],
  ] as const) {
    const res = await page.goto(path);
    expect(res?.headers()["x-robots-tag"], path).toBe("noindex");
    expect(res?.headers()["cache-control"], path).toContain("no-store");
    expect(await noOverflow(page), path).toBeLessThanOrEqual(0);
    expect(await smallTargets(page), path).toEqual([]);
    await page.screenshot({ path: `docs/private/reviews/M4/${name}.png`, fullPage: true });
  }
});
