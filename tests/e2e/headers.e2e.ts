import { expect, test } from "@playwright/test";

// securityheaders.com-style assertions (docs: security section of the build rules).
test("security headers on every page", async ({ request }) => {
  for (const path of ["/", "/brand"]) {
    const res = await request.get(path);
    const h = res.headers();
    expect(h["strict-transport-security"]).toBe("max-age=63072000; includeSubDomains; preload");
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(h["permissions-policy"]).toBe("camera=(), microphone=(), geolocation=(), payment=()");
    expect(h["x-powered-by"]).toBeUndefined();

    const csp = h["content-security-policy"] ?? "";
    expect(csp).toMatch(/script-src 'self' 'nonce-[A-Za-z0-9+/=]+' https:\/\/challenges\.cloudflare\.com(;|$)/);
    expect(csp).not.toMatch(/script-src[^;]*'unsafe-(inline|eval)'/);
    expect(csp).toContain("style-src 'self' 'unsafe-inline'");
    expect(csp).toContain("frame-src https://challenges.cloudflare.com");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
  }
});

test("nonce is fresh per request and applied to Next.js scripts", async ({ request }) => {
  const nonce = async () => {
    const res = await request.get("/");
    const n = /'nonce-([^']+)'/.exec(res.headers()["content-security-policy"] ?? "")?.[1];
    return { n, html: await res.text() };
  };
  const a = await nonce();
  const b = await nonce();
  expect(a.n).toBeTruthy();
  expect(a.n).not.toBe(b.n);
  expect(a.html).toContain(`nonce="${a.n}"`);
});

test("page loads with no CSP violations", async ({ page }) => {
  const violations: string[] = [];
  page.on("console", (m) => /Content Security Policy/i.test(m.text()) && violations.push(m.text()));
  await page.goto("/brand");
  await page.getByRole("button", { name: "Open filters" }).click();
  await expect(page.getByRole("dialog", { name: "Filters" })).toBeVisible();
  expect(violations).toEqual([]);
});
