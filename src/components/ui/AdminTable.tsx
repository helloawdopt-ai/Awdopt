import type { ReactNode } from "react";

/**
 * Admin table card (kept simple, DESIGN.md §7): White card, 2px border, 16px radius, Oat Milk header,
 * 1.5px row lines. Scrolls horizontally inside the card on small screens. Wrap a plain <table>.
 */
export function AdminTable({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div
      role="region"
      aria-label={label}
      tabIndex={0}
      className={
        // relative: keeps absolutely positioned content (sr-only headers) inside the scroll area.
        "relative overflow-x-auto rounded-[16px] border-2 border-ink bg-surface " +
        "[&_table]:w-full [&_table]:border-collapse [&_table]:text-sm " +
        "[&_th]:bg-bg [&_th]:px-3.5 [&_th]:py-2.5 [&_th]:text-left [&_th]:whitespace-nowrap " +
        "[&_td]:px-3.5 [&_td]:py-2 [&_tbody_tr]:border-t-[1.5px] [&_tbody_tr]:border-row-line"
      }
    >
      {children}
    </div>
  );
}

/** Native <select> used for the 8 enquiry statuses. */
// 16px text below 1024px, so phones don't zoom on focus.
export const adminSelect =
  "h-11 lg:h-9 rounded-[10px] border-2 border-ink bg-surface px-2 text-base lg:text-sm font-bold text-ink";

export const adminButton =
  "press inline-flex h-11 lg:h-9 items-center rounded-[10px] border-2 border-ink bg-surface px-3 font-bold hover:bg-bg active:translate-[2px]";
