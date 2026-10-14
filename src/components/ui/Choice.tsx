import type { ComponentProps } from "react";
import { cx } from "@/lib/cx";

type InputProps = Omit<ComponentProps<"input">, "type" | "value" | "name">;
const focusRing = "has-focus-visible:outline-3 has-focus-visible:outline-offset-3 has-focus-visible:outline-ink";

type SegmentedProps = {
  legend: string;
  name: string;
  options: { value: string; label: string }[];
  defaultValue?: string;
  inputProps?: InputProps;
};

/** Segmented control (DESIGN.md §7): radio inputs in a pill split by 2px Plum dividers. */
export function SegmentedControl({ legend, name, options, defaultValue, inputProps }: SegmentedProps) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-[15px] font-extrabold">{legend}</legend>
      <div className="flex overflow-hidden rounded-full border-[2.5px] border-ink bg-surface">
        {options.map((o) => (
          <label
            key={o.value}
            className={cx(
              "flex h-[46px] flex-1 cursor-pointer items-center justify-center border-r-2 border-ink text-sm font-extrabold last:border-r-0",
              "hover:bg-bg has-checked:bg-highlight",
              focusRing,
              "has-focus-visible:-outline-offset-4",
            )}
          >
            <input
              type="radio"
              name={name}
              value={o.value}
              defaultChecked={defaultValue === o.value}
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

type OptionGridProps = {
  legend: string;
  name: string;
  options: { value: string; label: string; hint?: string }[];
  defaultValue?: string;
  inputProps?: InputProps;
};

/** Option cards (questionnaire): a 2×2 grid, bold label + optional one-line hint. Never auto-advances. */
export function OptionGrid({ legend, name, options, defaultValue, inputProps }: OptionGridProps) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-[15px] font-extrabold">{legend}</legend>
      <div className="grid grid-cols-2 gap-2.5">
        {options.map((o) => (
          <label
            key={o.value}
            className={cx(
              "press flex min-h-[84px] cursor-pointer flex-col gap-1 rounded-[18px] border-[2.5px] border-ink bg-surface p-3",
              "hover:bg-bg has-checked:bg-highlight has-checked:shadow-sticker-sm active:translate-[2px] has-checked:active:shadow-none",
              focusRing,
            )}
          >
            <input
              type="radio"
              name={name}
              value={o.value}
              defaultChecked={defaultValue === o.value}
              className="sr-only"
              {...inputProps}
            />
            <span className="text-[15px] font-extrabold">{o.label}</span>
            {o.hint && <span className="text-[13px] leading-snug">{o.hint}</span>}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
