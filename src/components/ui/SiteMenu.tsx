"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { useRef } from "react";

const links = [
  { href: "/dogs", label: "Find a Dog" },
  { href: "/list", label: "List a Dog" },
  { href: "/#how", label: "How matching works" },
];

/** Butter menu button (DESIGN.md §6 header action). Native <details>; Esc closes and returns focus. */
export function SiteMenu() {
  const ref = useRef<HTMLDetailsElement>(null);
  const close = () => {
    if (!ref.current?.open) return;
    ref.current.open = false;
    ref.current.querySelector("summary")?.focus();
  };
  return (
    <details ref={ref} className="relative" onKeyDown={(e) => e.key === "Escape" && close()}>
      <summary
        aria-label="Menu"
        className="press flex size-11 cursor-pointer list-none items-center justify-center rounded-[14px] border-2 border-ink bg-highlight text-ink shadow-sticker-sm hover:-translate-px hover:shadow-sticker active:translate-[2px] active:shadow-none [&::-webkit-details-marker]:hidden"
      >
        <Menu size={22} strokeWidth={2.4} aria-hidden="true" />
      </summary>
      <nav
        aria-label="Main"
        className="absolute top-14 right-0 z-20 flex w-60 flex-col rounded-[20px] border-[2.5px] border-ink bg-surface p-2 shadow-sticker"
      >
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            onClick={close}
            className="flex min-h-11 items-center rounded-xl px-3 font-extrabold no-underline hover:bg-bg"
          >
            {l.label}
          </Link>
        ))}
      </nav>
    </details>
  );
}
