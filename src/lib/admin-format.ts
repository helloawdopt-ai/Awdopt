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
