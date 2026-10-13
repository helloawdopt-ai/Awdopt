import * as z from "zod/mini";
import { BREEDS, LOCALITIES } from "@/lib/dog-format";
export * from "@/lib/listing";

// One schema for the browser (react-hook-form) and the server action. Every value arrives as a
// string from a form control; toListing() turns blanks into NULL ("Not known yet").
// Limits match the DB CHECKs in supabase/migrations/20261012120000_schema.sql.

const text = (max: number, msg: string) => z.string().check(z.trim(), z.maxLength(max, msg));
const choice = <const T extends string[]>(...values: T) => z.enum(["", ...values] as ["", ...T]);
const intIn = (min: number, max: number, msg: string) =>
  z.string().check(
    z.trim(),
    z.refine((v) => v === "" || (/^\d{1,3}$/.test(v) && +v >= min && +v <= max), msg),
  );

export const VIDEO_URL = /^https:\/\/(www\.|m\.)?(youtube\.com|youtu\.be|drive\.google\.com)\//;

export const listingSchema = z.object({
  // Step 1: you (never shown publicly)
  lister_name: z
    .string()
    .check(z.trim(), z.minLength(1, "Enter your name"), z.maxLength(80, "Use 80 characters or fewer")),
  lister_phone: z
    .string()
    .check(z.trim(), z.regex(/^\+?[\d\s()-]{8,20}$/, "Enter a phone number, for example 98200 12345")),
  lister_email: z.string().check(
    z.trim(),
    z.maxLength(254, "Use 254 characters or fewer"),
    z.refine((v) => v === "" || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v), "Enter an email like name@example.com"),
  ),
  relationship: z.enum(["owner", "rescuer", "foster", "shelter_ngo", "helper"], "Choose one"),
  // Step 2: the dog
  name: z
    .string()
    .check(z.trim(), z.minLength(1, "Enter the dog's name"), z.maxLength(40, "Use 40 characters or fewer")),
  sex: choice("male", "female"),
  size: choice("small", "medium", "large"),
  energy: choice("low", "medium", "high"),
  good_with_children: choice("yes", "no"),
  good_with_dogs: choice("yes", "no"),
  good_with_cats: choice("yes", "no"),
  video_url: z.string().check(
    z.trim(),
    z.maxLength(300, "Use a shorter link"),
    z.refine((v) => v === "" || VIDEO_URL.test(v), "Use a YouTube or Google Drive link starting with https://"),
  ),
  // Step 3: health & story
  medical_needs: choice("yes", "no"),
  medical_notes: text(500, "Use 500 characters or fewer"),
  vaccination: choice("full", "partial", "none"),
  sterilised: choice("yes", "no"),
  temperament: text(300, "Use 300 characters or fewer"),
  story: text(2000, "Use 2,000 characters or fewer"),
  // Step 4: home & routine
  age_years: intIn(0, 25, "Enter 0 to 25 years"),
  age_months: intIn(0, 11, "Enter 0 to 11 months"),
  breed: z.string().check(z.refine((v) => v === "" || BREEDS.includes(v), "Choose from the list")),
  locality: z.string().check(z.refine((v) => LOCALITIES.includes(v), "Choose the area")),
  needs_large_space: choice("yes", "no"),
  alone_max_hours: intIn(0, 12, "Enter 0 to 12 hours"),
  handling: choice("easy", "moderate", "experienced_only"),
  rehoming_reason: text(500, "Use 500 characters or fewer"),
  // Step 5: last details
  other_info: text(1000, "Use 1,000 characters or fewer"),
  urgent: z.boolean(),
  consent: z.literal(true, "Please confirm to send the listing"),
});

export type ListingValues = z.infer<typeof listingSchema>;

const nul = <T extends string>(v: T | "") => (v === "" ? null : v);
const bool = (v: "yes" | "no" | "") => (v === "" ? null : v === "yes");

/** Validated form values → submit_listing's `dog` object (blanks become NULL). */
export function toDog(v: ListingValues) {
  const age = v.age_years === "" && v.age_months === "" ? null : +(v.age_years || 0) * 12 + +(v.age_months || 0);
  return {
    name: v.name,
    urgent: v.urgent,
    sex: nul(v.sex),
    age_months: age,
    breed: nul(v.breed),
    size: nul(v.size),
    energy: nul(v.energy),
    locality: v.locality,
    temperament: nul(v.temperament),
    good_with_children: bool(v.good_with_children),
    good_with_dogs: bool(v.good_with_dogs),
    good_with_cats: bool(v.good_with_cats),
    needs_large_space: bool(v.needs_large_space),
    alone_max_hours: v.alone_max_hours === "" ? null : +v.alone_max_hours,
    handling: nul(v.handling),
    medical_needs: bool(v.medical_needs),
    medical_notes: nul(v.medical_notes),
    vaccination: nul(v.vaccination),
    sterilised: bool(v.sterilised),
    rehoming_reason: nul(v.rehoming_reason),
    story: nul(v.story),
    other_info: nul(v.other_info),
    video_url: nul(v.video_url),
  };
}
