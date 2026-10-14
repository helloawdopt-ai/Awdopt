import { Sparkle } from "@/components/brand/Glyphs";
import { ReasonIcon } from "@/components/dog/Match";
import { CATEGORIES } from "@/lib/explanations";

/** "sniffing out your matches…" (Matching.dc.html): shown while the answers save and the results load. */
export function Matching({ total }: { total: number | null }) {
  return (
    <div role="status" className="fixed inset-0 z-20 overflow-y-auto bg-fresh">
      <div className="relative mx-auto flex min-h-dvh max-w-[560px] flex-col gap-[22px] px-5 pt-16 pb-6">
        <Sparkle size={44} className="absolute top-10 right-9 fill-highlight" />
        <p className="-rotate-4 self-start rounded-[26px] border-[2.5px] border-ink bg-bubble px-5 py-4 font-display text-[26px] leading-[1.15] font-extrabold tracking-[-0.03em] shadow-sticker-lg">
          sniffing out
          <br />
          your matches…
        </p>
        <p className="text-base leading-normal">
          {total ? `Scoring ${total} ${total === 1 ? "dog" : "dogs"}` : "Scoring every available dog"} against your
          answers. Dogs that can&rsquo;t safely live with you are left out, not ranked low.
        </p>
        <div className="relative">
          <Sparkle size={26} className="absolute -top-4 -right-2 fill-bubble" />
          <ul className="flex flex-col gap-1 rounded-[24px] border-[2.5px] border-ink bg-surface px-4 py-3.5 shadow-sticker-lg">
            {CATEGORIES.map((c, i) => (
              <li
                key={c.key}
                className="flex h-[38px] items-center justify-between border-b-[1.5px] border-dashed border-ink/15 text-[15px] font-bold last:border-b-0"
              >
                {c.label}
                <span className="animate-tick" style={{ animationDelay: `${i * 120}ms` }}>
                  <ReasonIcon kind="why" />
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
