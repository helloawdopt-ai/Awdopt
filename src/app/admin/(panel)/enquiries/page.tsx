import type { Metadata } from "next";
import { ENQUIRY_COLUMNS, EnquiryNotice, EnquiryTable } from "@/components/admin/EnquiryTable";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { requireAdmin } from "@/lib/server/auth";

export const metadata: Metadata = { title: "Enquiries", robots: { index: false } };

// ponytail: every enquiry on one page, newest first; add .range() paging past a few hundred.
export default async function Page({ searchParams }: { searchParams: Promise<{ done?: string; error?: string }> }) {
  const { supabase } = await requireAdmin();
  const [{ done, error: notice }, { data: enquiries, error }] = await Promise.all([
    searchParams,
    supabase.from("enquiries").select(ENQUIRY_COLUMNS).order("created_at", { ascending: false }),
  ]);

  return (
    <>
      <h1 className="font-display text-[26px] font-extrabold tracking-[-0.03em]">Enquiries</h1>
      <p className="text-sm text-muted">
        Match is the score when the enquiry was sent. Choose a status, add a reason if it didn&rsquo;t work out, then
        Save. &ldquo;Adopted&rdquo; also takes the dog off Find a Dog.
      </p>
      <EnquiryNotice done={done} error={notice} />
      {error ? (
        <ErrorState>We couldn&rsquo;t load the enquiries. Refresh the page to try again.</ErrorState>
      ) : !enquiries.length ? (
        <EmptyState title="No enquiries yet">
          They appear here when someone taps &ldquo;I&rsquo;m Interested&rdquo;.
        </EmptyState>
      ) : (
        <EnquiryTable label="All enquiries" enquiries={enquiries} back="/admin/enquiries" />
      )}
    </>
  );
}
