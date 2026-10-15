import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Heart } from "@/components/brand/Glyphs";
import { DogPhoto } from "@/components/dog/DogPhoto";
import { CategoryBar, LimitedInfoTag, ReasonLine, ScoreSticker, fitLevel } from "@/components/dog/Match";
import { ButtonLink, IconButton } from "@/components/ui/Button";
import { overline } from "@/components/ui/Chip";
import { StickyBar } from "@/components/ui/StickyBar";
import { cx } from "@/lib/cx";
import { CATEGORIES, emptyNote, explain } from "@/lib/explanations";
import { preloadPhoto, toPhoto } from "@/lib/photo-url";
import { getResults } from "@/lib/server/matches";

// Private: /r/* sends no-referrer, no-store and X-Robots-Tag: noindex (next.config.ts).
export const metadata: Metadata = { title: "Your match", robots: { index: false, follow: false } };

type Props = { params: Promise<{ token: string; dogSlug: string }> };

/** Match detail (Why.dc.html): score, all 8 bars, why this could work / things to consider. */
export default async function Page({ params }: Props) {
  const { token, dogSlug } = await params;
  const results = await getResults(token, dogSlug);
  const m = results?.matches[0];
  if (!results || !m) notFound();

  const { adopter, weights } = results;
  const dog = m.dog;
  const score = Math.round(m.score);
  const level = fitLevel(score);
  const { why, consider } = explain(m, adopter);
  const total = Object.values(weights).reduce((a, b) => a + b, 0) || 1;
  // Categories with a note (doesn't apply, no preference) aren't missing anything, so they aren't counted.
  const applicable = CATEGORIES.filter((c) => !emptyNote(c.key, adopter));
  const answered = applicable.filter((c) => m.categories[c.key] !== null).length;
  const basis =
    answered === applicable.length
      ? `Based on all ${answered} categories${answered < CATEGORIES.length ? " that apply" : ""}. Nothing was guessed.`
      : `Based on ${answered} of ${applicable.length} categories. The rest aren't known yet, so they don't count.`;
  const base = `/r/${token}/${dog.slug}`;
  const photo = dog.photo ? toPhoto(dog.photo, `Photo of ${dog.name}`, "(min-width: 560px) 528px, 100vw") : null;
  if (photo) preloadPhoto(photo);

  return (
    <>
      <div className="mx-auto flex max-w-[560px] flex-col gap-4 px-4 pt-3 pb-8">
        <header className="flex h-14 items-center gap-3">
          <IconButton href={`/r/${token}`} label="Back to your matches">
            <ChevronLeft size={20} strokeWidth={2.4} aria-hidden="true" />
          </IconButton>
          <p className="text-[17px] font-extrabold">You &amp; {dog.name}</p>
        </header>
        <main className="flex flex-col gap-4">
          <div className="relative">
            <DogPhoto
              photo={photo}
              name={dog.name}
              priority
              className="h-[210px] w-full rounded-[24px] border-[2.5px] border-ink"
            />
            <ScoreSticker score={score} className="absolute -right-1.5 -bottom-[22px]" />
          </div>

          <div className="mt-1 flex flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-[26px] leading-tight font-extrabold tracking-[-0.04em]">
                {level.label}
                <span className="sr-only">
                  {" "}
                  with {dog.name}, {score}% match
                </span>
              </h1>
              <span className={cx("rounded-full border-2 border-ink px-2.5 py-0.5 text-xs font-extrabold", level.tone)}>
                {level.range}
              </span>
            </div>
            <p className="text-sm text-muted">{basis}</p>
            {m.confidence < 0.7 && <LimitedInfoTag />}
          </div>

          <section
            aria-label="Score by category"
            className="flex flex-col gap-[11px] rounded-[22px] border-[2.5px] border-ink bg-surface px-4 py-3.5"
          >
            {CATEGORIES.map((c) => {
              const s = m.categories[c.key];
              return (
                <CategoryBar
                  key={c.key}
                  label={c.label}
                  weight={`${Math.round((weights[c.key] / total) * 100)}%`}
                  score={s === null ? null : Math.round(s * 100)}
                  note={emptyNote(c.key, adopter)}
                />
              );
            })}
          </section>

          {(
            [
              [
                "why",
                "Why this could work",
                why,
                `Nothing stands out yet. Meeting ${dog.name} is the best way to find out.`,
              ],
              [
                "consider",
                "Things to consider",
                consider,
                `Nothing stood out. Meeting ${dog.name} is still the best test.`,
              ],
            ] as const
          ).map(([kind, title, lines, fallback]) => (
            <section key={kind} className="flex flex-col gap-2.5">
              <h2 className={overline}>{title}</h2>
              <ul className="flex flex-col gap-2.5">
                {(lines.length ? lines : [fallback]).map((line) => (
                  <ReasonLine key={line} kind={kind}>
                    {line}
                  </ReasonLine>
                ))}
              </ul>
            </section>
          ))}

          <Link
            href={`${base}/profile`}
            className="inline-flex min-h-11 items-center self-start text-[15px] font-extrabold"
          >
            See {dog.name}&rsquo;s full profile
          </Link>
        </main>
      </div>
      <StickyBar>
        <ButtonLink href={`${base}/interested`} className="grow">
          <Heart size={20} />
          I&rsquo;m Interested
        </ButtonLink>
      </StickyBar>
    </>
  );
}
