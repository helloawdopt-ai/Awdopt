import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminTable } from "@/components/ui/AdminTable";
import { StatusChip } from "@/components/ui/Chip";
import { ErrorState } from "@/components/ui/States";
import { ENQUIRY_STATUS_LABEL, linkState, optionLabel, pct, submittedLabel, whatsApp } from "@/lib/admin-format";
import {
  ACTIVITY,
  DAILY_TIME,
  EXPERIENCE,
  HOME_TYPES,
  HOUSEHOLDS,
  PREF_AGES,
  PREF_BREED,
  PREF_ENERGY,
  PREF_SIZES,
  QUESTIONS,
  TIMELINE,
} from "@/lib/questionnaire";
import { requireAdmin } from "@/lib/server/auth";

export const metadata: Metadata = { title: "Adopter", robots: { index: false } };

const yes = (v: boolean) => (v ? "Yes" : "No");
const list = (options: readonly { value: string; label: string }[], values: string[]) =>
  values.length ? values.map((v) => optionLabel(options, v)).join(", ") : "No preference";
const contactLink = "inline-flex min-h-11 min-w-11 items-center font-bold lg:min-h-0 lg:min-w-0";

// Admin only. The ranking is score_dogs_for_adopter on the admin's own session (RLS), the same
// function the adopter's results link uses, so this is what they would see right now.
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { supabase } = await requireAdmin();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const [{ data: a }, ranking, { data: dogs }, { data: constraints }, { data: enquiries }] = await Promise.all([
    supabase
      .from("adopters")
      // Every column except the results-link hash (never leaves the database).
      .select(
        "id, name, age, city, phone, email, home_type, household, has_children_under_12, has_dogs, has_cats, activity_level, hours_alone, daily_time, experience, pref_sizes, pref_ages, pref_breed, pref_energy, open_to_special_needs, open_to_senior, adopt_reason, timeline, token_expires_at, created_at",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase.rpc("score_dogs_for_adopter", { p_adopter_id: id }),
    supabase.from("dogs").select("id, name").eq("status", "approved"),
    supabase.from("hard_constraints").select("key, description"),
    supabase
      .from("enquiries")
      .select("id, score, status, created_at, dogs(id, name)")
      .eq("adopter_id", id)
      .order("created_at", { ascending: false }),
  ]);
  if (!a) notFound();

  const dogName = new Map((dogs ?? []).map((d) => [d.id, d.name]));
  const why = new Map((constraints ?? []).map((c) => [c.key, c.description]));
  const ranked = (ranking.data ?? []).filter((r) => r.rank !== null);
  const excluded = (ranking.data ?? []).filter((r) => r.rank === null);

  const answers: [string, [string, string][]][] = [
    [
      "Home",
      [
        [QUESTIONS.home_type, optionLabel(HOME_TYPES, a.home_type)],
        [QUESTIONS.household, optionLabel(HOUSEHOLDS, a.household)],
        [QUESTIONS.has_children_under_12, yes(a.has_children_under_12)],
        [QUESTIONS.has_dogs, yes(a.has_dogs)],
        [QUESTIONS.has_cats, yes(a.has_cats)],
      ],
    ],
    [
      "Lifestyle",
      [
        [QUESTIONS.activity_level, optionLabel(ACTIVITY, a.activity_level)],
        [QUESTIONS.hours_alone, `${a.hours_alone} hrs`],
        [QUESTIONS.daily_time, optionLabel(DAILY_TIME, a.daily_time)],
        [QUESTIONS.experience, optionLabel(EXPERIENCE, a.experience)],
      ],
    ],
    [
      "Preferences",
      [
        [`Preferred ${QUESTIONS.pref_sizes.toLowerCase()}`, list(PREF_SIZES, a.pref_sizes)],
        [`Preferred ${QUESTIONS.pref_ages.toLowerCase()}`, list(PREF_AGES, a.pref_ages)],
        [`Preferred ${QUESTIONS.pref_energy.toLowerCase()}`, list(PREF_ENERGY, a.pref_energy)],
        [`Preferred ${QUESTIONS.pref_breed.toLowerCase()}`, optionLabel(PREF_BREED, a.pref_breed)],
        [QUESTIONS.open_to_special_needs, yes(a.open_to_special_needs)],
        [QUESTIONS.open_to_senior, yes(a.open_to_senior)],
      ],
    ],
    [
      "Intent",
      [
        [QUESTIONS.adopt_reason, a.adopt_reason ?? "—"],
        [QUESTIONS.timeline, optionLabel(TIMELINE, a.timeline)],
      ],
    ],
  ];

  return (
    <>
      <Link
        href="/admin/adopters"
        className="inline-flex min-h-11 items-center self-start text-sm font-bold lg:min-h-0"
      >
        ← All adopters
      </Link>
      <h1 className="font-display text-[26px] font-extrabold tracking-[-0.03em]">{a.name}</h1>
      <p className="text-sm text-muted">
        {a.age} · {a.city} · Sent {submittedLabel(a.created_at)} · Results link: {linkState(a.token_expires_at)}
      </p>

      <section className="flex flex-col gap-2 rounded-[16px] border-2 border-ink bg-surface p-4">
        <h2 className="text-[17px] font-extrabold">Contact (never public)</h2>
        <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-[max-content_1fr]">
          <dt className="font-bold">Phone</dt>
          <dd className="flex flex-wrap items-center gap-x-3">
            {a.phone}
            <a href={`tel:${a.phone}`} className={contactLink}>
              Call
            </a>
            <a href={whatsApp(a.phone)} target="_blank" rel="noopener noreferrer" className={contactLink}>
              WhatsApp
            </a>
          </dd>
          <dt className="font-bold">Email</dt>
          <dd>{a.email ?? "—"}</dd>
        </dl>
      </section>

      <section className="flex flex-col gap-3 rounded-[16px] border-2 border-ink bg-surface p-4">
        <h2 className="text-[17px] font-extrabold">Answers</h2>
        {answers.map(([title, rows]) => (
          <div key={title} className="flex flex-col gap-1">
            <h3 className="text-[13px] font-extrabold tracking-[0.08em] text-muted uppercase">{title}</h3>
            <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-[minmax(0,22rem)_1fr]">
              {rows.map(([q, v]) => (
                <div key={q} className="contents">
                  <dt className="font-bold">{q}</dt>
                  <dd className="whitespace-pre-line">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-[17px] font-extrabold">Current recommendations</h2>
        <p className="text-sm text-muted">
          Ranked with today&rsquo;s live dogs, weights and hard constraints, so it can differ from what they saw when
          they sent the questionnaire.
        </p>
        {ranking.error ? (
          <ErrorState>We couldn&rsquo;t rank the dogs for this adopter. Refresh the page to try again.</ErrorState>
        ) : !ranking.data.length ? (
          <p className="text-sm">No dogs are live right now.</p>
        ) : (
          <AdminTable label="Current recommendations">
            <table>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Dog</th>
                  <th>Match</th>
                  <th>Based on</th>
                </tr>
              </thead>
              <tbody>
                {ranked.map((r) => (
                  <tr key={r.dog_id}>
                    <td className="tabular-nums">#{r.rank}</td>
                    <td>
                      <DogLink id={r.dog_id} name={dogName.get(r.dog_id)} />
                    </td>
                    <td className="font-extrabold tabular-nums">{Math.round(r.score)}%</td>
                    <td className="whitespace-nowrap">
                      {pct(r.confidence)} of the weight
                      {r.confidence < 0.7 && (
                        <>
                          {" "}
                          <StatusChip tone="highlight">Limited info</StatusChip>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
                {excluded.map((r) => (
                  <tr key={r.dog_id}>
                    <td className="whitespace-nowrap text-muted">Left out</td>
                    <td>
                      <DogLink id={r.dog_id} name={dogName.get(r.dog_id)} />
                    </td>
                    <td colSpan={2} className="text-muted">
                      {r.excluded_by.map((k) => why.get(k) ?? k).join("; ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </AdminTable>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-[17px] font-extrabold">Enquiries</h2>
        {!enquiries?.length ? (
          <p className="text-sm">No enquiries yet.</p>
        ) : (
          <AdminTable label="Enquiries from this adopter">
            <table>
              <thead>
                <tr>
                  <th>Dog</th>
                  <th>Match when sent</th>
                  <th>Status</th>
                  <th>Sent</th>
                </tr>
              </thead>
              <tbody>
                {enquiries.map((e) => (
                  <tr key={e.id}>
                    <td>{e.dogs && <DogLink id={e.dogs.id} name={e.dogs.name} />}</td>
                    <td className="tabular-nums">{Math.round(e.score)}%</td>
                    <td>{ENQUIRY_STATUS_LABEL[e.status]}</td>
                    <td>{submittedLabel(e.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </AdminTable>
        )}
      </section>
    </>
  );
}

function DogLink({ id, name }: { id: string; name?: string }) {
  return (
    <Link
      href={`/admin/dogs/${id}`}
      prefetch={false}
      className="inline-flex min-h-11 items-center font-extrabold whitespace-nowrap lg:min-h-0"
    >
      {name ?? "Unknown dog"}
    </Link>
  );
}
