import type { Metadata } from "next";
import Link from "next/link";
import { approveDog } from "@/app/admin/dog-actions";
import { ENQUIRY_COLUMNS, ENQUIRY_MESSAGES, EnquiryTable } from "@/components/admin/EnquiryTable";
import { Notice } from "@/components/admin/Notice";
import { AdminTable, adminButton } from "@/components/ui/AdminTable";
import { StatusChip } from "@/components/ui/Chip";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { MATCH_STATUSES, RELATIONSHIP_LABEL, dogTitle, submittedLabel } from "@/lib/admin-format";
import { requireAdmin } from "@/lib/server/auth";

export const metadata: Metadata = { title: "Overview", robots: { index: false } };

const NOTICES = {
  approved: "Listing approved. It's live on Find a Dog.",
  rejected: "Listing rejected and its photos deleted.",
};

export default async function Page({ searchParams }: { searchParams: Promise<{ done?: string; error?: string }> }) {
  const { supabase } = await requireAdmin();
  const { done, error: notice } = await searchParams;
  const head = { count: "exact", head: true } as const;
  const dogCount = (status: "approved" | "pending" | "adopted") =>
    supabase.from("dogs").select("id", head).eq("status", status);
  const [live, pending, adopted, adopters, interests, matches, { data: dogs, error }, recent] = await Promise.all([
    dogCount("approved"),
    dogCount("pending"),
    dogCount("adopted"),
    supabase.from("adopters").select("id", head),
    supabase.from("enquiries").select("id", head),
    supabase.from("enquiries").select("id", head).in("status", MATCH_STATUSES),
    supabase
      .from("dogs")
      .select("id, name, age_months, breed, locality, urgent, created_at, listers(relationship)")
      .eq("status", "pending")
      .order("created_at"),
    supabase.from("enquiries").select(ENQUIRY_COLUMNS).order("created_at", { ascending: false }).limit(5),
  ]);
  const tiles: [string, number | null, string][] = [
    ["Dogs", live.count, `live · ${pending.count ?? "—"} waiting`],
    ["Adopters", adopters.count, "questionnaires sent"],
    ["Interests", interests.count, "enquiries"],
    ["Matches", matches.count, "meeting or later"],
    ["Adoptions", adopted.count, "dogs adopted"],
  ];

  return (
    <>
      <h1 className="font-display text-[26px] font-extrabold tracking-[-0.03em]">Overview</h1>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {tiles.map(([label, n, note]) => (
          <div key={label} className="flex flex-col gap-0.5 rounded-[16px] border-2 border-ink bg-surface px-4 py-3.5">
            <dt className="text-[13px] font-bold text-muted">{label}</dt>
            <dd className="font-display text-[28px] font-extrabold tabular-nums">{n ?? "—"}</dd>
            <dd className="text-xs text-muted">{note}</dd>
          </div>
        ))}
      </dl>
      <h2 className="text-[17px] font-extrabold">Listings waiting for approval</h2>
      <Notice messages={NOTICES} done={done} />
      {error ? (
        <ErrorState>We couldn&rsquo;t load the listings. Refresh the page to try again.</ErrorState>
      ) : !dogs.length ? (
        <EmptyState title="Nothing to review">New listings appear here as soon as they&rsquo;re sent.</EmptyState>
      ) : (
        <AdminTable label="Listings waiting for approval">
          <table>
            <thead>
              <tr>
                <th>Dog</th>
                <th>Listed by</th>
                <th>Area</th>
                <th>Urgent</th>
                <th>Submitted</th>
                <th>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {dogs.map((d) => (
                <tr key={d.id}>
                  <td className="font-extrabold">{dogTitle(d)}</td>
                  <td>{d.listers && RELATIONSHIP_LABEL[d.listers.relationship]}</td>
                  <td>{d.locality}</td>
                  <td>{d.urgent ? <StatusChip tone="bubble">Urgent</StatusChip> : "No"}</td>
                  <td>{submittedLabel(d.created_at)}</td>
                  <td className="text-right whitespace-nowrap">
                    <form action={approveDog} className="inline-flex gap-2">
                      <Link
                        href={`/admin/dogs/${d.id}`}
                        prefetch={false}
                        className={adminButton}
                        aria-label={`Review ${d.name}`}
                      >
                        Review
                      </Link>
                      <input type="hidden" name="id" value={d.id} />
                      <button
                        type="submit"
                        className={adminButton.replace("bg-surface", "bg-fresh font-extrabold")}
                        aria-label={`Approve ${d.name}`}
                      >
                        Approve
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </AdminTable>
      )}
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[17px] font-extrabold">Recent enquiries</h2>
        <Link href="/admin/enquiries" className="inline-flex min-h-11 items-center text-sm font-bold lg:min-h-0">
          All enquiries →
        </Link>
      </div>
      <Notice messages={ENQUIRY_MESSAGES} done={done} error={notice} />
      {recent.error ? (
        <ErrorState>We couldn&rsquo;t load the enquiries. Refresh the page to try again.</ErrorState>
      ) : !recent.data.length ? (
        <p className="text-sm">No enquiries yet.</p>
      ) : (
        <EnquiryTable label="Recent enquiries" enquiries={recent.data} back="/admin" />
      )}
    </>
  );
}
