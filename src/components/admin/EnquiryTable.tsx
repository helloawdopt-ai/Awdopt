import Link from "next/link";
import { setEnquiryStatus } from "@/app/admin/enquiry-actions";
import { AdminTable, adminButton, adminSelect } from "@/components/ui/AdminTable";
import { StatusChip } from "@/components/ui/Chip";
import { DOG_STATUS, ENQUIRY_STATUS_LABEL, pct, submittedLabel, whatsApp } from "@/lib/admin-format";
import type { Database } from "@/lib/database.types";

/** Columns the table needs; pages select exactly these. */
export const ENQUIRY_COLUMNS =
  "id, name, phone, email, message, status, reason, score, confidence, created_at, adopter_id, dogs(id, name, status)";

type Enquiry = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  message: string | null;
  status: Database["public"]["Enums"]["enquiry_status"];
  reason: string | null;
  score: number;
  confidence: number;
  created_at: string;
  adopter_id: string;
  dogs: { id: string; name: string; status: Database["public"]["Enums"]["dog_status"] } | null;
};

const MESSAGES = {
  saved: "Status saved.",
  open: "That enquiry can't be reopened: this phone number already has an open enquiry for the same dog.",
  invalid: "That status or reason wasn't valid (reasons are up to 500 characters). Nothing was saved.",
  failed: "Something went wrong and nothing changed. Please try again.",
  dog: "Status saved, but the dog couldn't be marked adopted. Mark it adopted from its page.",
};

/** ?done= / ?error= line above an enquiry table. */
export function EnquiryNotice({ done, error }: { done?: string; error?: string }) {
  const key = error ?? done;
  if (!key || !(key in MESSAGES)) return null;
  return (
    <p
      role={error ? "alert" : "status"}
      className={`rounded-[16px] border-2 border-ink px-3.5 py-2.5 text-sm font-bold ${error ? "bg-surface" : "bg-fresh"}`}
    >
      {MESSAGES[key as keyof typeof MESSAGES]}
    </p>
  );
}

const contactLink = "inline-flex min-h-11 min-w-11 items-center font-bold lg:min-h-0 lg:min-w-0";

// Plain table (DESIGN.md §7 admin table): per row, a form with the native <select> for the 8
// statuses, a reason field and Save, stacked in one cell so they stay in view at 1280px. Works
// without JavaScript. `back` is where the action returns to (this page).
export function EnquiryTable({ label, enquiries, back }: { label: string; enquiries: Enquiry[]; back: string }) {
  return (
    <AdminTable label={label}>
      <table>
        <thead>
          <tr>
            <th>Adopter</th>
            <th>Dog</th>
            <th>Match</th>
            <th>Contact</th>
            <th>Status and reason (if unsuccessful)</th>
          </tr>
        </thead>
        <tbody>
          {enquiries.map((e) => {
            return (
              <tr key={e.id} className="align-top">
                <td>
                  <Link
                    href={`/admin/adopters/${e.adopter_id}`}
                    prefetch={false}
                    className="inline-flex min-h-11 items-center font-extrabold whitespace-nowrap lg:min-h-0"
                  >
                    {e.name}
                  </Link>
                  <span className="block text-xs text-muted">Sent {submittedLabel(e.created_at)}</span>
                  {e.message && <p className="mt-1 max-w-[16rem] min-w-[11rem] whitespace-pre-line">{e.message}</p>}
                </td>
                <td>
                  {e.dogs && (
                    <span className="flex flex-col items-start gap-1">
                      <Link
                        href={`/admin/dogs/${e.dogs.id}`}
                        prefetch={false}
                        className="inline-flex min-h-11 items-center font-extrabold whitespace-nowrap lg:min-h-0"
                      >
                        {e.dogs.name}
                      </Link>
                      {e.dogs.status !== "approved" && (
                        <StatusChip tone={DOG_STATUS[e.dogs.status].tone}>{DOG_STATUS[e.dogs.status].label}</StatusChip>
                      )}
                    </span>
                  )}
                </td>
                <td className="whitespace-nowrap tabular-nums">
                  <span className="font-extrabold">{Math.round(e.score)}%</span>
                  <span className="block text-xs text-muted">on {pct(e.confidence)} of the weight</span>
                </td>
                <td className="whitespace-nowrap">
                  {e.phone}
                  <span className="flex gap-3">
                    <a href={`tel:${e.phone}`} className={contactLink}>
                      Call
                    </a>
                    <a href={whatsApp(e.phone)} target="_blank" rel="noopener noreferrer" className={contactLink}>
                      WhatsApp
                    </a>
                  </span>
                  {e.email && <span className="block text-xs text-muted">{e.email}</span>}
                </td>
                <td>
                  <form action={setEnquiryStatus} className="flex w-52 flex-col gap-1.5">
                    <input type="hidden" name="id" value={e.id} />
                    <input type="hidden" name="back" value={back} />
                    <select
                      name="status"
                      defaultValue={e.status}
                      aria-label={`Status for ${e.name}`}
                      className={adminSelect}
                    >
                      {Object.entries(ENQUIRY_STATUS_LABEL).map(([value, text]) => (
                        <option key={value} value={value}>
                          {text}
                        </option>
                      ))}
                    </select>
                    <input
                      name="reason"
                      defaultValue={e.reason ?? ""}
                      maxLength={500}
                      aria-label={`Reason for ${e.name}`}
                      placeholder="Reason, if unsuccessful"
                      className={`${adminSelect} font-medium placeholder:text-muted`}
                    />
                    <button
                      type="submit"
                      aria-label={`Save status for ${e.name}`}
                      className={`${adminButton} self-start`}
                    >
                      Save
                    </button>
                  </form>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </AdminTable>
  );
}
