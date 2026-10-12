"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cx } from "@/lib/cx";

/** Sticky bottom action bar: 2.5px Plum top border, Oat Milk, safe-area padding (DESIGN.md §6). */
export function StickyBar({ children, className }: { children: ReactNode; className?: string }) {
  const bar = useRef<HTMLDivElement>(null);

  // Browsers skip focus-scrolling when a field is partly on screen, leaving it under the bar.
  // scrollIntoView honours html's scroll-padding-bottom, so the focused field clears the bar.
  useEffect(() => {
    const onFocus = (e: FocusEvent) => {
      const el = e.target as HTMLElement;
      if (!bar.current || bar.current.contains(el)) return;
      if (el.getBoundingClientRect().bottom > bar.current.getBoundingClientRect().top) {
        el.scrollIntoView({ block: "nearest" });
      }
    };
    document.addEventListener("focusin", onFocus);
    return () => document.removeEventListener("focusin", onFocus);
  }, []);

  return (
    <div
      ref={bar}
      className="sticky bottom-0 z-10 border-t-[2.5px] border-ink bg-bg px-4 pt-3.5 pb-[calc(22px+env(safe-area-inset-bottom))]"
    >
      <div className={cx("mx-auto flex max-w-[560px] gap-2.5", className)}>{children}</div>
    </div>
  );
}
