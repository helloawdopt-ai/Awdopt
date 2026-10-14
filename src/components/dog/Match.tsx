import Link from "next/link";
import type { ReactNode } from "react";
import { cx } from "@/lib/cx";
import { NOT_KNOWN } from "@/lib/dog-format";
import { DogPhoto, type Photo } from "./DogPhoto";

/** Match level from DESIGN.md §3: 85+ Great fit (Mint), 70–84 Good fit (Butter), else Worth a look. */
export function fitLevel(score: number) {
  if (score >= 85) return { label: "Great fit", tone: "bg-fresh" } as const;
  if (score >= 70) return { label: "Good fit", tone: "bg-highlight" } as const;
  return { label: "Worth a look", tone: "bg-surface" } as const;
}

export function LimitedInfoTag() {
  return (
    <span className="self-start rounded-full border-[1.5px] border-dashed border-ink px-2 py-0.5 text-xs font-bold">
      Based on limited info
    </span>
  );
}

type MatchRowProps = {
  href: string;
  rank: number;
  name: string;
  meta: string;
  reason: string;
  score: number;
  /** Share of weight that could be answered, 0–1. Below 0.7 shows the limited-info tag. */
  confidence: number;
  photo?: Photo | null;
  tint?: number;
};

/** Results row. #1 gets the 5px shadow, the rest 3px. */
export function MatchRow({ href, rank, name, meta, reason, score, confidence, photo, tint }: MatchRowProps) {
  const level = fitLevel(score);
  return (
    <Link
      href={href}
      className={cx(
        "press flex items-center gap-3 rounded-[22px] border-[2.5px] border-ink bg-surface p-3 text-ink no-underline hover:-translate-px active:translate-[2px]",
        rank === 1
          ? "shadow-sticker-lg hover:shadow-sticker-6 active:shadow-sticker-sm"
          : "shadow-sticker-sm hover:shadow-sticker active:shadow-none",
      )}
    >
      <DogPhoto
        photo={photo}
        name={name}
        tint={tint}
        priority={rank === 1}
        className="size-[84px] shrink-0 rounded-[16px] border-2 border-ink [&_span]:hidden"
      />
      <div className="flex min-w-0 grow flex-col gap-[3px]">
        <div className="flex items-baseline gap-1.5">
          <span className="text-[13px] font-extrabold text-muted">#{rank}</span>
          <h3 className="truncate font-display text-[19px] font-extrabold tracking-[-0.03em]">{name}</h3>
        </div>
        <span className="text-[13px] text-muted">{meta}</span>
        <span className="text-[13px] leading-snug">{reason}</span>
        {confidence < 0.7 && <LimitedInfoTag />}
      </div>
      <div className="flex shrink-0 flex-col items-center gap-1">
        <span className="font-display text-xl font-extrabold tracking-[-0.03em] tabular">
          {score}%<span className="sr-only"> match,</span>
        </span>
        <span
          className={cx(
            "rounded-full border-[1.5px] border-ink px-[7px] py-0.5 text-[11px] font-extrabold whitespace-nowrap",
            level.tone,
          )}
        >
          {level.label}
        </span>
      </div>
    </Link>
  );
}

/** "aww." score sticker, tilted 5°, overlapping a photo corner (parent positions it). */
export function ScoreSticker({ score, className }: { score: number; className?: string }) {
  return (
    <div
      className={cx(
        "inline-flex rotate-5 flex-col items-start rounded-[24px] border-[2.5px] border-ink bg-bubble px-4 py-2.5 text-ink shadow-sticker-lg",
        className,
      )}
    >
      <span className="font-display text-sm font-bold" aria-hidden="true">
        aww.
      </span>
      <span className="font-display text-[34px] leading-none font-extrabold tracking-[-0.04em] tabular">
        {score}%<span className="sr-only"> match, {fitLevel(score).label.toLowerCase()}</span>
      </span>
    </div>
  );
}

type CategoryBarProps = {
  label: string;
  /** e.g. "25%" */
  weight: string;
  /** 0–100, or null when it couldn't be scored. */
  score: number | null;
  /** Shown instead of "Not known yet" when nothing is missing: "Doesn't apply", "No preference". */
  note?: string | null;
};

/**
 * One of the 8 category bars. Mint at 90+, Butter below. Unknown: dashed track + "Not known yet".
 * With a note ("Doesn't apply", "No preference"): plain empty track, because nothing is missing.
 */
export function CategoryBar({ label, weight, score, note }: CategoryBarProps) {
  const unknown = score === null && !note;
  return (
    <div className="flex flex-col gap-[5px]">
      <div className="flex justify-between gap-3 text-sm">
        <span className="font-bold">
          {label} <span className="font-medium text-muted">· {weight}</span>
        </span>
        <span className={cx("shrink-0 tabular", score === null ? "font-medium text-muted" : "font-extrabold")}>
          {score ?? note ?? NOT_KNOWN}
        </span>
      </div>
      <div
        aria-hidden="true"
        className={cx(
          "h-2.5 overflow-hidden rounded-[5px] border-[1.5px] border-ink bg-bg",
          unknown && "border-dashed",
        )}
      >
        {score !== null && (
          <div className={cx("h-full", score >= 90 ? "bg-fresh" : "bg-highlight")} style={{ width: `${score}%` }} />
        )}
      </div>
    </div>
  );
}

/** 22px circle icon: a Mint tick ("why") or a Butter "i" ("consider"). */
export function ReasonIcon({ kind }: { kind: "why" | "consider" }) {
  return (
    <svg viewBox="0 0 24 24" width={22} height={22} className="shrink-0" aria-hidden="true">
      <circle
        cx="12"
        cy="12"
        r="10"
        className={cx(kind === "why" ? "fill-fresh" : "fill-highlight", "stroke-ink")}
        strokeWidth={2}
      />
      <path
        d={kind === "why" ? "M7.5 12.5l3 3 6-6.5" : "M12 11v5M12 8h.01"}
        fill="none"
        className="stroke-ink"
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Reason line: Mint tick for "Why this could work", Butter "i" for "Things to consider". */
export function ReasonLine({ kind, children }: { kind: "why" | "consider"; children: ReactNode }) {
  return (
    <li className="flex gap-2.5 text-[15px] leading-[1.45]">
      <ReasonIcon kind={kind} />
      <span>{children}</span>
    </li>
  );
}
