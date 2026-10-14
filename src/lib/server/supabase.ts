import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

let client: SupabaseClient<Database> | undefined;

/**
 * Secret-key client. Server-only: public reads (public_dogs) and the narrow write functions.
 * Admin pages use the user-scoped client instead, so RLS applies. Created on first use, so
 * `next build` never needs the secret.
 */
export function service() {
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key) throw new Error("SUPABASE_SECRET_KEY is not set");
  return (client ??= createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  }));
}
