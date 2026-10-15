import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Heart } from "@/components/brand/Glyphs";
import { ScoreSticker } from "@/components/dog/Match";
import { DogProfile } from "@/components/dog/Profile";
import { ButtonLink } from "@/components/ui/Button";
import { getDog, isSlug } from "@/lib/server/dogs";
import { getResults } from "@/lib/server/matches";

export const metadata: Metadata = { title: "Dog profile", robots: { index: false, follow: false } };

type Props = { params: Promise<{ token: string; dogSlug: string }> };

/** The full profile reached from results: score sticker on the photo and "I'm Interested". */
export default async function Page({ params }: Props) {
  const { token, dogSlug } = await params;
  if (!isSlug(dogSlug)) notFound();
  const [results, dog] = await Promise.all([getResults(token, dogSlug), getDog(dogSlug)]);
  const m = results?.matches[0];
  if (!m || !dog) notFound();

  const base = `/r/${token}/${dogSlug}`;
  return (
    <DogProfile
      dog={dog}
      back={{ href: base, label: `Back to you and ${dog.name}` }}
      sticker={<ScoreSticker score={Math.round(m.score)} />}
      cta={
        <ButtonLink href={`${base}/interested`} className="grow">
          <Heart size={20} />
          I&rsquo;m Interested
        </ButtonLink>
      }
    />
  );
}
