"use client";

import { useState } from "react";

/** The adopter's private results link (DESIGN.md §7). Never shows contact details. */
export function PrivateLinkCard({ url }: { url: string }) {
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
  const btn =
    "press inline-flex h-[46px] grow items-center justify-center rounded-full border-2 border-ink text-[15px] font-extrabold no-underline hover:shadow-sticker-sm active:translate-[2px] active:shadow-none";

  return (
    <section className="flex flex-col gap-2.5 rounded-[24px] border-[2.5px] border-ink bg-bg p-4">
      <h2 className="text-[15px] font-extrabold">Your private matches link</h2>
      <output className="flex h-12 items-center overflow-hidden rounded-[14px] border-2 border-dashed border-ink bg-surface px-3 text-[15px] font-bold whitespace-nowrap tabular">
        <span className="truncate">{url}</span>
      </output>
      <div className="flex gap-2">
        <button type="button" onClick={copy} className={`${btn} bg-surface`}>
          {copied ? "Copied" : "Copy link"}
        </button>
        <a href={whatsapp} target="_blank" rel="noopener noreferrer" className={`${btn} bg-fresh`}>
          WhatsApp it to me
        </a>
      </div>
      <span className="sr-only" aria-live="polite">
        {copied ? "Link copied" : ""}
      </span>
      <p className="text-[13px] leading-snug text-muted">
        Anyone with this link can see your matches, so keep it to yourself. It never shows your contact details.
      </p>
    </section>
  );
}
