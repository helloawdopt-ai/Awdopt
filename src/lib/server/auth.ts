import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Database } from "@/lib/database.types";
import { ADMIN_COOKIE } from "@/lib/admin-cookie";

/** User-scoped Supabase client from the session cookies. RLS applies (admin = role + aal2). */
export async function authClient() {
  const store = await cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookieOptions: ADMIN_COOKIE,
      cookies: {
        getAll: () => store.getAll(),
        setAll: (list) => {
          // Server Components can't write cookies; src/proxy.ts refreshes the session for /admin.
          try {
            for (const { name, value, options } of list) store.set(name, value, options);
          } catch {}
        },
      },
    },
  );
}

type Claims = { email?: string; aal?: string; app_metadata?: { role?: string } };

/** Verified JWT claims (signature checked), or null. Never trusts user_metadata. */
export async function adminClaims(supabase: Awaited<ReturnType<typeof authClient>>) {
  const { data } = await supabase.auth.getClaims();
  return (data?.claims as Claims | undefined) ?? null;
}

/**
 * Every admin page and action calls this, on top of the proxy gate: the request must carry an
 * admin (app_metadata.role) session that passed TOTP (aal2).
 */
export async function requireAdmin() {
  const supabase = await authClient();
  const claims = await adminClaims(supabase);
  if (!claims || claims.app_metadata?.role !== "admin") redirect("/admin/login");
  if (claims.aal !== "aal2") redirect("/admin/mfa");
  return { supabase, email: claims.email ?? "" };
}
