import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { ArrowUpRight, ChevronLeft, Lock } from "lucide-react";
import { DeferredPhoto } from "@/components/dog/DeferredPhoto";
import { DogPhoto } from "@/components/dog/DogPhoto";
import { ButtonLink, IconButton } from "@/components/ui/Button";
import { overline } from "@/components/ui/Chip";
import { StickyBar } from "@/components/ui/StickyBar";
import { cx } from "@/lib/cx";
import { ENERGY_LABEL, HANDLING_LABEL, NOT_KNOWN, VACCINATION_LABEL, ageLabel, dogMeta } from "@/lib/dog-format";
import { preloadPhoto, toPhoto } from "@/lib/photo-url";
import { getDog } from "@/lib/server/dogs";

type Props = { params: Promise<{ slug: string }> };

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
async function load(params: Props["params"]) {
  const { slug } = await params;
  return SLUG.test(slug) && slug.length <= 80 ? getDog(slug) : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const dog = await load(params);
  if (!dog) return { title: "Dog not found", robots: { index: false } };
  return {
    title: dog.name,
    description: `${[dogMeta(dog), dog.locality].filter(Boolean).join(" · ")}. Looking for a home.`,
  };
}

const PHOTO_BOX = "size-full lg:aspect-[4/3] lg:rounded-[24px] lg:border-[2.5px] lg:border-ink";
const yesNo = (v: boolean | null) => (v === null ? null : v ? "Yes" : "No");

/** A known value, or the dashed "Not known yet" box (DESIGN.md §7). */
function Fact({ label, value }: { label: string; value: ReactNode | null }) {
  const known = value !== null && value !== "";
  return (
    <div
      className={cx(
        "flex flex-col gap-0.5 rounded-[16px] border-2 border-ink p-2.5",
        known ? "bg-surface" : "border-dashed bg-transparent",
      )}
    >
      <dt className="text-sm font-extrabold">{label}</dt>
      <dd className={cx("text-[13px]", !known && "text-muted")}>{known ? value : NOT_KNOWN}</dd>
    </div>
  );
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <h2 className="text-[15px] font-extrabold">{title}</h2>
      <div className="text-[15px] leading-normal whitespace-pre-line">{children}</div>
    </div>
  );
}

