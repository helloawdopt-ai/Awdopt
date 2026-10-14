import type { Database } from "@/lib/database.types";

// The adopter questionnaire's wording and options, in one place: copy edits are a change to this
// file only. Zod-free, so the browser loads the schema (and zod) only when it first validates.

type Enums = Database["public"]["Enums"];
type Option<T extends string = string> = { value: T; label: string };

export const yesNo: Option<"yes" | "no">[] = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];

export const HOME_TYPES: Option<Enums["home_type"]>[] = [
  { value: "apartment_no_balcony", label: "Apartment, no balcony" },
  { value: "apartment_balcony", label: "Apartment with balcony" },
  { value: "independent_house", label: "Independent house" },
  { value: "house_with_garden", label: "House with garden" },
];
export const HOUSEHOLDS: Option<Enums["household"]>[] = [
  { value: "alone", label: "Alone" },
  { value: "partner", label: "Partner" },
  { value: "family", label: "Family" },
  { value: "flatmates", label: "Flatmates" },
];
export const ACTIVITY: Option<Enums["energy_level"]>[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];
export const DAILY_TIME: Option<Enums["daily_time"]>[] = [
  { value: "under_1h", label: "Under 1 hr" },
  { value: "1_to_2h", label: "1–2 hrs" },
  { value: "2_to_4h", label: "2–4 hrs" },
  { value: "over_4h", label: "4+ hrs" },
];
export const EXPERIENCE: Option<Enums["experience_level"]>[] = [
  { value: "first_time", label: "This is my first" },
  { value: "some", label: "Some experience" },
  { value: "experienced", label: "Very experienced" },
];
export const PREF_SIZES: Option<Enums["dog_size"]>[] = [
  { value: "small", label: "Small" },
  { value: "medium", label: "Medium" },
  { value: "large", label: "Large" },
];
export const PREF_AGES: Option<Enums["age_band"]>[] = [
  { value: "puppy", label: "Puppy" },
  { value: "young", label: "Young" },
  { value: "adult", label: "Adult" },
  { value: "senior", label: "Senior" },
];
export const PREF_ENERGY: Option<Enums["energy_level"]>[] = [
  { value: "low", label: "Chill" },
  { value: "medium", label: "Balanced" },
  { value: "high", label: "Zoomies" },
];
export const PREF_BREED: Option<Enums["breed_preference"]>[] = [
  { value: "indie", label: "Indie" },
  { value: "pedigree", label: "Pedigree" },
  { value: "any", label: "No preference" },
];
export const TIMELINE: Option<Enums["adoption_timeline"]>[] = [
  { value: "asap", label: "As soon as possible" },
  { value: "within_month", label: "Within a month" },
  { value: "within_3_months", label: "Within 3 months" },
  { value: "exploring", label: "Just exploring" },
];

export const QUESTIONS = {
  name: "What's your name?",
  age: "How old are you?",
  ageHint: "You need to be 18 or older to adopt.",
  city: "Which city do you live in?",
  phone: "Phone / WhatsApp number",
  email: "Email",
  home_type: "What kind of home do you live in?",
  household: "Who do you live with?",
  has_children_under_12: "Any children under 12 at home?",
  has_dogs: "Any dogs at home?",
  has_cats: "Any cats at home?",
  activity_level: "How active are you?",
  hours_alone: "On a normal day, how many hours would the dog be alone?",
  hoursHint: "0 to 24.",
  daily_time: "How much time can you give the dog each day?",
  experience: "Have you had a dog before?",
  pref_sizes: "Size",
  pref_ages: "Age",
  pref_energy: "Energy",
  pref_breed: "Breed",
  open_to_special_needs: "Open to a dog with special needs?",
  open_to_senior: "Open to a senior dog?",
  adopt_reason: "Why do you want to adopt?",
  timeline: "When are you hoping to adopt?",
  submit: "Find My Matches",
} as const;

export const STEPS = [
  {
    slug: "basic",
    title: "About you",
    fields: ["name", "age", "city", "phone", "email"],
  },
  {
    slug: "home",
    title: "Your home",
    fields: ["home_type", "household", "has_children_under_12", "has_dogs", "has_cats"],
  },
  {
    slug: "lifestyle",
    title: "Your days",
    fields: ["activity_level", "hours_alone", "daily_time", "experience"],
  },
  {
    slug: "preferences",
    title: "What you're looking for",
    intro: "Pick any, or skip for no preference.",
    fields: ["pref_sizes", "pref_ages", "pref_energy", "pref_breed", "open_to_special_needs", "open_to_senior"],
  },
  {
    slug: "intent",
    title: "Why adopt",
    fields: ["adopt_reason", "timeline", "consent"],
  },
] as const;
export type StepSlug = (typeof STEPS)[number]["slug"];

export const EMPTY_ANSWERS = {
  name: "",
  age: "",
  city: "",
  phone: "",
  email: "",
  home_type: "",
  household: "",
  has_children_under_12: "",
  has_dogs: "",
  has_cats: "",
  activity_level: "",
  hours_alone: "",
  daily_time: "",
  experience: "",
  pref_sizes: [] as string[],
  pref_ages: [] as string[],
  pref_energy: [] as string[],
  pref_breed: "",
  open_to_special_needs: "",
  open_to_senior: "",
  adopt_reason: "",
  timeline: "",
  consent: false,
};
