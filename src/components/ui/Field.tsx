import type { ComponentProps, ReactNode } from "react";
import { cx } from "@/lib/cx";

type Common = {
  label: string;
  id: string;
  optional?: boolean;
  error?: string;
  hint?: ReactNode;
};

const control =
  "w-full rounded-[16px] border-[2.5px] border-ink bg-surface px-3.5 text-base text-ink placeholder:text-muted " +
  "aria-invalid:ring-3 aria-invalid:ring-highlight";

function Shell({ label, id, optional, error, hint, children }: Common & { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-extrabold">
        {label} {optional && <span className="font-medium text-muted">(optional)</span>}
      </label>
      {children}
      {hint && !error && (
        <span id={`${id}-hint`} className="text-[13px] text-muted">
          {hint}
        </span>
      )}
      {error && (
        <span id={`${id}-error`} className="flex items-start gap-2 text-sm">
          <span
            aria-hidden="true"
            className="mt-px inline-flex size-5 shrink-0 items-center justify-center rounded-full border-[1.5px] border-ink bg-primary text-xs font-extrabold"
          >
            !
          </span>
          {error}
        </span>
      )}
    </div>
  );
}

const describedBy = (id: string, error?: string, hint?: ReactNode) =>
  error ? `${id}-error` : hint ? `${id}-hint` : undefined;

/** Label always above; 52px tall; error below with an icon and a Butter ring (DESIGN.md §7). */
export function Input({ label, id, optional, error, hint, className, ...props }: Common & ComponentProps<"input">) {
  return (
    <Shell {...{ label, id, optional, error, hint }}>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
        className={cx(control, "h-[52px]", className)}
        {...props}
      />
    </Shell>
  );
}

export function Textarea({
  label,
  id,
  optional,
  error,
  hint,
  className,
  ...props
}: Common & ComponentProps<"textarea">) {
  return (
    <Shell {...{ label, id, optional, error, hint }}>
      <textarea
        id={id}
        rows={3}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
        className={cx(control, "resize-none py-3", className)}
        {...props}
      />
    </Shell>
  );
}

/** Native 24px checkbox, Tangerine accent, clickable label. Consent boxes are never pre-ticked. */
export function Checkbox({
  id,
  children,
  ...props
}: { id: string; children: ReactNode } & Omit<ComponentProps<"input">, "type" | "defaultChecked" | "checked">) {
  return (
    <div className="flex items-start gap-2.5 text-sm leading-snug">
      <input id={id} type="checkbox" className="mt-px size-6 shrink-0 accent-primary" {...props} />
      <label htmlFor={id}>{children}</label>
    </div>
  );
}
