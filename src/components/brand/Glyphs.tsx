import { cx } from "@/lib/cx";

// Custom glyphs from DESIGN.md §5 and §8. Decorative: always aria-hidden.

export function Sparkle({ size = 32, className = "fill-highlight" }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} aria-hidden="true" className={className}>
      <path
        d="M20 0 C22 14 26 18 40 20 C26 22 22 26 20 40 C18 26 14 22 0 20 C14 18 18 14 20 0Z"
        className="stroke-ink"
        strokeWidth={2.5}
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Heart({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="-12 -12 24 22"
      width={size}
      height={(size * 22) / 24}
      aria-hidden="true"
      className={cx("fill-ink", className)}
    >
      <path d="M0 7C-6 2-10-1-10-5C-10-8-7.5-10-5-10C-2.5-10-1-8.5 0-7C1-8.5 2.5-10 5-10C7.5-10 10-8 10-5C10-1 6 2 0 7Z" />
    </svg>
  );
}
