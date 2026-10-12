import type { ReactNode } from "react";
import { cx } from "@/lib/cx";

/** Sticky bottom action bar: 2.5px Plum top border, Oat Milk, safe-area padding (DESIGN.md §6). */
export function StickyBar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className="sticky bottom-0 z-10 border-t-[2.5px] border-ink bg-bg px-4 pt-3.5 pb-[calc(22px+env(safe-area-inset-bottom))]">
      <div className={cx("mx-auto flex max-w-[560px] gap-2.5", className)}>{children}</div>
    </div>
  );
}
