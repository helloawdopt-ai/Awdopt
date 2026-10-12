import Link from "next/link";
import { DogPhoto, type Photo } from "./DogPhoto";

type Props = {
  href: string;
  name: string;
  locality: string;
  /** e.g. "Male · 2 yrs · Indie · Medium" */
  meta: string;
  summary: string;
  energy: string;
  photo?: Photo | null;
  priority?: boolean;
  tint?: number;
};

/** Discovery card: one link, 210px photo, Plum divider, name + locality, meta, one-line summary. */
export function DogCard({ href, name, locality, meta, summary, energy, photo, priority, tint }: Props) {
  return (
    <Link
      href={href}
      className="press flex flex-col overflow-hidden rounded-[24px] border-[2.5px] border-ink bg-surface text-ink no-underline shadow-sticker-lg hover:-translate-px hover:shadow-sticker-6 active:translate-[2px] active:shadow-sticker-sm"
    >
      <div className="relative h-[210px] border-b-[2.5px] border-ink">
        <DogPhoto photo={photo} name={name} tint={tint} priority={priority} className="size-full" />
        <span className="absolute top-3 right-3 rounded-full border-2 border-ink bg-surface px-2.5 py-1 text-[13px] font-extrabold">
          {energy}
        </span>
      </div>
      <div className="flex flex-col gap-1 px-4 pt-3.5 pb-4">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="font-display text-xl font-extrabold tracking-[-0.03em]">{name}</h3>
          <span className="text-[13px] font-bold text-muted">{locality}</span>
        </div>
        <p className="text-sm text-muted">{meta}</p>
        <p className="mt-1 text-[15px] leading-[1.4]">{summary}</p>
      </div>
    </Link>
  );
}
