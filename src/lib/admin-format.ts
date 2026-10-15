import { ageLabel } from "@/lib/dog-format";

export const RELATIONSHIP_LABEL = {
  owner: "Owner",
  rescuer: "Rescuer",
  foster: "Foster",
  shelter_ngo: "Shelter / NGO",
  helper: "Helping out",
} as const;

/** "Mishti · 1 yr · Indie" */
export const dogTitle = (d: { name: string; age_months: number | null; breed: string | null }) =>
  [d.name, ageLabel(d.age_months), d.breed].filter(Boolean).join(" · ");

/** "Today", "Yesterday" or "12 Oct", in Mumbai time. */
export function submittedLabel(iso: string, now = new Date()) {
  const day = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  const yesterday = new Date(now.getTime() - 86_400_000);
  if (day(new Date(iso)) === day(now)) return "Today";
  if (day(new Date(iso)) === day(yesterday)) return "Yesterday";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });
}

export const DOG_STATUS = {
  pending: { label: "Waiting", tone: "highlight" },
  approved: { label: "Live", tone: "fresh" },
  adopted: { label: "Adopted", tone: "plain" },
  removed: { label: "Removed", tone: "plain" },
} as const;

/** "Matches" on the overview: enquiries that reached a meeting (there's no status history). */
export const MATCH_STATUSES = ["meeting", "adoption_in_progress", "adopted", "adoption_unsuccessful"] as const;

/** Option label for a stored value (questionnaire options), or the value itself. */
export const optionLabel = (options: readonly { value: string; label: string }[], v: string) =>
  options.find((o) => o.value === v)?.label ?? v;

/** wa.me wants digits only. */
export const whatsApp = (phone: string) => `https://wa.me/${phone.replace(/\D/g, "")}`;

/** The 8 outcome statuses (brief §13), in the brief's order. */
export const ENQUIRY_STATUS_LABEL = {
  interested: "Interested",
  contacted: "Contacted",
  meeting: "Meeting",
  rejected: "Rejected",
  adoption_in_progress: "Adoption in progress",
  adopted: "Adopted",
  adoption_unsuccessful: "Adoption unsuccessful",
  follow_up_required: "Follow-up required",
} as const;

/** 0.874 → "87%" */
export const pct = (n: number) => `${Math.round(n * 100)}%`;

/** Results-link state for admin tables: "Expired" or "Until 12 Oct 2026". */
export const linkState = (expiresIso: string) =>
  Date.parse(expiresIso) < Date.now()
    ? "Expired"
    : `Until ${new Date(expiresIso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" })}`;

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
