import { NextResponse, type NextRequest } from "next/server";

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

export function proxy(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const csp = buildCsp(nonce);

  // Next.js reads the nonce from the request CSP header and applies it to its own scripts.
  const headers = new Headers(request.headers);
  headers.set("x-nonce", nonce);
  headers.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers } });
  response.headers.set("Content-Security-Policy", csp);
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
