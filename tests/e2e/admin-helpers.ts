import { randomBytes } from "node:crypto";
import { expect, request, type Browser, type Page, type Request, type Route } from "@playwright/test";
import sharp from "sharp";
import { totp } from "../totp";

export { totp };

// awdopt-dev only: creates fake listings and auth users through the service API, and removes them.
export const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const key = process.env.SUPABASE_SECRET_KEY ?? "";
export const devReady = !!key && new URL(url || "http://x").host === "bdrkuwznuuklrryxddba.supabase.co";
const h = { apikey: key, "Content-Type": "application/json" };

export async function sb<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(url + path, { ...init, headers: { ...h, ...(init.headers as object) } });
  const text = await res.text();
  if (!res.ok) throw new Error(`${path} ${res.status} ${text}`);
  return (text ? JSON.parse(text) : null) as T;
}

/** A pending listing with real WebP files, or (fake) bytes that only claim to be WebP. */
export async function pendingListing(name: string, fake = false) {
  const out = await sb<{ dog_id: string; paths: string[][] }>("/rest/v1/rpc/submit_listing", {
    method: "POST",
    body: JSON.stringify({
      p: {
        lister: { name: "E2E Lister", phone: "+910000000098", email: null, relationship: "foster" },
        dog: { name, locality: "Malad", size: "small", energy: "medium" },
        photos: [{ width: 1600, height: 1200, ext: "webp" }],
      },
    }),
  });
  for (const [i, path] of out.paths[0]!.entries()) {
    const width = [480, 960, 1600][i]!;
    const body = fake
      ? Buffer.from("this is not an image, just text pretending to be one")
      : await sharp({ create: { width, height: Math.round(width * 0.75), channels: 3, background: "#7fddbe" } })
          .webp()
          .toBuffer();
    const signed = await sb<{ url: string }>(`/storage/v1/object/upload/sign/listing-uploads/${path}`, {
      method: "POST",
      body: "{}",
    });
    const res = await fetch(`${url}/storage/v1${signed.url}`, {
      method: "PUT",
      headers: { "Content-Type": "image/webp" },
      body: new Uint8Array(body),
    });
    expect(res.ok).toBe(true);
  }
  return { id: out.dog_id, paths: out.paths[0]! };
}

export async function dogStatus(id: string) {
  return (await sb<{ status: string }[]>(`/rest/v1/dogs?id=eq.${id}&select=status`))[0]?.status;
}

export async function listObjects(bucket: string, prefix: string) {
  return sb<{ name: string }[]>(`/storage/v1/object/list/${bucket}`, {
    method: "POST",
    body: JSON.stringify({ prefix }),
  });
}

export async function deleteListings(namePrefix: string) {
  const dogs = await sb<{ id: string; lister_id: string }[]>(
    `/rest/v1/dogs?name=like.${encodeURIComponent(namePrefix)}*&select=id,lister_id`,
  );
  for (const d of dogs) {
    for (const bucket of ["listing-uploads", "dog-photos"]) {
      const objs = await listObjects(bucket, d.id);
      if (objs.length)
        await sb(`/storage/v1/object/${bucket}`, {
          method: "DELETE",
          body: JSON.stringify({ prefixes: objs.map((o) => `${d.id}/${o.name}`) }),
        });
    }
    await sb(`/rest/v1/dogs?id=eq.${d.id}`, { method: "DELETE" });
    await sb(`/rest/v1/listers?id=eq.${d.lister_id}`, { method: "DELETE" });
  }
}

const users: string[] = [];
export async function makeUser(appMetadata: Record<string, unknown>) {
  const email = `e2e-${randomBytes(6).toString("hex")}@example.com`;
  const password = randomBytes(18).toString("base64url");
  const user = await sb<{ id: string }>("/auth/v1/admin/users", {
    method: "POST",
    body: JSON.stringify({ email, password, email_confirm: true, app_metadata: appMetadata }),
  });
  users.push(user.id);
  return { email, password };
}
export async function deleteUsers() {
  await Promise.all(users.splice(0).map((id) => sb(`/auth/v1/admin/users/${id}`, { method: "DELETE" })));
}

export async function signIn(page: Page, user: { email: string; password: string }) {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password").fill(user.password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

/** Password + first-time TOTP set-up, ending on /admin with an aal2 session. */
export async function signInWithMfa(page: Page, user: { email: string; password: string }) {
  await signIn(page, user);
  await expect(page).toHaveURL(/\/admin\/mfa$/);
  await page.getByRole("button", { name: "Set up authenticator app" }).click();
  const secret = (await page.getByTestId("totp-secret").textContent())!.trim();
  await page.getByLabel("6-digit code").fill(totp(secret));
  await page.getByRole("button", { name: "Verify" }).click();
  await expect(page).toHaveURL(/\/admin$/);
  return secret;
}

/** Clicks something that posts a server action, blocks that POST, and returns it for replaying. */
export async function captureAction(page: Page, click: () => Promise<void>) {
  let captured: Request | undefined;
  const handler = async (route: Route) => {
    if (route.request().method() === "POST") {
      captured = route.request();
      return route.abort();
    }
    return route.continue();
  };
  await page.route("**/admin**", handler);
  await click();
  await expect.poll(() => captured).toBeTruthy();
  await page.unroute("**/admin**", handler);
  return captured!;
}

/**
 * Replays a captured admin action signed out and as an admin without TOTP (aal1), each plain and
 * with the prefetch headers the proxy skips, so this checks the action's own requireAdmin().
 * The caller then checks nothing changed. Returns "header status redirect" lines for the log.
 */
export async function replayWithoutAal2(
  browser: Browser,
  baseURL: string,
  captured: Request,
  aal1User: { email: string; password: string },
) {
  const statuses: string[] = [];
  const headers = Object.fromEntries(
    Object.entries(captured.headers()).filter(([k]) => !["cookie", "content-length", "host"].includes(k)),
  );
  const replay = async (ctx: Awaited<ReturnType<typeof request.newContext>>) => {
    for (const extra of [{}, { purpose: "prefetch" }, { "next-router-prefetch": "1" }] as Record<string, string>[]) {
      const res = await ctx.post(captured.url(), {
        headers: { ...headers, ...extra },
        data: captured.postDataBuffer()!,
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
  await signIn(aal1Page, aal1User);
  await expect(aal1Page).toHaveURL(/\/admin\/mfa$/);
  await replay(aal1.request);
  await aal1.close();
  return statuses;
}

/** Row count through the service API (Content-Range of a HEAD request). */
export async function countRows(table: string, filter = "") {
  const res = await fetch(`${url}/rest/v1/${table}?select=id${filter}`, {
    method: "HEAD",
    headers: { ...h, Prefer: "count=exact" },
  });
  return Number(res.headers.get("content-range")?.split("/")[1]);
}

/** Buttons, links, summaries and selects under 44px (DESIGN.md §6: admin controls 44px below 1024px). */
export const smallTargets = (page: Page) =>
  page.$$eval("a, button, summary, select", (els) =>
    els
      .filter((el) => (el as HTMLElement).offsetParent !== null && !el.parentElement?.closest("p, label"))
      .map((el) => ({ text: el.textContent?.trim() || el.getAttribute("aria-label"), box: el.getBoundingClientRect() }))
      .filter(({ box }) => box.height < 44 || box.width < 44)
      .map(({ text }) => text),
  );

export const noOverflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
