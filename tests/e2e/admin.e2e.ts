import { expect, request, test, type Request } from "@playwright/test";
import {
  deleteListings,
  deleteUsers,
  devReady,
  dogStatus,
  listObjects,
  makeUser,
  pendingListing,
  signIn,
  totp,
} from "./admin-helpers";

// Admin auth (password + TOTP/aal2), the approval queue, approve/reject, and the server actions'
// own checks (scope §10: admin actions fail without an aal2 admin session). awdopt-dev only.
test.describe.configure({ mode: "serial" });
test.skip(!devReady, "needs .env.local (dev)");

const PREFIX = "E2E Admin";
let approve: { id: string; paths: string[] };
let reject: { id: string; paths: string[] };
let fake: { id: string; paths: string[] };
let admin: { email: string; password: string };
let adminNoMfa: { email: string; password: string };
let notAdmin: { email: string; password: string };

test.beforeAll(async () => {
  await deleteListings(PREFIX);
  [approve, reject, fake] = await Promise.all([
    pendingListing(`${PREFIX} Approve`),
    pendingListing(`${PREFIX} Reject`),
    pendingListing(`${PREFIX} Fake`, true),
  ]);
  [admin, adminNoMfa, notAdmin] = await Promise.all([
    makeUser({ role: "admin" }),
    makeUser({ role: "admin" }),
    makeUser({}),
  ]);
});

test.afterAll(async () => {
  await deleteListings(PREFIX);
  await deleteUsers();
});

test("signed out: admin pages and /brand go to the login", async ({ page }) => {
  for (const path of ["/admin", `/admin/dogs/${approve.id}`, "/admin/mfa", "/brand"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/admin\/login$/);
  }
  // Prefetch-looking requests skip the proxy; the page's own requireAdmin() must still refuse.
  for (const path of ["/admin", `/admin/dogs/${approve.id}`, "/brand"]) {
    const r = await page.request.get(path, { headers: { purpose: "prefetch" }, maxRedirects: 0 });
    expect(await r.text(), path).not.toMatch(
      /Listings waiting for approval<\/h1>|Lister \(never public\)|Open filters/,
    );
  }
  const res = await page.goto("/admin/login");
  expect(res?.headers()["x-robots-tag"]).toBe("noindex");
  expect(res?.headers()["cache-control"]).toContain("no-store");
});

test("a non-admin account can't sign in", async ({ page }) => {
  await signIn(page, notAdmin);
  await expect(page).toHaveURL(/\/admin\/login\?error=1$/);
  await expect(page.getByText(/Email or password is wrong/)).toBeVisible();
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login$/);
});

test("an admin without the TOTP step stays on /admin/mfa", async ({ page }) => {
  await signIn(page, adminNoMfa);
  await expect(page).toHaveURL(/\/admin\/mfa$/);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/mfa$/);
  await page.goto("/brand");
  await expect(page).toHaveURL(/\/admin\/mfa$/);
});

