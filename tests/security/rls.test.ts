import { randomBytes } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { totp } from "../totp";

// RLS / privilege suite against awdopt-dev. Proves that the anon key, a signed-in non-admin
// and an admin without MFA (aal1) are all denied, and that an aal2 admin is allowed.
// Needs .env.local (dev values); `npm test` loads it.
const DEV_HOST = "bdrkuwznuuklrryxddba.supabase.co";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
const secret = process.env.SUPABASE_SECRET_KEY ?? "";

if (!url || !publishable || !secret) {
  throw new Error(
    "Security tests need NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY and SUPABASE_SECRET_KEY in .env.local",
  );
}
// Creates and deletes auth users, so it must never point at prod.
if (new URL(url).host !== DEV_HOST) throw new Error("Security tests only run against awdopt-dev");

const TABLES = [
  "listers",
  "dogs",
  "dog_photos",
  "adopters",
  "enquiries",
  "match_weights",
  "hard_constraints",
  "rate_limits",
];
const PENDING_DOG = "00000000-0000-4000-b000-000000000007";

const headers = (token?: string, key = publishable): Record<string, string> => ({
  apikey: key,
  "Content-Type": "application/json",
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
});
const service = () => headers(secret.startsWith("eyJ") ? secret : undefined, secret);

async function rest(path: string, init: RequestInit = {}) {
  const res = await fetch(`${url}/rest/v1/${path}`, init);
  const body = await res.text();
  return { status: res.status, ok: res.ok, rows: body.startsWith("[") ? (JSON.parse(body) as unknown[]) : null };
}

// Denied = an error status, or (RLS filtering for signed-in users) zero rows.
const denied = (r: { ok: boolean; rows: unknown[] | null }) => !r.ok || (r.rows ?? []).length === 0;

async function auth(path: string, init: RequestInit) {
  const res = await fetch(`${url}/auth/v1/${path}`, init);
  const json = (await res.json()) as Record<string, unknown>;
  if (!res.ok) throw new Error(`auth ${path} failed: ${res.status}`);
  return json;
}

const users: string[] = [];
async function makeUser(appMetadata: Record<string, unknown>) {
  const email = `rls-${randomBytes(6).toString("hex")}@example.com`;
  const password = randomBytes(24).toString("base64url");
  const user = await auth("admin/users", {
    method: "POST",
    headers: service(),
    body: JSON.stringify({ email, password, email_confirm: true, app_metadata: appMetadata }),
  });
  users.push(user.id as string);
  const session = await auth("token?grant_type=password", {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ email, password }),
  });
  return session.access_token as string;
}

async function upgradeToAal2(token: string) {
  const factor = await auth("factors", {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify({ factor_type: "totp", friendly_name: "rls-test" }),
  });
  const id = factor.id as string;
  const challenge = await auth(`factors/${id}/challenge`, { method: "POST", headers: headers(token), body: "{}" });
  const verified = await auth(`factors/${id}/verify`, {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify({ challenge_id: challenge.id, code: totp((factor.totp as { secret: string }).secret) }),
  });
  return verified.access_token as string;
}

async function storage(path: string, init: RequestInit = {}) {
  const res = await fetch(`${url}/storage/v1/${path}`, init);
  const body = await res.text();
  return { status: res.status, ok: res.ok, body };
}

// A WebP header is enough: the bucket checks the declared type and size, the app checks magic bytes.
const WEBP = Buffer.concat([Buffer.from("RIFF\x10\x00\x00\x00WEBPVP8 ", "latin1"), Buffer.alloc(64)]);

async function uploadSigned(path: string, body: Buffer, type: string) {
  const sign = await storage(`object/upload/sign/listing-uploads/${path}`, {
    method: "POST",
    headers: service(),
    body: "{}",
  });
  if (!sign.ok) throw new Error(`sign failed: ${sign.status}`);
  const signed = JSON.parse(sign.body) as { url: string };
  return storage(signed.url.replace(/^\//, ""), {
    method: "PUT",
    headers: { "Content-Type": type },
    body: new Uint8Array(body),
  });
}

const listing = (photos: unknown[] = [{ width: 1600, height: 1200, ext: "webp" }]) => ({
  lister: { name: "Security Test Lister", phone: "+910000000099", email: null, relationship: "rescuer" },
  dog: { name: "Security Test Dog", locality: "Bandra", size: "small", good_with_cats: null },
  photos,
});

let nonAdmin = "";
let adminAal1 = "";
let adminAal2 = "";
let testDog = "";
let uploadPath = "";

