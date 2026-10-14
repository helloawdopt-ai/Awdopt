import type { Database } from "@/lib/database.types";

// Field options shared by the listing form, discovery filters and profile. Developer defaults
// until the client signs off the field list (see M1 sign-off doc).
type Enums = Database["public"]["Enums"];
export type Size = Enums["dog_size"];
export type Energy = Enums["energy_level"];
export type AgeBand = Enums["age_band"];

export const NOT_KNOWN = "Not known yet";

export const REGIONS = {
  south: {
    label: "South Mumbai",
    areas: ["Colaba", "Fort", "Malabar Hill", "Byculla", "Worli", "Lower Parel", "Dadar", "Mahim", "Matunga"],
  },
  western: {
    label: "Western suburbs",
    areas: [
      "Bandra",
      "Khar",
      "Santacruz",
      "Juhu",
      "Vile Parle",
      "Andheri East",
      "Andheri West",
      "Jogeshwari",
      "Goregaon",
      "Malad",
      "Kandivali",
      "Borivali",
      "Dahisar",
    ],
  },
  central: {
    label: "Central suburbs",
    areas: ["Sion", "Kurla", "Chembur", "Ghatkopar", "Vikhroli", "Powai", "Bhandup", "Mulund"],
  },
  thane: { label: "Thane & Navi Mumbai", areas: ["Thane", "Navi Mumbai", "Mira-Bhayandar"] },
  other: { label: "Other", areas: ["Other Mumbai area"] },
} as const;
export type Region = keyof typeof REGIONS;
export const LOCALITIES: readonly string[] = Object.values(REGIONS).flatMap((r) => r.areas);

export const INDIE = "Indie";
export const OTHER_BREED = "Mixed / Other";
export const PEDIGREE_BREEDS = [
  "Labrador Retriever",
  "Golden Retriever",
  "German Shepherd",
  "Beagle",
  "Pug",
  "Shih Tzu",
  "Pomeranian",
  "Rottweiler",
  "Doberman",
  "Dachshund",
  "Cocker Spaniel",
  "Lhasa Apso",
  "Siberian Husky",
  "Boxer",
  "Great Dane",
] as const;
export const BREEDS: readonly string[] = [INDIE, ...PEDIGREE_BREEDS, OTHER_BREED];

export const SIZE_LABEL: Record<Size, string> = { small: "Small", medium: "Medium", large: "Large" };
export const ENERGY_LABEL: Record<Energy, string> = { low: "Chill", medium: "Balanced", high: "Zoomies" };
export const SEX_LABEL = { male: "Male", female: "Female" } as const;
export const VACCINATION_LABEL = { full: "Vaccinated", partial: "Partly vaccinated", none: "Not vaccinated" } as const;
export const HANDLING_LABEL = {
  easy: "Easy to handle",
  moderate: "Needs some experience",
  experienced_only: "Experienced owners only",
} as const;

// Age bands (scope sign-off): Puppy < 1 yr · Young 1–3 · Adult 3–8 · Senior 8+. [min, max) in months.
export const AGE_BANDS: Record<AgeBand, { label: string; months: [number, number] }> = {
  puppy: { label: "Puppy", months: [0, 12] },
  young: { label: "Young", months: [12, 36] },
  adult: { label: "Adult", months: [36, 96] },
  senior: { label: "Senior", months: [96, 301] },
};

export function ageLabel(months: number | null) {
  if (months === null) return null;
  if (months < 12) return `${months} mo${months === 1 ? "" : "s"}`;
  const years = Math.floor(months / 12);
  return `${years} yr${years === 1 ? "" : "s"}`;
}

/** "Male · 2 yrs · Indie · Medium": known values only. */
export function dogMeta(d: {
  sex: keyof typeof SEX_LABEL | null;
  age_months: number | null;
  breed: string | null;
  size: Size | null;
}) {
  return [d.sex && SEX_LABEL[d.sex], ageLabel(d.age_months), d.breed, d.size && SIZE_LABEL[d.size]]
    .filter(Boolean)
    .join(" · ");
}

// Discovery filters live in the URL query. Unknown values are dropped; order is fixed so the
// same filters always produce the same cache key.
export const FILTERS = {
  area: Object.keys(REGIONS) as Region[],
  age: Object.keys(AGE_BANDS) as AgeBand[],
  size: Object.keys(SIZE_LABEL) as Size[],
  breed: ["indie", "pedigree"] as const,
  energy: Object.keys(ENERGY_LABEL) as Energy[],
};
export type Filters = { [K in keyof typeof FILTERS]: (typeof FILTERS)[K][number][] };
export type SearchParams = Record<string, string | string[] | undefined>;

export function parseFilters(sp: SearchParams): Filters {
  const pick = <T extends string>(key: string, allowed: readonly T[]) => {
    const given = new Set([sp[key] ?? []].flat());
    return allowed.filter((v) => given.has(v));
  };
  return {
    area: pick("area", FILTERS.area),
    age: pick("age", FILTERS.age),
    size: pick("size", FILTERS.size),
    breed: pick("breed", FILTERS.breed),
    energy: pick("energy", FILTERS.energy),
  };
}

export const FILTER_LABEL = {
  area: (v: Region) => REGIONS[v].label,
  age: (v: AgeBand) => AGE_BANDS[v].label,
  size: (v: Size) => SIZE_LABEL[v],
  breed: (v: "indie" | "pedigree") => (v === "indie" ? "Indie" : "Pedigree"),
  energy: (v: Energy) => ENERGY_LABEL[v],
};

export function filtersQuery(f: Filters) {
  const q = new URLSearchParams();
  for (const [key, values] of Object.entries(f)) for (const v of values) q.append(key, v);
  const s = q.toString();
  return s ? `?${s}` : "";
}
