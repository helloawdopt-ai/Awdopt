import { ENERGY_LABEL, dogMeta } from "@/lib/dog-format";
import { toPhoto } from "@/lib/photo-url";
import type { DogCardData } from "@/lib/server/dogs";
import { DogCard } from "./DogCard";

const SIZES = "(min-width: 1280px) 290px, (min-width: 768px) 45vw, 100vw";

/** Discovery grid items. `start` keeps tints and the single high-priority image stable across pages. */
export function DogCards({ dogs, start = 0 }: { dogs: DogCardData[]; start?: number }) {
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
        photo={d.photos[0] ? toPhoto(d.photos[0], `Photo of ${d.name}`, SIZES) : null}
        priority={start + i === 0}
        tint={start + i}
      />
    </li>
  ));
}