beforeAll(async () => {
  nonAdmin = await makeUser({});
  adminAal1 = await makeUser({ role: "admin" });
  adminAal2 = await upgradeToAal2(await makeUser({ role: "admin" }));
  // A pending listing with one uploaded photo, as the listing form leaves it.
  const r = await fetch(`${url}/rest/v1/rpc/submit_listing`, {
    method: "POST",
    headers: service(),
    body: JSON.stringify({ p: listing() }),
  });
  const out = (await r.json()) as { dog_id: string; paths: string[][] };
  testDog = out.dog_id;
  uploadPath = out.paths[0]![0]!;
  expect((await uploadSigned(uploadPath, WEBP, "image/webp")).ok).toBe(true);
}, 30_000);

afterAll(async () => {
  await storage("object/listing-uploads", {
    method: "DELETE",
    headers: service(),
    body: JSON.stringify({ prefixes: [uploadPath] }),
  });
  if (testDog) {
    const dog = await rest(`dogs?id=eq.${testDog}&select=lister_id`, { headers: service() });
    const lister = (dog.rows?.[0] as { lister_id: string } | undefined)?.lister_id;
    await rest(`dogs?id=eq.${testDog}`, { method: "DELETE", headers: service() });
    if (lister) await rest(`listers?id=eq.${lister}`, { method: "DELETE", headers: service() });
  }
  await Promise.all(
    users.map((id) => fetch(`${url}/auth/v1/admin/users/${id}`, { method: "DELETE", headers: service() })),
  );
});

const callers = () =>
  [
    ["anon", undefined],
    ["signed-in non-admin", nonAdmin],
    ["admin without MFA (aal1)", adminAal1],
  ] as const;

describe.each([0, 1, 2])("denied caller #%i", (i) => {
  const caller = () => callers()[i]!;

  it("cannot read any table", async () => {
    const [, token] = caller();
    for (const t of TABLES) expect(denied(await rest(`${t}?select=*`, { headers: headers(token) })), t).toBe(true);
  });

  it("cannot read pending dogs or their photos", async () => {
    const [, token] = caller();
    expect(denied(await rest(`dogs?id=eq.${PENDING_DOG}`, { headers: headers(token) }))).toBe(true);
    expect(denied(await rest(`dog_photos?dog_id=eq.${PENDING_DOG}`, { headers: headers(token) }))).toBe(true);
  });

  it("cannot call the server-only public_dogs function", async () => {
    const [, token] = caller();
    expect((await rest("rpc/public_dogs", { headers: headers(token) })).ok).toBe(false);
  });

  it("cannot call the server-only write functions", async () => {
    const [, token] = caller();
    const h = headers(token);
    expect(
      (await rest("rpc/submit_listing", { method: "POST", headers: h, body: JSON.stringify({ p: listing() }) })).ok,
    ).toBe(false);
    const limit = { p_action: "listing", p_ip_hash: "\\x" + "00".repeat(32), p_max: 100, p_window: "1 hour" };
    expect((await rest("rpc/hit_rate_limit", { method: "POST", headers: h, body: JSON.stringify(limit) })).ok).toBe(
      false,
    );
  });

  it("cannot call the server-only matching functions", async () => {
    const [, token] = caller();
    const h = headers(token);
    const adopter = { p_adopter_id: "00000000-0000-4000-c000-000000000001" };
    expect(
      (await rest("rpc/score_dogs_for_adopter", { method: "POST", headers: h, body: JSON.stringify(adopter) })).ok,
    ).toBe(false);
    const link = { p_token_hash: "\\x" + "00".repeat(32) };
    expect((await rest("rpc/results_for_token", { method: "POST", headers: h, body: JSON.stringify(link) })).ok).toBe(
      false,
    );
  });

  it("cannot list, read or write photo storage", async () => {
    const [, token] = caller();
    const h = headers(token);
    for (const bucket of ["listing-uploads", "dog-photos"]) {
      const list = await storage(`object/list/${bucket}`, { method: "POST", headers: h, body: '{"prefix":""}' });
      expect(!list.ok || list.body === "[]", bucket).toBe(true);
      const put = await storage(`object/${bucket}/${testDog}/x.webp`, {
        method: "POST",
        headers: { ...h, "Content-Type": "image/webp" },
        body: WEBP,
      });
      expect(put.ok, bucket).toBe(false);
    }
    expect((await storage(`object/authenticated/listing-uploads/${uploadPath}`, { headers: h })).ok).toBe(false);
    expect((await storage(`object/public/listing-uploads/${uploadPath}`)).ok).toBe(false);
  });

  it("cannot write to any table", async () => {
    const [, token] = caller();
    for (const t of TABLES) {
      const r = await rest(t, {
        method: "POST",
        headers: { ...headers(token), Prefer: "return=representation" },
        body: "{}",
      });
      expect(r.ok, t).toBe(false);
    }
  });

  it("cannot update match_weights or delete enquiries", async () => {
    const [, token] = caller();
    const h = { ...headers(token), Prefer: "return=representation" };
    expect(
      denied(await rest("match_weights?category=eq.lifestyle", { method: "PATCH", headers: h, body: '{"weight":99}' })),
    ).toBe(true);
    expect(denied(await rest("enquiries?id=not.is.null", { method: "DELETE", headers: h }))).toBe(true);
    const check = await rest("match_weights?category=eq.lifestyle&select=weight", { headers: service() });
    expect(check.rows).toEqual([{ weight: 25 }]);
    expect((await rest("enquiries?select=id", { headers: service() })).rows?.length).toBeGreaterThan(0);
  });
});

