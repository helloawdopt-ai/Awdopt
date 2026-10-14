import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { approveDog, rejectDog } from "@/app/admin/dog-actions";
import { adminButton } from "@/components/ui/AdminTable";
import { ErrorState } from "@/components/ui/States";
import { RELATIONSHIP_LABEL, dogTitle, submittedLabel } from "@/lib/admin-format";
import {
  ENERGY_LABEL,
  HANDLING_LABEL,
  NOT_KNOWN,
  SEX_LABEL,
  SIZE_LABEL,
  VACCINATION_LABEL,
  ageLabel,
} from "@/lib/dog-format";
import { requireAdmin } from "@/lib/server/auth";

export const metadata: Metadata = { title: "Review listing", robots: { index: false } };

const ERRORS = {
  photos:
    "Some photo files are missing or aren't real images, so this listing can't go live. Reject it, or ask the lister to send it again.",
  failed: "Something went wrong. Nothing was published. Please try again.",
};
const yesNo = (v: boolean | null) => (v === null ? null : v ? "Yes" : "No");

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { supabase } = await requireAdmin();
  const [{ id }, { error }] = await Promise.all([params, searchParams]);
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const { data: dog } = await supabase
    .from("dogs")
    .select("*, listers(name, phone, email, relationship), dog_photos(position, path_960, width, height)")
    .eq("id", id)
    .maybeSingle();
  if (!dog) notFound();

  const photos = [...dog.dog_photos].sort((a, b) => a.position - b.position);
  const bucket = dog.status === "pending" ? "listing-uploads" : "dog-photos";
  const { data: signed } = photos.length
    ? await supabase.storage.from(bucket).createSignedUrls(
        photos.map((p) => p.path_960),
        600,
      )
    : { data: [] };
  const lister = dog.listers;
  const digits = lister?.phone.replace(/\D/g, "");

  const facts: [string, string | null][] = [
    ["Sex", dog.sex && SEX_LABEL[dog.sex]],
    ["Age", ageLabel(dog.age_months)],
    ["Breed / type", dog.breed],
    ["Size", dog.size && SIZE_LABEL[dog.size]],
    ["Energy", dog.energy && ENERGY_LABEL[dog.energy]],
    ["Area", `${dog.locality}, ${dog.city}`],
    ["Good with kids", yesNo(dog.good_with_children)],
    ["Good with dogs", yesNo(dog.good_with_dogs)],
    ["Good with cats", yesNo(dog.good_with_cats)],
    ["Needs a large space", yesNo(dog.needs_large_space)],
    ["Alone up to", dog.alone_max_hours === null ? null : `${dog.alone_max_hours} hrs`],
    ["Handling", dog.handling && HANDLING_LABEL[dog.handling]],
    ["Medical needs", yesNo(dog.medical_needs)],
    ["Vaccination", dog.vaccination && VACCINATION_LABEL[dog.vaccination]],
    ["Sterilised", yesNo(dog.sterilised)],
    ["Urgent", dog.urgent ? "Yes" : "No"],
  ];
  const texts: [string, string | null][] = [
    ["Health notes", dog.medical_notes],
    ["Temperament", dog.temperament],
    ["Story", dog.story],
    ["Why they need a new home", dog.rehoming_reason],
    ["Other information", dog.other_info],
    ["Video", dog.video_url],
  ];

  return (
    <>
      <Link href="/admin" className="text-sm font-bold">
        ← All listings
      </Link>
      <h1 className="font-display text-[26px] font-extrabold tracking-[-0.03em]">{dogTitle(dog)}</h1>
      <p className="text-sm text-muted">
        Status: {dog.status} · Submitted {submittedLabel(dog.created_at)}
      </p>
      {error && error in ERRORS && <ErrorState>{ERRORS[error as keyof typeof ERRORS]}</ErrorState>}

      <section className="flex flex-col gap-2">
        <h2 className="text-[17px] font-extrabold">Photos ({photos.length})</h2>
        {photos.length ? (
          <ul className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {photos.map((p, i) => (
              <li key={p.position}>
                {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL of a private upload */}
                <img
                  src={signed?.[i]?.signedUrl ?? ""}
                  alt={`Photo ${i + 1} of ${dog.name}`}
                  width={p.width}
                  height={p.height}
                  className="aspect-[4/3] w-full rounded-[12px] border-2 border-ink object-cover"
                />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">No photos.</p>
        )}
      </section>

      <section className="flex flex-col gap-2 rounded-[16px] border-2 border-ink bg-surface p-4">
        <h2 className="text-[17px] font-extrabold">Lister (never public)</h2>
        {lister && (
          <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-[max-content_1fr]">
            <dt className="font-bold">Name</dt>
            <dd>{lister.name}</dd>
            <dt className="font-bold">Relationship</dt>
            <dd>{RELATIONSHIP_LABEL[lister.relationship]}</dd>
            <dt className="font-bold">Phone</dt>
            <dd className="flex flex-wrap gap-3">
              {lister.phone}
              <a href={`tel:${lister.phone}`} className="font-bold">
                Call
              </a>
              <a href={`https://wa.me/${digits}`} target="_blank" rel="noopener noreferrer" className="font-bold">
                WhatsApp
              </a>
            </dd>
            <dt className="font-bold">Email</dt>
            <dd>{lister.email ?? "—"}</dd>
          </dl>
        )}
      </section>

      <section className="flex flex-col gap-2 rounded-[16px] border-2 border-ink bg-surface p-4">
        <h2 className="text-[17px] font-extrabold">Dog</h2>
        <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-[max-content_1fr]">
          {facts.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="font-bold">{k}</dt>
              <dd className={v === null ? "text-muted" : undefined}>{v ?? NOT_KNOWN}</dd>
            </div>
          ))}
          {texts.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="font-bold">{k}</dt>
              <dd className={v === null ? "text-muted" : "whitespace-pre-line"}>{v ?? "—"}</dd>
            </div>
          ))}
        </dl>
      </section>

      {dog.status === "pending" && (
        <div className="flex flex-wrap items-start gap-3">
          <form action={approveDog}>
            <input type="hidden" name="id" value={dog.id} />
            <button type="submit" className={adminButton.replace("bg-surface", "bg-fresh font-extrabold")}>
              Approve and publish
            </button>
          </form>
          {/* Two clicks to reject, without JavaScript. */}
          <details className="rounded-[10px]">
            <summary className={`${adminButton} cursor-pointer list-none`}>Reject…</summary>
            <form action={rejectDog} className="mt-2 flex flex-col items-start gap-2 text-sm">
              <p>The listing won&rsquo;t be published and its photos are deleted.</p>
              <input type="hidden" name="id" value={dog.id} />
              <button type="submit" className={adminButton.replace("bg-surface", "bg-bubble font-extrabold")}>
                Yes, reject this listing
              </button>
            </form>
          </details>
        </div>
      )}
    </>
  );
}
