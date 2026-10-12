import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cx } from "@/lib/cx";

type Variant = "primary" | "secondary" | "ghost";

// DESIGN.md §5/§7: 2.5px Plum border, pill, Plum text (never white on Tangerine).
// Hover lifts 1px; press moves 2px into the page and the shadow shrinks.
const base =
  "press inline-flex select-none items-center justify-center gap-2 rounded-full border-[2.5px] border-ink px-6 font-extrabold text-ink no-underline " +
  "h-[54px] text-[17px] lg:h-12 lg:text-base " +
  "disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none " +
  "aria-disabled:pointer-events-none aria-disabled:opacity-40 aria-disabled:shadow-none";

// not-disabled: is :not(:disabled), so it also matches <a>.
const variants: Record<Variant, string> = {
  primary:
    "bg-primary shadow-sticker not-disabled:hover:-translate-px not-disabled:hover:shadow-sticker-lg not-disabled:active:translate-[2px] not-disabled:active:shadow-sticker-2",
  secondary:
    "bg-surface not-disabled:hover:-translate-px not-disabled:hover:shadow-sticker-sm not-disabled:active:translate-[2px] not-disabled:active:shadow-none",
  ghost: "border-transparent bg-transparent not-disabled:hover:border-ink not-disabled:active:translate-[2px]",
};

type ButtonProps = ComponentProps<"button"> & { variant?: Variant };

export function Button({ variant = "primary", className, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={cx(base, variants[variant], className)} {...props} />;
}

type ButtonLinkProps = ComponentProps<typeof Link> & { variant?: Variant };

export function ButtonLink({ variant = "primary", className, ...props }: ButtonLinkProps) {
  return <Link className={cx(base, variants[variant], className)} {...props} />;
}

type IconButtonProps = {
  /** Required: icon-only buttons always carry an accessible name. */
  label: string;
  children: ReactNode;
  /** "menu" is the Butter button with a hard shadow; "plain" is the White back/close button. */
  tone?: "menu" | "plain";
  className?: string;
} & ({ href: string } | ({ href?: undefined } & Omit<ComponentProps<"button">, "children">));

const iconBase =
  "press inline-flex size-11 shrink-0 items-center justify-center rounded-[14px] border-2 border-ink text-ink hover:-translate-px active:translate-[2px]";
const iconTone = {
  menu: "bg-highlight shadow-sticker-sm hover:shadow-sticker active:shadow-none",
  plain: "bg-surface hover:shadow-sticker-sm active:shadow-none",
};

export function IconButton({ label, children, tone = "plain", className, ...rest }: IconButtonProps) {
  const cls = cx(iconBase, iconTone[tone], className);
  if (rest.href !== undefined) {
    return (
      <Link href={rest.href} aria-label={label} className={cls}>
        {children}
      </Link>
    );
  }
  const { type = "button", ...buttonProps } = rest;
  return (
    <button type={type} aria-label={label} className={cls} {...buttonProps}>
      {children}
    </button>
  );
}