describe("allowed paths", () => {
  it("an aal2 admin can read every admin table", async () => {
    for (const t of TABLES.filter((t) => t !== "rate_limits")) {
      const r = await rest(`${t}?select=*&limit=1`, { headers: headers(adminAal2) });
      expect(r.ok && (r.rows ?? []).length > 0, t).toBe(true);
    }
  });

  it("an aal2 admin can read pending uploads", async () => {
    const r = await storage(`object/authenticated/listing-uploads/${uploadPath}`, { headers: headers(adminAal2) });
    expect(r.ok).toBe(true);
  });

  it("an aal2 admin still cannot touch rate_limits", async () => {
    expect((await rest("rate_limits?select=*", { headers: headers(adminAal2) })).ok).toBe(false);
  });

  it("public_dogs (server only) returns approved dogs and public columns only", async () => {
    const r = await rest("rpc/public_dogs?select=*", { headers: service() });
    const rows = r.rows as Record<string, unknown>[];
    expect(rows.length).toBe(6);
    expect(
      rows.every(
        (d) =>
          !String(d.slug).startsWith("sample-pending") &&
          !String(d.slug).includes("adopted") &&
          !String(d.slug).includes("removed"),
      ),
    ).toBe(true);
    for (const leak of ["lister_id", "admin_notes", "status", "approved_at", "updated_at"])
      expect(rows[0], leak).not.toHaveProperty(leak);
  });
});

describe("server-only write functions", () => {
  const rpc = (fn: string, body: unknown) =>
    rest(`rpc/${fn}`, { method: "POST", headers: service(), body: JSON.stringify(body) });

  it("submit_listing creates a pending dog that stays out of public_dogs", async () => {
    const dog = await rest(`dogs?id=eq.${testDog}&select=status,slug,admin_notes`, { headers: service() });
    expect(dog.rows?.[0]).toMatchObject({ status: "pending", admin_notes: null });
    expect((dog.rows?.[0] as { slug: string }).slug).toMatch(/^security-test-dog-[0-9a-f]{6}$/);
    const pub = await rest(`rpc/public_dogs?id=eq.${testDog}&select=id`, { headers: service() });
    expect(pub.rows).toEqual([]);
    expect(uploadPath).toMatch(new RegExp(`^${testDog}/[0-9a-f-]{36}-480\\.webp$`));
  });

  it("submit_listing rejects bad input", async () => {
    expect((await rpc("submit_listing", { p: listing([]) })).ok).toBe(false);
    expect((await rpc("submit_listing", { p: listing(Array(7).fill({ width: 1, height: 1, ext: "webp" })) })).ok).toBe(
      false,
    );
    expect((await rpc("submit_listing", { p: listing([{ width: 1, height: 1, ext: "svg" }]) })).ok).toBe(false);
    const bad = listing();
    bad.lister.phone = "98765";
    expect((await rpc("submit_listing", { p: bad })).ok).toBe(false);
  });

  it("hit_rate_limit allows max calls per window, then refuses", async () => {
    const hash = "\\x" + randomBytes(32).toString("hex");
    const body = { p_action: "listing", p_ip_hash: hash, p_max: 3, p_window: "1 hour" };
    const results = [];
    for (let i = 0; i < 4; i++)
      results.push(
        await (
          await fetch(`${url}/rest/v1/rpc/hit_rate_limit`, {
            method: "POST",
            headers: service(),
            body: JSON.stringify(body),
          })
        ).json(),
      );
    expect(results).toEqual([true, true, true, false]);
    await rest(`rate_limits?ip_hash=eq.${encodeURIComponent(hash)}`, { method: "DELETE", headers: service() });
  });

  it("listing-uploads refuses other file types and files over 2MB", async () => {
    const path = `${testDog}/${randomBytes(8).toString("hex")}`;
    expect((await uploadSigned(`${path}.txt`, Buffer.from("hello"), "text/plain")).ok).toBe(false);
    expect((await uploadSigned(`${path}.webp`, Buffer.alloc(2 * 1024 * 1024 + 1), "image/webp")).ok).toBe(false);
  });
});
