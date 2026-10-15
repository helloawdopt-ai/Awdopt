"use client";

import { Link2 } from "lucide-react";
import { useState } from "react";
import { cx } from "@/lib/cx";

/**
 * The adopter's private results link (DESIGN.md §7). "card" is the full card (Sent); "banner" is
 * the compact Butter strip at the top of the results (Results.dc.html). Never shows contact details.
 */
export function PrivateLinkCard({ url, variant = "card" }: { url: string; variant?: "card" | "banner" }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };
  const whatsapp = `https://wa.me/?text=${encodeURIComponent(`My AWDOPT matches: ${url}`)}`;
  const banner = variant === "banner";
  const btn = cx(
    "press inline-flex items-center justify-center rounded-full border-2 border-ink font-extrabold no-underline hover:shadow-sticker-sm active:translate-[2px] active:shadow-none",
    banner ? "h-11 px-3 text-sm" : "h-[46px] grow text-[15px]",
  );
  const status = (
    <span className="sr-only" aria-live="polite">
      {copied ? "Link copied" : ""}
    </span>
  );

  if (banner) {
    return (
      <section className="flex flex-wrap items-center gap-3 rounded-[20px] border-[2.5px] border-ink bg-highlight px-3.5 py-3">
        <Link2 size={22} strokeWidth={2.2} className="shrink-0" aria-hidden="true" />
        <p className="min-w-[160px] flex-1 text-sm leading-snug font-semibold">
          No account needed. Save your private link to come back anytime.
        </p>
        <div className="flex gap-2">
          <button type="button" onClick={copy} className={cx(btn, "bg-surface")}>
            {copied ? "Copied" : "Copy"}
          </button>
          <a href={whatsapp} target="_blank" rel="noopener noreferrer" className={cx(btn, "bg-fresh")}>
            WhatsApp
          </a>
        </div>
        {status}
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-2.5 rounded-[24px] border-[2.5px] border-ink bg-bg p-4">
      <h2 className="text-[15px] font-extrabold">Your private matches link</h2>
      <output className="flex h-12 items-center overflow-hidden rounded-[14px] border-2 border-dashed border-ink bg-surface px-3 text-[15px] font-bold whitespace-nowrap tabular">
        <span className="truncate">{url}</span>
      </output>
      <div className="flex gap-2">
        <button type="button" onClick={copy} className={cx(btn, "bg-surface")}>
          {copied ? "Copied" : "Copy link"}
        </button>
        <a href={whatsapp} target="_blank" rel="noopener noreferrer" className={cx(btn, "bg-fresh")}>
          WhatsApp it to me
        </a>
      </div>
      {status}
      <p className="text-[13px] leading-snug text-muted">
        Anyone with this link can see your matches, so keep it to yourself. It never shows your contact details.
      </p>
    </section>
  );
}
