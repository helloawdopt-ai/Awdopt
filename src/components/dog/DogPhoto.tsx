import { Camera } from "lucide-react";
import { cx } from "@/lib/cx";

export type Photo = { src: string; srcSet?: string; sizes?: string; width: number; height: number; alt: string };

const tints = ["bg-highlight", "bg-bubble", "bg-fresh", "bg-peach"];

/** Real photo, or a tinted placeholder only while it's missing (DESIGN.md §7). */
export function DogPhoto({
  photo,
  name,
  tint = 0,
  priority = false,
  className,
}: {
  photo?: Photo | null;
  name: string;
  tint?: number;
  priority?: boolean;
  className?: string;
}) {
  if (photo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- pre-sized WebP variants, no image optimizer
      <img
        {...photo}
        alt={photo.alt}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : undefined}
        decoding="async"
        className={cx("object-cover", className)}
      />
    );
  }
  return (
    <div
      role="img"
      aria-label={`No photo of ${name} yet`}
      className={cx(
        "flex flex-col items-center justify-center gap-1.5 text-muted",
        tints[tint % tints.length],
        className,
      )}
    >
      <Camera size={26} strokeWidth={1.8} aria-hidden="true" />
      <span className="text-xs font-bold" aria-hidden="true">
        Photo coming soon
      </span>
    </div>
  );
}
