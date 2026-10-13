import Link from "next/link";
import type { ReactNode } from "react";
import { signOut } from "@/app/admin/auth-actions";
import { Logo } from "@/components/brand/Logo";
import { requireAdmin } from "@/lib/server/auth";

// Admin (kept simple, desktop-first, usable at 390px). Calm zone: no tilt or sparkles.
// Adopters, enquiries and weights join the nav in M4.
export default async function PanelLayout({ children }: { children: ReactNode }) {
  const { supabase, email } = await requireAdmin();
  const { count } = await supabase.from("dogs").select("id", { count: "exact", head: true }).eq("status", "pending");

  return (
    <div className="min-h-dvh lg:flex">
      <nav
        aria-label="Admin"
        className="flex flex-wrap items-center gap-3 border-b-2 border-ink bg-surface px-4 py-3 lg:w-[230px] lg:shrink-0 lg:flex-col lg:flex-nowrap lg:items-stretch lg:border-r-2 lg:border-b-0 lg:px-4 lg:py-[22px]"
      >
        <Link href="/admin" aria-label="Admin home" className="inline-flex min-h-11 items-center">
          <Logo size={20} />
        </Link>
        <span className="hidden text-xs font-extrabold tracking-[0.08em] text-muted uppercase lg:mt-3.5 lg:block">
          Admin
        </span>
        <Link
          href="/admin"
          className="flex min-h-11 items-center justify-between gap-2 rounded-[12px] border-2 border-ink bg-highlight px-3 text-[15px] font-extrabold no-underline lg:min-h-10"
        >
          Listings
          {!!count && (
            <span className="rounded-full border-[1.5px] border-ink bg-primary px-[7px] py-px text-xs font-extrabold">
              {count} pending
            </span>
          )}
        </Link>
        <div className="ml-auto flex flex-col text-xs leading-[1.4] text-muted lg:mt-auto lg:ml-0">
          <span>{email} · 2-step verified</span>
          <form action={signOut}>
            <button type="submit" className="min-h-11 font-bold text-ink underline lg:min-h-0">
              Sign out
            </button>
          </form>
        </div>
      </nav>
      <main className="flex min-w-0 grow flex-col gap-5 px-4 py-6 lg:px-[30px] lg:py-[26px]">{children}</main>
    </div>
  );
}
