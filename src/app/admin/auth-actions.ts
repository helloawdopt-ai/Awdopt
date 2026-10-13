"use server";

import { redirect } from "next/navigation";
import { adminClaims, authClient } from "@/lib/server/auth";

// Admin sign-in (scope #12: password login) + TOTP (aal2). Errors stay generic.

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || email.length > 254 || !password || password.length > 200) redirect("/admin/login?error=1");
  const supabase = await authClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || data.user?.app_metadata?.role !== "admin") {
    if (!error) await supabase.auth.signOut();
    redirect("/admin/login?error=1");
  }
  redirect("/admin/mfa");
}

export async function signOut() {
  const supabase = await authClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

export type MfaState = { factorId?: string; qr?: string; secret?: string; error?: string };

async function adminSession() {
  const supabase = await authClient();
  const claims = await adminClaims(supabase);
  if (claims?.app_metadata?.role !== "admin") redirect("/admin/login");
  return supabase;
}

/** First sign-in: create a TOTP factor and return its QR code (shown once, never stored by us). */
export async function enrollTotp(): Promise<MfaState> {
  const supabase = await adminSession();
  const { data: factors } = await supabase.auth.mfa.listFactors();
  // Drop half-finished set-ups so they don't pile up.
  for (const f of factors?.all ?? [])
    if (f.factor_type === "totp" && f.status !== "verified") await supabase.auth.mfa.unenroll({ factorId: f.id });
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: `AWDOPT ${Date.now()}` });
  if (error || !data) return { error: "We couldn't start the set-up. Please try again." };
  return { factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret };
}

export async function verifyTotp(prev: MfaState, formData: FormData): Promise<MfaState> {
  const supabase = await adminSession();
  const factorId = String(formData.get("factorId") ?? "");
  const code = String(formData.get("code") ?? "").replace(/\s/g, "");
  if (!/^[0-9a-f-]{36}$/.test(factorId) || !/^\d{6}$/.test(code))
    return { ...prev, error: "Enter the 6-digit code from your app." };
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
  if (error) return { ...prev, error: "That code didn't work. Check the time on your phone and try the newest code." };
  redirect("/admin");
}
