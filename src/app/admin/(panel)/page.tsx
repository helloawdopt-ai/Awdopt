import type { Metadata } from "next";
import Link from "next/link";
import { approveDog } from "@/app/admin/dog-actions";
import { AdminTable, adminButton } from "@/components/ui/AdminTable";
import { StatusChip } from "@/components/ui/Chip";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { RELATIONSHIP_LABEL, dogTitle, submittedLabel } from "@/lib/admin-format";
import { requireAdmin } from "@/lib/server/auth";

export const metadata: Metadata = { title: "Listings", robots: { index: false } };

const NOTICES = {
  approved: "Listing approved. It's live on Find a Dog.",
  rejected: "Listing rejected and its photos deleted.",
};

export default async function Page({ searchParams }: { searchParams: Promise<{ done?: string }> }) {
  const { supabase } = await requireAdmin();
  const { done } = await searchParams;
  const { data: dogs, error } = await supabase
    .from("dogs")
    .select("id, name, age_months, breed, locality, urgent, created_at, listers(relationship)")
    .eq("status", "pending")
    .order("created_at");

  return (
    <>
      <h1 className="font-display text-[26px] font-extrabold tracking-[-0.03em]">Listings waiting for approval</h1>
      {done && done in NOTICES && (
        <p role="status" className="rounded-[16px] border-2 border-ink bg-fresh px-3.5 py-2.5 text-sm font-bold">
          {NOTICES[done as keyof typeof NOTICES]}
        </p>
      )}
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
    </>
  );
}
