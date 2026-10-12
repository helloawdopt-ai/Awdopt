import { cx } from "@/lib/cx";

type Props = { current: number; total?: number; section: string; prefix?: string };

/** Five 8px segments: done Plum, current Tangerine with Plum outline, upcoming Plum 15%. */
export function Progress({ current, total = 5, section, prefix }: Props) {
  return (
    <div className="flex grow flex-col gap-1.5">
      <span className="text-[13px] font-extrabold" aria-live="polite">
        {prefix ? `${prefix} · ` : ""}Step {current} of {total} · {section}
      </span>
      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: `repeat(${total}, minmax(0, 1fr))` }}
        aria-hidden="true"
      >
        {Array.from({ length: total }, (_, i) => (
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
