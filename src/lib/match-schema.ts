import * as z from "zod/mini";
import { emailField, nameField, phoneField } from "@/lib/contact-schema";
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
  TIMELINE,
} from "@/lib/questionnaire";

// One schema for the browser (react-hook-form) and the server action. Values arrive as strings
// (and string arrays for multi-pick chips). Limits match the DB CHECKs on public.adopters.

const values = <T extends string>(options: { value: T }[]) => options.map((o) => o.value) as [T, ...T[]];
const pick = <T extends string>(options: { value: T }[]) => z.enum(values(options), "Choose one");
// Checkbox chips: react-hook-form gives an array, or false when a group was never touched.
const picks = <T extends string>(options: { value: T }[]) =>
  z.pipe(
    z.transform((v: unknown) => (Array.isArray(v) ? v : [])),
    z.array(z.enum(values(options))),
  );
const yesNo = z.enum(["yes", "no"], "Choose one");
const whole = (min: number, max: number, msg: string) =>
  z.string().check(
    z.trim(),
    z.refine((v) => /^\d{1,3}$/.test(v) && +v >= min && +v <= max, msg),
  );

export const questionnaireSchema = z.object({
  // About you
  name: nameField,
  age: z.string().check(
    z.trim(),
    z.refine((v) => /^\d{1,3}$/.test(v) && +v <= 120, "Enter your age in years"),
    z.refine((v) => +v >= 18, "You need to be 18 or older to adopt"),
  ),
  city: z.string().check(z.trim(), z.minLength(1, "Enter your city"), z.maxLength(40, "Use 40 characters or fewer")),
  phone: phoneField,
  email: emailField,
  // Your home
  home_type: pick(HOME_TYPES),
  household: pick(HOUSEHOLDS),
  has_children_under_12: yesNo,
  has_dogs: yesNo,
  has_cats: yesNo,
  // Your days
  activity_level: pick(ACTIVITY),
  hours_alone: whole(0, 24, "Enter 0 to 24 hours"),
  daily_time: pick(DAILY_TIME),
  experience: pick(EXPERIENCE),
  // What you're looking for (empty = no preference)
  pref_sizes: picks(PREF_SIZES),
  pref_ages: picks(PREF_AGES),
  pref_energy: picks(PREF_ENERGY),
  pref_breed: z.enum(["", ...values(PREF_BREED)]),
  open_to_special_needs: yesNo,
  open_to_senior: yesNo,
  // Why adopt
  adopt_reason: z.string().check(z.trim(), z.maxLength(500, "Use 500 characters or fewer")),
  timeline: pick(TIMELINE),
  consent: z.literal(true, "Please confirm to see your matches"),
});

export type Answers = z.input<typeof questionnaireSchema>;
type Parsed = z.output<typeof questionnaireSchema>;

/** Validated answers → submit_questionnaire's `p` (phone already in E.164). */
export function toAdopter(v: Parsed, phone: string) {
  return {
    name: v.name,
    age: +v.age,
    city: v.city,
    phone,
    email: v.email || null,
    home_type: v.home_type,
    household: v.household,
    has_children_under_12: v.has_children_under_12 === "yes",
    has_dogs: v.has_dogs === "yes",
    has_cats: v.has_cats === "yes",
    activity_level: v.activity_level,
    hours_alone: +v.hours_alone,
    daily_time: v.daily_time,
    experience: v.experience,
    pref_sizes: v.pref_sizes,
    pref_ages: v.pref_ages,
    pref_energy: v.pref_energy,
    pref_breed: v.pref_breed || "any",
    open_to_special_needs: v.open_to_special_needs === "yes",
    open_to_senior: v.open_to_senior === "yes",
    adopt_reason: v.adopt_reason || null,
    timeline: v.timeline,
  };
}
