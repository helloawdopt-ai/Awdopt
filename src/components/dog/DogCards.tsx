import { ENERGY_LABEL, dogMeta } from "@/lib/dog-format";
import { preloadPhoto, toPhoto } from "@/lib/photo-url";
import type { DogCardData } from "@/lib/server/dogs";
import { DogCard } from "./DogCard";

// Phones get the 480px file (up to ~1.8x density) for a lighter LCP on the 210px-tall card.
const SIZES = "(min-width: 1280px) 290px, (min-width: 768px) 45vw, 270px";

/** Discovery grid items. `start` keeps tints stable across "Load more" pages. */
export function DogCards({ dogs, start = 0 }: { dogs: DogCardData[]; start?: number }) {
  const photos = dogs.map((d) => (d.photos[0] ? toPhoto(d.photos[0], `Photo of ${d.name}`, SIZES) : null));
  // The LCP is the first card that has a photo; only the first page gets a high-priority image.
  const lcp = start === 0 ? photos.findIndex(Boolean) : -1;
  if (lcp >= 0) preloadPhoto(photos[lcp]!);
  return dogs.map((d, i) => (
    <li key={d.id} className="[contain-intrinsic-size:auto_380px] [content-visibility:auto]">
      <DogCard
        href={`/dogs/${d.slug}`}
        name={d.name}
        locality={d.locality}
        meta={dogMeta(d)}
        summary={d.temperament}
        energy={d.energy && ENERGY_LABEL[d.energy]}
        urgent={d.urgent}
        photo={photos[i]}
        priority={i === lcp}
        defer={start === 0 && i >= 2}
        tint={start + i}
      />
    </li>
  ));
}
