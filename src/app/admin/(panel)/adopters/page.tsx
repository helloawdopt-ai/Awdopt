import type { Metadata } from "next";
import Link from "next/link";
import { AdminTable, adminLink } from "@/components/ui/AdminTable";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { linkState, optionLabel, submittedLabel } from "@/lib/admin-format";
import { EXPERIENCE, HOME_TYPES } from "@/lib/questionnaire";
import { requireAdmin } from "@/lib/server/auth";

export const metadata: Metadata = { title: "Adopters", robots: { index: false } };

// One row per questionnaire (a retake is a new row). Never selects the results-link hash.
// ponytail: one page, newest first; add .range() paging past a few hundred adopters.
export default async function Page() {
  const { supabase } = await requireAdmin();
  const { data: adopters, error } = await supabase
    .from("adopters")
    .select("id, name, age, city, home_type, experience, created_at, token_expires_at, enquiries(count)")
    .order("created_at", { ascending: false });

  return (
    <>
      <h1 className="font-display text-[26px] font-extrabold tracking-[-0.03em]">Adopters</h1>
      {error ? (
        <ErrorState>We couldn&rsquo;t load the adopters. Refresh the page to try again.</ErrorState>
      ) : !adopters.length ? (
        <EmptyState title="No adopters yet">People appear here when they finish the questionnaire.</EmptyState>
      ) : (
        <AdminTable label="All adopters">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Age</th>
                <th>City</th>
                <th>Home</th>
                <th>Experience</th>
                <th>Sent</th>
                <th>Results link</th>
                <th>Interests</th>
              </tr>
            </thead>
            <tbody>
              {adopters.map((a) => (
                <tr key={a.id}>
                  <td>
                    <Link href={`/admin/adopters/${a.id}`} prefetch={false} className={adminLink}>
                      {a.name}
                    </Link>
                  </td>
                  <td className="tabular-nums">{a.age}</td>
                  <td>{a.city}</td>
                  <td>{optionLabel(HOME_TYPES, a.home_type)}</td>
                  <td>{optionLabel(EXPERIENCE, a.experience)}</td>
                  <td>{submittedLabel(a.created_at)}</td>
                  <td className="whitespace-nowrap">{linkState(a.token_expires_at)}</td>
                  <td className="tabular-nums">{a.enquiries[0]?.count ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </AdminTable>
      )}
    </>
  );
}
