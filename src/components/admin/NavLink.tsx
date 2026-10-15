"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cx } from "@/lib/cx";

/** Admin nav item; the current section gets the Butter fill and aria-current. */
export function NavLink({ href, children }: { href: string; children: ReactNode }) {
  const path = usePathname();
  const current = href === "/admin" ? path === "/admin" : path.startsWith(href);
  return (
    <Link
      href={href}
      aria-current={current ? "page" : undefined}
      className={cx(
        "flex min-h-11 items-center justify-between gap-2 rounded-[12px] border-2 px-3 text-[15px] no-underline lg:min-h-10",
        current ? "border-ink bg-highlight font-extrabold" : "border-transparent font-semibold hover:bg-bg",
      )}
    >
      {children}
    </Link>
  );
}
