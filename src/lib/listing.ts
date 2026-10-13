import type { ListingValues } from "@/lib/listing-schema";

// Zod-free listing constants, so the browser can load the schema (and zod) only when it first validates.
export type { ListingValues };

export const STEPS = [
  { slug: "you", title: "About you", fields: ["lister_name", "lister_phone", "lister_email", "relationship"] },
  {
    slug: "dog",
    title: "About the dog",
    fields: ["name", "sex", "size", "energy", "good_with_children", "good_with_dogs", "good_with_cats", "video_url"],
  },
  {
    slug: "health",
    title: "Health & story",
    fields: ["medical_needs", "medical_notes", "vaccination", "sterilised", "temperament", "story"],
  },
  {
    slug: "home",
    title: "Home & routine",
    fields: [
      "age_years",
      "age_months",
      "breed",
      "locality",
      "needs_large_space",
      "alone_max_hours",
      "handling",
      "rehoming_reason",
    ],
  },
  { slug: "details", title: "Last details", fields: ["other_info", "urgent", "consent"] },
] as const satisfies readonly { slug: string; title: string; fields: readonly (keyof ListingValues)[] }[];
export type StepSlug = (typeof STEPS)[number]["slug"];

export const EMPTY_LISTING: Omit<ListingValues, "relationship" | "consent"> & { relationship: ""; consent: false } = {
  lister_name: "",
  lister_phone: "",
  lister_email: "",
  relationship: "",
  name: "",
  sex: "",
  size: "",
  energy: "",
  good_with_children: "",
  good_with_dogs: "",
  good_with_cats: "",
  video_url: "",
  medical_needs: "",
  medical_notes: "",
  vaccination: "",
  sterilised: "",
  temperament: "",
  story: "",
  age_years: "",
  age_months: "",
  breed: "",
  locality: "",
  needs_large_space: "",
  alone_max_hours: "",
  handling: "",
  rehoming_reason: "",
  other_info: "",
  urgent: false,
  consent: false,
};

export type PhotoMeta = { width: number; height: number; ext: "webp" | "jpg" };
export const MAX_PHOTOS = 6;
export const PHOTO_WIDTHS = [480, 960, 1600] as const;

export function validPhotos(p: unknown): p is PhotoMeta[] {
  return (
    Array.isArray(p) &&
    p.length >= 1 &&
    p.length <= MAX_PHOTOS &&
    p.every(
      (x) =>
        x &&
        typeof x === "object" &&
        Number.isInteger(x.width) &&
        Number.isInteger(x.height) &&
        x.width > 0 &&
        x.width <= 1600 &&
        x.height > 0 &&
        x.height <= 6400 &&
        (x.ext === "webp" || x.ext === "jpg"),
    )
  );
}
