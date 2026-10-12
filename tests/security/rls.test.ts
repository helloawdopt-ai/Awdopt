import { createHmac, randomBytes } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

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

// RFC 6238 TOTP (SHA-1, 6 digits, 30s) from a base32 secret.
function totp(base32: string) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const c of base32.replace(/=+$/, "").toUpperCase()) bits += alphabet.indexOf(c).toString(2).padStart(5, "0");
  const key = Buffer.from(bits.match(/.{8}/g)!.map((b) => parseInt(b, 2)));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30_000)));
  const h = createHmac("sha1", key).update(counter).digest();
  const o = h[h.length - 1]! & 0xf;
  return String((h.readUInt32BE(o) & 0x7fffffff) % 1_000_000).padStart(6, "0");
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

let nonAdmin = "";
let adminAal1 = "";
let adminAal2 = "";

beforeAll(async () => {
  nonAdmin = await makeUser({});
  adminAal1 = await makeUser({ role: "admin" });
  adminAal2 = await upgradeToAal2(await makeUser({ role: "admin" }));
}, 30_000);

afterAll(async () => {
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
