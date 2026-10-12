"use client";

import { X } from "lucide-react";
import { useId, useRef, type ReactNode } from "react";
import { cx } from "@/lib/cx";

type Props = {
  title: string;
  /** Content of the button that opens the sheet. */
  trigger: ReactNode;
  triggerClassName?: string;
  /** Sticky footer, e.g. Clear + "Show N dogs". */
  footer?: ReactNode;
  children: ReactNode;
};

// Native <dialog>: showModal() makes the page inert, Esc closes, and focus returns to the trigger.
// Tapping the scrim closes it too. Slides up 220ms (DESIGN.md §9).
export function BottomSheet({ title, trigger, triggerClassName, footer, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  return (
    <>
      <button type="button" className={triggerClassName} onClick={() => ref.current?.showModal()}>
        {trigger}
      </button>
      <dialog
        ref={ref}
        aria-labelledby={titleId}
        onClick={(e) => e.target === ref.current && ref.current.close()}
        className={cx(
          "fixed inset-x-0 top-auto bottom-0 mx-auto m-0 h-auto max-h-[92dvh] w-full max-w-[640px] overflow-hidden p-0 text-ink",
          "rounded-t-[28px] border-0 border-t-[2.5px] border-ink bg-bg",
          "translate-y-0 transition-[translate,overlay,display] transition-discrete duration-[220ms] ease-sticker starting:open:translate-y-full",
          "backdrop:bg-scrim backdrop:transition-opacity backdrop:duration-150 starting:open:backdrop:opacity-0",
        )}
      >
        <div className="flex max-h-[92dvh] flex-col">
          <span aria-hidden="true" className="mt-2.5 h-[5px] w-11 self-center rounded-full bg-ink/30" />
          <div className="flex items-center justify-between px-4 pt-2.5 pb-1.5">
            <h2 id={titleId} className="font-display text-[22px] font-extrabold tracking-[-0.03em]">
              {title}
            </h2>
            <button
              type="button"
              aria-label="Close"
              onClick={() => ref.current?.close()}
              className="press inline-flex size-11 items-center justify-center rounded-[14px] border-2 border-ink bg-surface hover:shadow-sticker-sm active:translate-[2px] active:shadow-none"
            >
              <X size={18} strokeWidth={2.6} aria-hidden="true" />
            </button>
          </div>
          <div className="min-h-0 grow overflow-y-auto overscroll-contain px-4 pt-1.5 pb-4">{children}</div>
          {footer && (
            <div className="flex gap-2.5 border-t-[2.5px] border-ink px-4 pt-3 pb-[calc(22px+env(safe-area-inset-bottom))]">
              {footer}
            </div>
          )}
        </div>
      </dialog>
    </>
  );
}
