import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EnquiryForm } from "@/components/match/EnquiryForm";
import { ageLabel } from "@/lib/dog-format";
import { toPhoto } from "@/lib/photo-url";
import { getResults, shareUrl } from "@/lib/server/matches";

// Private: /r/* sends no-referrer, no-store and X-Robots-Tag: noindex (next.config.ts).
export const metadata: Metadata = { title: "I'm Interested", robots: { index: false, follow: false } };

type Props = { params: Promise<{ token: string; dogSlug: string }> };

/** Enquiry for one matched dog. Only dogs this adopter is matched with are reachable. */
export default async function Page({ params }: Props) {
  const { token, dogSlug } = await params;
  const [results, link] = await Promise.all([getResults(token, dogSlug), shareUrl(token)]);
  const m = results?.matches[0];
  if (!m) notFound();
  const dog = m.dog;

  return (
    <EnquiryForm
      token={token}
      slug={dog.slug}
      dog={{
        name: dog.name,
        meta: [ageLabel(dog.age_months), dog.breed, dog.locality].filter(Boolean).join(" · "),
        photo: dog.photo ? toPhoto(dog.photo, `Photo of ${dog.name}`, "56px") : null,
      }}
      score={Math.round(m.score)}
      link={link}
    />
  );
}
