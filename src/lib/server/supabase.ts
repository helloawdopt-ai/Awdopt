import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

// Secret-key client. Server-only: public reads (public_dogs) and the narrow write functions.
// Admin pages use the user-scoped client instead, so RLS applies.
export const service = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
});
