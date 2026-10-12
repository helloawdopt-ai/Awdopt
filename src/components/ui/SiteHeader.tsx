import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/brand/Logo";

/** 56px header: logo on the left, one 44px action on the right (DESIGN.md §6). */
export function SiteHeader({ action }: { action?: ReactNode }) {
  return (
    <header className="flex h-14 items-center justify-between">
      <Link href="/" aria-label="AWDOPT home" className="inline-flex h-11 items-center">
        <Logo size={22} />
      </Link>
      {action}
    </header>
  );
}
