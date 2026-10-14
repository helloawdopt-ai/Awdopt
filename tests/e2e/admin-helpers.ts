import { randomBytes } from "node:crypto";
import { expect, type Page } from "@playwright/test";
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
