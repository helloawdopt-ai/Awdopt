import type { Metadata } from "next";
import Link from "next/link";
import { AdminTable, adminLink } from "@/components/ui/AdminTable";
import { StatusChip } from "@/components/ui/Chip";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { DOG_STATUS, dogTitle, submittedLabel } from "@/lib/admin-format";
import { requireAdmin } from "@/lib/server/auth";

export const metadata: Metadata = { title: "Dogs", robots: { index: false } };

// ponytail: every dog on one page, newest first; add .range() paging past a few hundred listings.
export default async function Page() {
  const { supabase } = await requireAdmin();
  const { data: dogs, error } = await supabase
    .from("dogs")
    .select("id, name, age_months, breed, locality, status, urgent, created_at, enquiries(count)")
    .order("created_at", { ascending: false });

  return (
    <>
      <h1 className="font-display text-[26px] font-extrabold tracking-[-0.03em]">Dogs</h1>
      {error ? (
        <ErrorState>We couldn&rsquo;t load the dogs. Refresh the page to try again.</ErrorState>
      ) : !dogs.length ? (
        <EmptyState title="No dogs yet">Listings appear here as soon as they&rsquo;re sent.</EmptyState>
      ) : (
        <AdminTable label="All dogs">
          <table>
            <thead>
              <tr>
                <th>Dog</th>
                <th>Status</th>
                <th>Area</th>
                <th>Urgent</th>
                <th>Listed</th>
                <th>Interests</th>
              </tr>
            </thead>
            <tbody>
              {dogs.map((d) => (
                <tr key={d.id}>
                  <td>
                    <Link href={`/admin/dogs/${d.id}`} prefetch={false} className={adminLink}>
                      {dogTitle(d)}
                    </Link>
                  </td>
                  <td>
                    <StatusChip tone={DOG_STATUS[d.status].tone}>{DOG_STATUS[d.status].label}</StatusChip>
                  </td>
                  <td>{d.locality}</td>
                  <td>{d.urgent ? <StatusChip tone="bubble">Urgent</StatusChip> : "No"}</td>
                  <td>{submittedLabel(d.created_at)}</td>
                  <td className="tabular-nums">{d.enquiries[0]?.count ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </AdminTable>
      )}
    </>
  );
}
