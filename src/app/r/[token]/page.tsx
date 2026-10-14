import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Info } from "lucide-react";
import { MatchRow } from "@/components/dog/Match";
import { ButtonLink } from "@/components/ui/Button";
import { PrivateLinkCard } from "@/components/ui/PrivateLinkCard";
import { SiteHeader } from "@/components/ui/SiteHeader";
import { EmptyState } from "@/components/ui/States";
import { ageLabel } from "@/lib/dog-format";
import { excludedLine, explain } from "@/lib/explanations";
import { preloadPhoto, toPhoto } from "@/lib/photo-url";
import { getResults } from "@/lib/server/matches";

// Private: /r/* also sends no-referrer, no-store and X-Robots-Tag: noindex (next.config.ts).
export const metadata: Metadata = { title: "Your matches", robots: { index: false, follow: false } };

type Props = { params: Promise<{ token: string }> };

/** The link to show and share, on whatever host served this page (preview, production, custom domain). */
async function shareUrl(token: string) {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}/r/${token}`;
}

export default async function Page({ params }: Props) {
  const { token } = await params;
  const [results, url] = await Promise.all([getResults(token), shareUrl(token)]);
  if (!results) notFound();
  const { adopter, matches, excluded } = results;

  const rows = matches.map((m, i) => {
    const { why, consider } = explain(m, adopter);
    const photo = m.dog.photo ? toPhoto(m.dog.photo, `Photo of ${m.dog.name}`, "84px") : null;
    if (i === 0 && photo) preloadPhoto(photo);
    return { m, photo, reason: why[0] ?? consider[0] ?? "Worth meeting to see how you get on." };
  });
  const notes = Object.entries(excluded)
    .map(([key, n]) => excludedLine(key, n ?? 0, adopter))
    .filter(Boolean);

  return (
    <div className="mx-auto flex max-w-[560px] flex-col gap-4 px-4 pt-3 pb-10">
      <SiteHeader
        action={
          <Link
            href="/match/basic"
            className="press inline-flex h-11 items-center rounded-full border-2 border-ink bg-surface px-3.5 text-sm font-bold no-underline hover:shadow-sticker-sm active:translate-[2px] active:shadow-none"
          >
            Retake the quiz
          </Link>
        }
      />
      <main className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-[28px] leading-[1.08] font-extrabold tracking-[-0.04em]">
            Your top matches
          </h1>
          <p className="text-[15px] text-muted">
            {matches.length === 1 ? "1 dog fits" : `${matches.length} dogs fit`} your life, best first.
          </p>
        </div>
        <PrivateLinkCard url={url} variant="banner" />
        {rows.length ? (
          <ol className="flex flex-col gap-3.5">
            {rows.map(({ m, photo, reason }, i) => (
              <li key={m.dog.slug}>
                <MatchRow
                  href={`/r/${token}/${m.dog.slug}`}
                  rank={m.rank}
                  name={m.dog.name}
                  meta={[ageLabel(m.dog.age_months), m.dog.breed, m.dog.locality].filter(Boolean).join(" · ")}
                  reason={reason}
                  score={Math.round(m.score)}
                  confidence={m.confidence}
                  photo={photo}
                  tint={i}
                />
              </li>
            ))}
          </ol>
        ) : (
          <EmptyState
            title="No dogs fit every must-have yet"
            action={
              <ButtonLink href="/dogs" variant="secondary">
                Browse all dogs
              </ButtonLink>
            }
          >
            New dogs join every week. Keep your link and check back.
          </EmptyState>
        )}
        {notes.map((line) => (
          <p key={line} className="flex items-start gap-2.5 px-0.5 text-[13px] leading-[1.45] text-muted">
            <Info size={18} strokeWidth={2} className="mt-px shrink-0 text-ink" aria-hidden="true" />
            {line}
          </p>
        ))}
      </main>
    </div>
  );
}