test("admin: TOTP set-up, queue, magic-byte check, approve, reject", async ({ browser, page, baseURL }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1280, height: 860 });

  // First sign-in: a wrong code keeps the same QR; the right one gives aal2.
  await signIn(page, admin);
  await page.screenshot({ path: "docs/private/reviews/M2/admin-mfa-start-1280.png" });
  await page.getByRole("button", { name: "Set up authenticator app" }).click();
  const secret = (await page.getByTestId("totp-secret").textContent())!.trim();
  await page.getByLabel("6-digit code").fill(totp(secret, 5));
  await page.getByRole("button", { name: "Verify" }).click();
  await expect(page.getByText(/That code didn't work/)).toBeVisible();
  await expect(page.getByTestId("totp-secret")).toHaveText(secret);
  await page.getByLabel("6-digit code").fill(totp(secret));
  await page.getByRole("button", { name: "Verify" }).click();
  await expect(page).toHaveURL(/\/admin$/);

  const queue = page.getByRole("region", { name: "Listings waiting for approval" });
  for (const n of ["Approve", "Reject", "Fake"]) await expect(queue.getByText(`${PREFIX} ${n}`)).toBeVisible();
  await page.screenshot({ path: "docs/private/reviews/M2/admin-queue-1280.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  await page.screenshot({ path: "docs/private/reviews/M2/admin-queue-390.png", fullPage: true });
  await page.setViewportSize({ width: 1280, height: 860 });

  // Capture the real approve request, block it, and replay it without an aal2 admin session.
  let captured: Request | undefined;
  await page.route("**/admin", async (route) => {
    if (route.request().method() === "POST") {
      captured = route.request();
      return route.abort();
    }
    return route.continue();
  });
  await page.getByRole("button", { name: `Approve ${PREFIX} Approve` }).click();
  await expect.poll(() => captured).toBeTruthy();
  await page.unroute("**/admin");
  const statuses: string[] = [];
  const replay = async (ctx: Awaited<ReturnType<typeof request.newContext>>) => {
    const headers = Object.fromEntries(
      Object.entries(captured!.headers()).filter(([k]) => !["cookie", "content-length", "host"].includes(k)),
    );
    // The proxy skips prefetch-looking requests (its matcher), and anyone can send those headers.
    // That path reaches the action itself, so this checks requireAdmin(), not just the proxy.
    for (const extra of [{}, { purpose: "prefetch" }, { "next-router-prefetch": "1" }] as Record<string, string>[]) {
      const res = await ctx.post(captured!.url(), {
        headers: { ...headers, ...extra },
        data: captured!.postDataBuffer()!,
        maxRedirects: 0,
      });
      statuses.push(
        `${Object.keys(extra)[0] ?? "plain"} ${res.status()} ${res.headers()["x-action-redirect"] ?? res.headers()["location"] ?? ""}`,
      );
    }
  };
  const anon = await request.newContext({ baseURL });
  await replay(anon);
  await anon.dispose();
  const aal1 = await browser.newContext({ baseURL });
  const aal1Page = await aal1.newPage();
  await signIn(aal1Page, adminNoMfa);
  await expect(aal1Page).toHaveURL(/\/admin\/mfa$/);
  await replay(aal1.request);
  await aal1.close();
  console.log("replayed approve without aal2:", statuses.join(", "));
  expect(await dogStatus(approve.id)).toBe("pending");
  expect(await listObjects("dog-photos", approve.id)).toEqual([]);

  // Fake bytes with a WebP name are refused at approval.
  await page.goto(`/admin/dogs/${fake.id}`);
  await page.getByRole("button", { name: "Approve and publish" }).click();
  await expect(page.getByText(/aren't real images/)).toBeVisible();
  expect(await dogStatus(fake.id)).toBe("pending");

  // Review page: lister contact is shown to the admin only.
  await page.goto(`/admin/dogs/${approve.id}`);
  await expect(page.getByText("+910000000098")).toBeVisible();
  await expect(page.getByRole("img", { name: `Photo 1 of ${PREFIX} Approve` })).toBeVisible();
  await page.screenshot({ path: "docs/private/reviews/M2/admin-review-1280.png", fullPage: true });
  await page.getByRole("button", { name: "Approve and publish" }).click();
  await expect(page.getByText("Listing approved. It's live on Find a Dog.")).toBeVisible();
  expect(await dogStatus(approve.id)).toBe("approved");
  expect(await listObjects("listing-uploads", approve.id)).toEqual([]);
  expect(await listObjects("dog-photos", approve.id)).toHaveLength(3);

  // Live immediately (updateTag), with its photo served from the public bucket.
  await page.goto("/dogs?area=western");
  const card = page.getByRole("link", { name: new RegExp(`${PREFIX} Approve`) });
  await expect(card).toBeVisible();
  await card.click();
  const img = page.getByRole("img", { name: `Photo 1 of ${PREFIX} Approve` });
  await expect(img).toBeVisible();
  await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true);
  const file = await page.request.get((await img.getAttribute("src"))!);
  expect(file.status()).toBe(200);
  expect(file.headers()["content-type"]).toBe("image/webp");

  // Reject: two clicks, status removed, uploads deleted, never public.
  await page.goto(`/admin/dogs/${reject.id}`);
  await page.getByText("Reject…").click();
  await page.getByRole("button", { name: "Yes, reject this listing" }).click();
  await expect(page.getByText("Listing rejected and its photos deleted.")).toBeVisible();
  expect(await dogStatus(reject.id)).toBe("removed");
  expect(await listObjects("listing-uploads", reject.id)).toEqual([]);
  await page.goto("/dogs");
  await expect(page.getByText(`${PREFIX} Reject`)).toHaveCount(0);

  // Sign out ends the session.
  await page.goto("/admin");
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/admin\/login$/);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login$/);
});

test("login page screenshot at 390px", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/admin/login");
  await page.screenshot({ path: "docs/private/reviews/M2/admin-login-390.png" });
});
