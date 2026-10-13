import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE } from "@/lib/admin-cookie";

const TURNSTILE = "https://challenges.cloudflare.com";
const SUPABASE = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin : "";

function buildCsp(nonce: string, dev = process.env.NODE_ENV === "development") {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' ${TURNSTILE}${dev ? " 'unsafe-eval'" : ""}`,
    `connect-src 'self' ${SUPABASE} ${TURNSTILE}`,
    `img-src 'self' blob: data: ${SUPABASE}`,
    "style-src 'self' 'unsafe-inline'",
    `frame-src ${TURNSTILE}`,
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ]
    .map((d) => d.replace(/\s+/g, " ").trim())
    .join("; ");
}

type Cookie = { name: string; value: string; options: object };

// /admin and /brand: refresh the Supabase session and send people to the right step.
// Pages and actions re-check with requireAdmin(); this is the first gate, not the only one.
async function adminGate(request: NextRequest, written: Cookie[]) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookieOptions: ADMIN_COOKIE,
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list) => {
          for (const c of list) {
            request.cookies.set(c.name, c.value);
            written.push(c);
          }
        },
      },
    },
  );
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims as { aal?: string; app_metadata?: { role?: string } } | undefined;
  const path = request.nextUrl.pathname;
  const admin = claims?.app_metadata?.role === "admin";
  const step = !admin ? "/admin/login" : claims?.aal !== "aal2" ? "/admin/mfa" : null;
  if (step && path !== step && path !== "/admin/login") return step;
  if (!step && (path === "/admin/login" || path === "/admin/mfa")) return "/admin";
  return null;
}

export async function proxy(request: NextRequest) {
  const written: Cookie[] = [];
  const path = request.nextUrl.pathname;
  const redirectTo =
    path === "/brand" || path === "/admin" || path.startsWith("/admin/") ? await adminGate(request, written) : null;

  let response: NextResponse;
  if (redirectTo) {
    response = NextResponse.redirect(new URL(redirectTo, request.url));
  } else {
    const nonce = btoa(crypto.randomUUID());
    const csp = buildCsp(nonce);
    // Next.js reads the nonce from the request CSP header and applies it to its own scripts.
    const headers = new Headers(request.headers);
    headers.set("x-nonce", nonce);
    headers.set("Content-Security-Policy", csp);
    response = NextResponse.next({ request: { headers } });
    response.headers.set("Content-Security-Policy", csp);
  }
  for (const c of written) response.cookies.set(c.name, c.value, c.options);
  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!_next/static|_next/image|brand/|icon.svg|apple-icon|opengraph-image|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
