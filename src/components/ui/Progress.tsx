import { cx } from "@/lib/cx";

const TOTAL = 5;

/** Five 8px segments: done Plum, current Tangerine with Plum outline, upcoming Plum 15%. */
export function Progress({ current, section, prefix }: { current: number; section: string; prefix?: string }) {
  return (
    <div className="flex grow flex-col gap-1.5">
      <span className="text-[13px] font-extrabold" aria-live="polite">
        {prefix ? `${prefix} · ` : ""}Step {current} of {TOTAL} · {section}
      </span>
      <div className="grid grid-cols-5 gap-1" aria-hidden="true">
        {Array.from({ length: TOTAL }, (_, i) => (
          <span
            key={i}
            className={cx(
              "h-2 rounded",
              i + 1 < current && "bg-ink",
              i + 1 === current && "border-[1.5px] border-ink bg-primary",
              i + 1 > current && "bg-ink/15",
            )}
          />
        ))}
      </div>
    </div>
  );
}
