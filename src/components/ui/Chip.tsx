import Link from "next/link";
import { X } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cx } from "@/lib/cx";

export const overline = "text-[13px] font-extrabold uppercase tracking-[0.08em] text-muted";

type Option = { value: string; label: ReactNode };

type ChipGroupProps = {
  legend: string;
  name: string;
  options: Option[];
  /** checkbox for filters (multi), radio for single-choice questions. */
  type?: "checkbox" | "radio";
  defaultValue?: string | string[];
  /** Spread onto every input, e.g. react-hook-form's register(name). */
  inputProps?: Omit<ComponentProps<"input">, "type" | "value" | "name">;
};

// Filter chips (DESIGN.md §7). Native inputs styled as chips, so they work in a plain GET form
// (filter state lands in the URL query) and with react-hook-form. Selected: Butter + 3px shadow.
export function ChipGroup({ legend, name, options, type = "checkbox", defaultValue, inputProps }: ChipGroupProps) {
  const selected = new Set([defaultValue ?? []].flat());
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className={cx(overline, "mb-2")}>{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <label
            key={o.value}
            className={cx(
              "press inline-flex h-11 cursor-pointer items-center rounded-full border-2 border-ink bg-surface px-4 text-[15px] font-bold",
              "hover:bg-bg has-checked:bg-highlight has-checked:shadow-sticker-sm active:translate-[2px] has-checked:active:shadow-none",
              "has-focus-visible:outline-3 has-focus-visible:outline-offset-3 has-focus-visible:outline-ink",
            )}
          >
            <input
              type={type}
              name={name}
              value={o.value}
              defaultChecked={selected.has(o.value)}
              className="sr-only"
              {...inputProps}
            />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** Applied-filter chip: a link that removes the filter. */
export function RemovableChip({ href, children, label }: { href: string; children: ReactNode; label: string }) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="press inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full border-2 border-ink bg-highlight px-3 text-sm font-bold no-underline hover:shadow-sticker-sm active:translate-[2px] active:shadow-none"
    >
      {children}
      <X size={14} strokeWidth={2.6} aria-hidden="true" />
    </Link>
  );
}

const statusTone = {
  fresh: "bg-fresh",
  highlight: "bg-highlight",
  bubble: "bg-bubble",
  plain: "bg-surface",
} as const;

/** Small status chip (11–13px, 1.5px border). */
export function StatusChip({ tone = "plain", children }: { tone?: keyof typeof statusTone; children: ReactNode }) {
  return (
    <span
      className={cx(
        "inline-flex items-center whitespace-nowrap rounded-full border-[1.5px] border-ink px-2 py-px text-xs font-extrabold",
        statusTone[tone],
      )}
    >
      {children}
    </span>
  );
}
