"use client";

import { useEffect, useState } from "react";
import { cx } from "@/lib/cx";
import { tints, type Photo } from "./DogPhoto";

/**
 * A below-the-fold card photo that starts loading only after the window `load` event, so it never
 * competes with the LCP photo for bandwidth. Same box before and after (no layout shift);
 * <noscript> keeps the photo for users without JavaScript.
 */
export function DeferredPhoto({ photo, tint = 0, className }: { photo: Photo; tint?: number; className?: string }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const go = () => setReady(true);
    if (document.readyState === "complete") return go();
    window.addEventListener("load", go, { once: true });
    return () => window.removeEventListener("load", go);
  }, []);

  const img = (
    // eslint-disable-next-line @next/next/no-img-element -- pre-sized WebP variants, no image optimizer
    <img {...photo} alt={photo.alt} loading="lazy" decoding="async" className={cx("object-cover", className)} />
  );
  return ready ? (
    img
  ) : (
    <div role="img" aria-label={photo.alt} className={cx(tints[tint % tints.length], className)}>
      <noscript>{img}</noscript>
    </div>
  );
}
