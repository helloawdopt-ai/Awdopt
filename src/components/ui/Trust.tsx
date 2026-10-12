import { Lock } from "lucide-react";
import type { ReactNode } from "react";

/** Mint trust panel. Sits next to every form that collects personal data. Calm zone: no tilt, no jokes. */
export function TrustPanel({
  children,
  heading = "How we handle your details",
}: {
  children: ReactNode;
  heading?: string;
}) {
  return (
    <section className="flex flex-col gap-1.5 rounded-[20px] border-[2.5px] border-ink bg-fresh px-3.5 py-3">
      <h2 className="flex items-center gap-2 text-sm font-extrabold">
        <Lock size={16} strokeWidth={2.25} aria-hidden="true" />
        {heading}
      </h2>
      <div className="text-[13px] leading-[1.45]">{children}</div>
    </section>
  );
}

/** 18px lock + Mauve 13px sentence, under hero CTAs and lister names. */
export function TrustLine({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-start gap-2.5 text-[13px] leading-[1.45] text-muted">
      <Lock size={18} strokeWidth={2.25} className="mt-px shrink-0 text-ink" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}
