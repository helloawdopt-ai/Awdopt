import { expect, test, type Page } from "@playwright/test";
import {
  captureAction,
  countRows,
  deleteListings,
  deleteUsers,
  devReady,
  dogStatus,
  listObjects,
  makeUser,
  noOverflow,
  pendingListing,
  replayWithoutAal2,
  sb,
  signInWithMfa,
  smallTargets,
} from "./admin-helpers";

// Admin dog management (scope #12): overview counts, all dogs, edit, mark adopted, remove.
// Every change must reach Find a Dog at once (updateTag), and every action must refuse a replay
// without an aal2 admin session. awdopt-dev only; creates and deletes its own fake listings.
test.describe.configure({ mode: "serial" });
test.skip(!devReady, "needs .env.local (dev)");

const PREFIX = "E2E Manage";
type Listing = { id: string; slug: string };
let edit: Listing, adopt: Listing, remove: Listing;
let admin: { email: string; password: string };
let adminNoMfa: { email: string; password: string };

const slugOf = async (id: string) => (await sb<{ slug: string }[]>(`/rest/v1/dogs?id=eq.${id}&select=slug`))[0]!.slug;
const shot = (page: Page, name: string) =>
  page.screenshot({ path: `docs/private/reviews/M4/${name}.png`, fullPage: true });

test.beforeAll(async () => {
  await deleteListings(PREFIX);
  const listing = async (n: string) => {
    const { id } = await pendingListing(`${PREFIX} ${n}`);
    return { id, slug: await slugOf(id) };
  };
  [edit, adopt, remove] = await Promise.all([listing("Edit"), listing("Adopt"), listing("Remove")]);
  [admin, adminNoMfa] = await Promise.all([makeUser({ role: "admin" }), makeUser({ role: "admin" })]);
});

test.afterAll(async () => {
  await deleteListings(PREFIX);
  await deleteUsers();
});

test("signed out: dog management pages go to the login", async ({ page }) => {
  for (const path of ["/admin/dogs", `/admin/dogs/${edit.id}/edit`]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/admin\/login$/);
    const r = await page.request.get(path, { headers: { purpose: "prefetch" }, maxRedirects: 0 });
    expect(await r.text(), path).not.toMatch(/All dogs|Save changes/);
  }
});

