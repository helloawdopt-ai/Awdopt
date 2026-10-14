import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { signOut } from "@/app/admin/auth-actions";
import { MfaForm } from "@/components/admin/MfaForm";
import { Logo } from "@/components/brand/Logo";
import { adminClaims, authClient } from "@/lib/server/auth";

export const metadata: Metadata = { title: "Two-step verification", robots: { index: false } };

export default async function Page() {
  const supabase = await authClient();
  const claims = await adminClaims(supabase);
  if (claims?.app_metadata?.role !== "admin") redirect("/admin/login");
  if (claims.aal === "aal2") redirect("/admin");
  const { data } = await supabase.auth.mfa.listFactors();
  const factor = data?.totp.find((f) => f.status === "verified");

  return (
    <main className="mx-auto flex min-h-dvh max-w-[400px] flex-col justify-center gap-6 px-4 py-10">
      <Logo size={26} />
      <h1 className="font-display text-[26px] leading-[1.1] font-extrabold tracking-[-0.035em]">
        Two-step verification
      </h1>
      <MfaForm factorId={factor?.id} />
      <form action={signOut}>
        <button type="submit" className="min-h-11 text-sm font-bold underline">
          Sign out
        </button>
      </form>
    </main>
  );
}