export default async function Page({ params }: Props) {
  const dog = await load(params);
  if (!dog) notFound();

  const SIZES = "(min-width: 1024px) 580px, 100vw";
  if (dog.photos[0]) preloadPhoto(toPhoto(dog.photos[0], "", SIZES));
  const pronoun = dog.sex === "male" ? "His" : dog.sex === "female" ? "Her" : "The";
  const photos = dog.photos;
  const health =
    dog.medical_needs === null
      ? null
      : dog.medical_needs
        ? `Has ongoing medical or special needs.${dog.medical_notes ? ` ${dog.medical_notes}` : ""}`
        : `No ongoing medical needs.${dog.medical_notes ? ` ${dog.medical_notes}` : ""}`;
  const chips = [
    dog.urgent && { label: "Urgent", tone: "bg-bubble" },
    dog.vaccination && {
      label: VACCINATION_LABEL[dog.vaccination],
      tone: dog.vaccination === "full" ? "bg-fresh" : "bg-surface",
    },
    dog.sterilised !== null && {
      label: dog.sterilised ? "Sterilised" : "Not sterilised",
      tone: dog.sterilised ? "bg-fresh" : "bg-surface",
    },
    dog.energy && { label: `${ENERGY_LABEL[dog.energy]} energy`, tone: "bg-bubble" },
  ].filter((c): c is { label: string; tone: string } => Boolean(c));

  return (
    <>
      <main className="mx-auto max-w-[1200px] lg:grid lg:grid-cols-2 lg:items-start lg:gap-10 lg:px-4 lg:pt-6 lg:pb-8">
        {/* Gallery: scroll-snap on mobile, stacked photos from 1024px (no swipe-only content). */}
        <section aria-label={`Photos of ${dog.name}`} className="relative lg:sticky lg:top-6">
          {photos.length ? (
            <ul
              tabIndex={0}
              className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain border-b-[2.5px] border-ink lg:flex-col lg:gap-4 lg:overflow-visible lg:border-0"
            >
              {photos.map((p, i) => (
                <li key={p.position} className="relative h-[340px] w-full shrink-0 snap-start lg:h-auto">
                  {/* Only the first photo competes with the page load; the rest wait for window.load. */}
                  {i === 0 ? (
                    <DogPhoto
                      photo={toPhoto(p, `Photo 1 of ${dog.name}`, SIZES)}
                      name={dog.name}
                      priority
                      className={PHOTO_BOX}
                    />
                  ) : (
                    <DeferredPhoto
                      photo={toPhoto(p, `Photo ${i + 1} of ${dog.name}`, SIZES)}
                      tint={i}
                      className={PHOTO_BOX}
                    />
                  )}
                  {photos.length > 1 && (
                    <span className="absolute top-6 right-4 rounded-full border-2 border-ink bg-surface px-2.5 py-1 text-[13px] font-extrabold lg:hidden">
                      {i + 1} / {photos.length}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <DogPhoto
              name={dog.name}
              className="h-[340px] border-b-[2.5px] border-ink lg:aspect-[4/3] lg:h-auto lg:rounded-[24px] lg:border-[2.5px]"
            />
          )}
          <IconButton href="/dogs" label="Back to dogs" className="absolute top-4 left-4 shadow-sticker-sm lg:hidden">
            <ChevronLeft size={20} strokeWidth={2.4} aria-hidden="true" />
          </IconButton>
        </section>

        <div className="flex flex-col gap-[18px] px-4 pt-[18px] pb-6 lg:px-0 lg:pt-0">
          <div className="hidden lg:block">
            <IconButton href="/dogs" label="Back to dogs">
              <ChevronLeft size={20} strokeWidth={2.4} aria-hidden="true" />
            </IconButton>
          </div>
          <div className="flex flex-col gap-1.5">
            <h1 className="font-display text-[32px] leading-[1.05] font-extrabold tracking-[-0.04em] lg:text-[44px]">
              {dog.name}
            </h1>
            <p className="text-[15px] text-muted">{[dogMeta(dog), dog.locality].filter(Boolean).join(" · ")}</p>
            {chips.length > 0 && (
              <ul className="mt-1.5 flex flex-wrap gap-2">
                {chips.map((c) => (
                  <li
                    key={c.label}
                    className={cx("rounded-full border-2 border-ink px-3 py-1.5 text-[13px] font-bold", c.tone)}
                  >
                    {c.label}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <section className="flex flex-col gap-2">
            <h2 className={overline}>Good with</h2>
            <dl className="grid grid-cols-3 gap-2">
              <Fact label="Kids" value={yesNo(dog.good_with_children)} />
              <Fact label="Dogs" value={yesNo(dog.good_with_dogs)} />
              <Fact label="Cats" value={yesNo(dog.good_with_cats)} />
            </dl>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className={overline}>The basics</h2>
            <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <Fact label="Age" value={ageLabel(dog.age_months)} />
              <Fact label="Breed / type" value={dog.breed} />
              <Fact label="Needs a large space" value={yesNo(dog.needs_large_space)} />
              <Fact
                label="Can be left alone"
                value={
                  dog.alone_max_hours === null
                    ? null
                    : `Up to ${dog.alone_max_hours} hr${dog.alone_max_hours === 1 ? "" : "s"}`
                }
              />
              <Fact label="Handling" value={dog.handling && HANDLING_LABEL[dog.handling]} />
              <Fact label="Vaccination" value={dog.vaccination && VACCINATION_LABEL[dog.vaccination]} />
            </dl>
          </section>

          <section className="flex flex-col gap-3.5 rounded-[22px] border-[2.5px] border-ink bg-surface p-4">
            <Block title="Temperament">{dog.temperament ?? <span className="text-muted">{NOT_KNOWN}</span>}</Block>
            <Block title="Health">{health ?? <span className="text-muted">{NOT_KNOWN}</span>}</Block>
            {dog.story && <Block title={`${pronoun} story`}>{dog.story}</Block>}
            {dog.rehoming_reason && <Block title="Why they need a new home">{dog.rehoming_reason}</Block>}
            {dog.other_info && <Block title="Good to know">{dog.other_info}</Block>}
            {dog.video_url && (
              <a
                href={dog.video_url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="inline-flex min-h-11 items-center gap-1.5 self-start text-[15px] font-extrabold"
              >
                Watch {dog.name}&rsquo;s video
                <ArrowUpRight size={16} strokeWidth={2.4} aria-hidden="true" />
                <span className="sr-only">(opens YouTube or Google Drive)</span>
              </a>
            )}
          </section>

          <p className="flex items-start gap-2.5 text-[13px] leading-[1.45] text-muted">
            <Lock size={18} strokeWidth={2} aria-hidden="true" className="mt-px shrink-0 text-ink" />
            Checked by AWDOPT. We never share the lister&rsquo;s number publicly; our team connects you.
          </p>
        </div>
      </main>
      <StickyBar>
        <ButtonLink href="/match" className="grow">
          See if we match
        </ButtonLink>
      </StickyBar>
    </>
  );
}
