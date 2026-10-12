import type { Photo } from "@/components/dog/DogPhoto";

export type PhotoRow = { position: number; w480: string; w960: string; w1600: string; width: number; height: number };

const base = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/dog-photos/`;

/** Pre-sized variants instead of an image optimizer (Hobby quotas). */
export function toPhoto(p: PhotoRow, alt: string, sizes: string): Photo {
  return {
    src: base + p.w960,
    srcSet: `${base + p.w480} 480w, ${base + p.w960} 960w, ${base + p.w1600} 1600w`,
    sizes,
    width: p.width,
    height: p.height,
    alt,
  };
}
