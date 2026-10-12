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

/** Stand-in hero dog (an Indie, sticker style) until the client's real photo arrives. Decorative. */
export function DogSticker({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 200"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden="true"
      className={cx("stroke-ink [stroke-linecap:round] [stroke-linejoin:round]", className)}
    >
      <path d="M34 204 C38 154 66 136 100 136 C134 136 162 154 166 204 Z" className="fill-peach" strokeWidth={4} />
      <path d="M64 142 Q100 162 136 142 L138 155 Q100 177 62 155 Z" className="fill-fresh" strokeWidth={3.5} />
      <circle cx="100" cy="172" r="8" className="fill-highlight" strokeWidth={3} />
      <path d="M60 78 Q42 40 50 22 Q58 16 94 50 Z" className="fill-peach" strokeWidth={4} />
      <path d="M140 78 Q158 40 150 22 Q142 16 106 50 Z" className="fill-peach" strokeWidth={4} />
      <path d="M64 66 Q54 44 58 34 Q66 34 82 53 Z" className="fill-bubble stroke-none" />
      <path d="M136 66 Q146 44 142 34 Q134 34 118 53 Z" className="fill-bubble stroke-none" />
      <path
        d="M100 42 C136 42 150 68 148 94 C146 112 138 122 128 128 C120 140 112 146 100 146 C88 146 80 140 72 128 C62 122 54 112 52 94 C50 68 64 42 100 42 Z"
        className="fill-peach"
        strokeWidth={4}
      />
      <path d="M70 74 Q78 68 86 72" className="fill-none" strokeWidth={3} />
      <path d="M114 72 Q122 68 130 74" className="fill-none" strokeWidth={3} />
      <path
        d="M100 96 C118 96 130 106 130 120 C130 134 116 142 100 142 C84 142 70 134 70 120 C70 106 82 96 100 96 Z"
        className="fill-surface"
        strokeWidth={3}
      />
      <circle cx="80" cy="88" r="6.5" className="fill-ink stroke-none" />
      <circle cx="120" cy="88" r="6.5" className="fill-ink stroke-none" />
      <circle cx="82.5" cy="85.5" r="2.2" className="fill-surface stroke-none" />
      <circle cx="122.5" cy="85.5" r="2.2" className="fill-surface stroke-none" />
      <path d="M86 104 Q100 96 114 104 Q110 116 100 117 Q90 116 86 104 Z" className="fill-ink stroke-none" />
      <circle cx="94" cy="104" r="2.5" className="fill-surface stroke-none" />
      <path d="M92 126 Q91 150 100 150 Q109 150 108 126 Z" className="fill-bubble" strokeWidth={2.5} />
      <path d="M100 130 L100 142" className="fill-none" strokeWidth={2} />
      <path d="M100 117 L100 124 M84 122 Q92 132 100 124 Q108 132 116 122" className="fill-none" strokeWidth={3} />
    </svg>
  );
}
