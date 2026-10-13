// Session cookies for the admin login. httpOnly: the browser never needs them (no client-side Supabase).
export const ADMIN_COOKIE = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};