test("admin: overview counts, all dogs, edit, mark adopted, remove", async ({ browser, page, baseURL }) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 1280, height: 860 });
  await signInWithMfa(page, admin);

  // Overview counts match the database (other suites add rows in parallel, so re-read until stable).
  await expect(page.getByRole("heading", { level: 1, name: "Overview" })).toBeVisible();
  await expect(async () => {
    await page.reload();
    const expected: [string, number][] = [
      ["Dogs", await countRows("dogs", "&status=eq.approved")],
      ["Adopters", await countRows("adopters")],
      ["Interests", await countRows("enquiries")],
      [
        "Matches",
        await countRows("enquiries", "&status=in.(meeting,adoption_in_progress,adopted,adoption_unsuccessful)"),
      ],
      ["Adoptions", await countRows("dogs", "&status=eq.adopted")],
    ];
    for (const [label, n] of expected)
      await expect(page.locator("dl > div").filter({ hasText: label }).locator("dd").first(), label).toHaveText(
        String(n),
        { timeout: 1000 },
      );
  }).toPass({ timeout: 20_000 });
  await shot(page, "admin-overview-1280");

  for (const d of [edit, adopt, remove]) {
    await page.goto(`/admin/dogs/${d.id}`);
    await page.getByRole("button", { name: "Approve and publish" }).click();
    await expect(page).toHaveURL(/\/admin\?done=approved$/, { timeout: 20_000 }); // 3 file copies
  }

  // All dogs: newest first, status chips, no prefetch on the long list.
  await page.getByRole("navigation", { name: "Admin" }).getByRole("link", { name: /^Dogs/ }).click();
  await expect(page).toHaveURL(/\/admin\/dogs$/);
  const table = page.getByRole("region", { name: "All dogs" });
  for (const n of ["Edit", "Adopt", "Remove"])
    await expect(table.getByRole("row", { name: new RegExp(`${PREFIX} ${n}.*Live`) })).toBeVisible();
  await shot(page, "admin-dogs-1280");

  // Edit: replayed without aal2 it changes nothing; for real it shows on the profile at once.
  await page.goto(`/admin/dogs/${edit.id}`);
  await page.getByRole("link", { name: "Edit" }).click();
  await expect(page.getByRole("heading", { name: `Edit ${PREFIX} Edit` })).toBeVisible();
  await shot(page, "admin-edit-1280");
  // The captured POST is aborted, which leaves the page in its error state: reload and redo the inputs.
  const fillEdit = async () => {
    await page.getByLabel("Name").fill(`${PREFIX} Edited`);
    await page.getByLabel("Area").selectOption("Bandra");
    await page.getByLabel("Temperament").fill("Calm on the lead and loves mangoes.");
    await page.getByLabel("Admin notes (never public)").fill("Met the foster on Tuesday.");
    await page.getByLabel(/^Urgent/).check();
  };
  await fillEdit();
  const editPost = await captureAction(page, () => page.getByRole("button", { name: "Save changes" }).click());
  console.log(
    "replayed edit without aal2:",
    (await replayWithoutAal2(browser, baseURL!, editPost, adminNoMfa)).join(", "),
  );
  const before = (await sb<{ name: string }[]>(`/rest/v1/dogs?id=eq.${edit.id}&select=name`))[0];
  expect(before?.name).toBe(`${PREFIX} Edit`);
  await page.reload();
  await fillEdit();
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Changes saved. Find a Dog shows them now.")).toBeVisible();
  const saved = await sb<Record<string, unknown>[]>(
    `/rest/v1/dogs?id=eq.${edit.id}&select=name,locality,temperament,urgent,admin_notes,slug,size,energy`,
  );
  expect(saved[0]).toEqual({
    name: `${PREFIX} Edited`,
    locality: "Bandra",
    temperament: "Calm on the lead and loves mangoes.",
    urgent: true,
    admin_notes: "Met the foster on Tuesday.",
    slug: edit.slug, // results links keep working after a rename
    size: "small", // untouched fields keep their values
    energy: "medium",
  });
  await page.goto(`/dogs/${edit.slug}`);
  await expect(page.getByRole("heading", { level: 1, name: new RegExp(`${PREFIX} Edited`) })).toBeVisible();
  await expect(page.getByText("Calm on the lead and loves mangoes.")).toBeVisible();
  await expect(page.getByText("Met the foster on Tuesday.")).toHaveCount(0);

  // Mark adopted: two clicks; off Find a Dog; photos kept.
  await page.goto(`/admin/dogs/${adopt.id}`);
  await page.getByText("Mark adopted…").click();
  const adoptPost = await captureAction(page, () =>
    page.getByRole("button", { name: `Yes, ${PREFIX} Adopt was adopted` }).click(),
  );
  await replayWithoutAal2(browser, baseURL!, adoptPost, adminNoMfa);
  expect(await dogStatus(adopt.id)).toBe("approved");
  await page.reload();
  await page.getByText("Mark adopted…").click();
  await page.getByRole("button", { name: `Yes, ${PREFIX} Adopt was adopted` }).click();
  await expect(page.getByText(/Marked as adopted/)).toBeVisible();
  expect(await dogStatus(adopt.id)).toBe("adopted");
  expect(await listObjects("dog-photos", adopt.id)).toHaveLength(3);
  await page.goto(`/admin/dogs/${adopt.id}/edit`);
  await expect(page.getByText(/Adopted and removed dogs can.t be edited/)).toBeVisible();

  // Remove: two clicks; off Find a Dog; public photo files and rows deleted.
  await page.goto(`/admin/dogs/${remove.id}`);
  await page.getByText("Remove…").click();
  const removePost = await captureAction(page, () =>
    page.getByRole("button", { name: "Yes, remove this listing" }).click(),
  );
  await replayWithoutAal2(browser, baseURL!, removePost, adminNoMfa);
  expect(await dogStatus(remove.id)).toBe("approved");
  expect(await listObjects("dog-photos", remove.id)).toHaveLength(3);
  await page.reload();
  await page.getByText("Remove…").click();
  await page.getByRole("button", { name: "Yes, remove this listing" }).click();
  await expect(page.getByText("Listing removed and its photos deleted.")).toBeVisible();
  expect(await dogStatus(remove.id)).toBe("removed");
  expect(await listObjects("dog-photos", remove.id)).toEqual([]);
  expect(await countRows("dog_photos", `&dog_id=eq.${remove.id}`)).toBe(0);

  for (const d of [adopt, remove]) {
    await page.goto(`/dogs/${d.slug}`);
    await expect(page.getByRole("heading", { level: 1, name: new RegExp(PREFIX) })).toHaveCount(0);
  }
  await page.goto("/dogs?area=western");
  await expect(page.getByText(`${PREFIX} Adopt`)).toHaveCount(0);
  await expect(page.getByText(`${PREFIX} Remove`)).toHaveCount(0);

  // 390px: nothing overflows the page, every control is at least 44px.
  await page.setViewportSize({ width: 390, height: 844 });
  for (const [path, name] of [
    ["/admin", "admin-overview-390"],
    ["/admin/dogs", "admin-dogs-390"],
    [`/admin/dogs/${edit.id}`, "admin-dog-390"],
    [`/admin/dogs/${edit.id}/edit`, "admin-edit-390"],
  ]) {
    const res = await page.goto(path!);
    expect(res?.headers()["x-robots-tag"], path).toBe("noindex");
    expect(res?.headers()["cache-control"], path).toContain("no-store");
    expect(await noOverflow(page), path).toBeLessThanOrEqual(0);
    expect(await smallTargets(page), path).toEqual([]);
    await shot(page, name!);
  }
});
