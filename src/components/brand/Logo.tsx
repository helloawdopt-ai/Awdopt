import { ICON, LOGO } from "./logo-geometry";

type Variant = "primary" | "reversed" | "sticker" | "icon";

type Props = {
  /** Font size of the wordmark in px (DESIGN.md §2 min 20), or the icon's edge length. */
  size?: number;
  variant?: Variant;
  /** Accessible name. Omit when a parent link already carries the label. */
  label?: string;
  className?: string;
};

export function Logo({ size = 22, variant = "primary", label, className }: Props) {
  const a11y = label ? { role: "img", "aria-label": label } : { "aria-hidden": true };

  if (variant === "icon") return <Icon size={size} className={className} a11y={a11y} />;

  const mark = (
    <svg
      viewBox={LOGO.viewBox}
      width={(LOGO.width * size) / 100}
      height={(LOGO.height * size) / 100}
      className={variant === "sticker" ? undefined : className}
      {...a11y}
    >
      <Bubble outline={variant !== "reversed"} stroke={Math.min(3, Math.max(2, size * 0.1))} />
      <path d={LOGO.aw} className="fill-ink" />
      <path d={LOGO.dopt} className={variant === "reversed" ? "fill-bg" : "fill-ink"} />
    </svg>
  );

  if (variant !== "sticker") return mark;
  return (
    <span
      className={`inline-block -rotate-4 rounded-[30px] border-3 border-ink bg-surface px-[0.6em] py-[0.5em] shadow-sticker-xl ${className ?? ""}`}
      style={{ fontSize: size }}
    >
      {mark}
    </span>
  );
}

function Bubble({ outline, stroke }: { outline: boolean; stroke: number }) {
  const { bubble: b, tail } = LOGO;
  return (
    <>
      <rect
        x={b.x}
        y={b.y}
        width={b.w}
        height={b.h}
        rx={b.rx}
        className={outline ? "fill-bubble stroke-ink" : "fill-bubble"}
        strokeWidth={outline ? stroke : 0}
        vectorEffect="non-scaling-stroke"
      />
      <polygon points={tail.fill} className="fill-bubble" />
      {outline && (
        <polyline
          points={tail.line}
          fill="none"
          className="stroke-ink"
          strokeWidth={tail.stroke}
          strokeLinejoin="round"
        />
      )}
    </>
  );
}

function Icon({ size, className, a11y }: { size: number; className?: string; a11y: object }) {
  // At 32px and below: no tail, 1.5px border (DESIGN.md §2).
  const small = size <= 32;
  const border = small ? (1.5 * 100) / size : 3;
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={className} {...a11y}>
      <rect
        x={border / 2}
        y={border / 2}
        width={100 - border}
        height={100 - border}
        rx={22}
        className="fill-primary stroke-ink"
        strokeWidth={border}
      />
      <g transform={`translate(${ICON.x} ${ICON.y}) scale(${ICON.scale})`}>
        {small ? (
          <rect
            x={LOGO.bubble.x}
            y={LOGO.bubble.y}
            width={LOGO.bubble.w}
            height={LOGO.bubble.h}
            rx={LOGO.bubble.rx}
            className="fill-bubble stroke-ink"
            strokeWidth={7}
          />
        ) : (
          <Bubble outline stroke={Math.max(1.5, size / 60)} />
        )}
        <path d={LOGO.aw} className="fill-ink" />
      </g>
    </svg>
  );
}
