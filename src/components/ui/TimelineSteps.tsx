import type { ReactNode } from "react";

const tints = ["bg-fresh", "bg-bubble", "bg-primary"];

/** Numbered 32px circles (Mint, Bubblegum, Tangerine) + bold lead-in + sentence. */
export function TimelineSteps({ steps }: { steps: { lead: ReactNode; text: ReactNode }[] }) {
  return (
    <ol className="flex flex-col gap-3.5">
      {steps.map((s, i) => (
        <li key={i} className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className={`inline-flex size-8 shrink-0 items-center justify-center rounded-full border-2 border-ink font-extrabold ${tints[i % tints.length]}`}
          >
            {i + 1}
          </span>
          <span className="text-[15px] leading-[1.45]">
            <strong>{s.lead}</strong> {s.text}
          </span>
        </li>
      ))}
    </ol>
  );
}
