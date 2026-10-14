import type { Database } from "@/lib/database.types";
import { SIZE_LABEL } from "@/lib/dog-format";
import type { AdopterAnswers, Category, Match, MatchDog } from "@/lib/server/matches";

// "Why this could work" / "Things to consider" (scope §3). The scoring function picks the
// categories (best ≥ 0.75, worst < 0.6); this map turns each into one data-led sentence. No AI, no
// free text: every sentence comes from the dog's profile and the adopter's answers.

type Enums = Database["public"]["Enums"];

/** The 8 categories in scope order, as labelled on the matching screen and the bars. */
export const CATEGORIES: { key: Category; label: string }[] = [
  { key: "lifestyle", label: "Lifestyle / activity" },
  { key: "living", label: "Living situation" },
  { key: "time", label: "Time availability" },
  { key: "household", label: "Children / other pets" },
  { key: "experience", label: "Dog experience" },
  { key: "size", label: "Size preference" },
  { key: "age", label: "Age preference" },
  { key: "special_needs", label: "Special-needs fit" },
];

const LEVEL: Record<Enums["energy_level"], number> = { low: 0, medium: 1, high: 2 };
const DAYS: Record<Enums["energy_level"], string> = { low: "quieter", medium: "steady", high: "active" };
const ENERGY: Record<Enums["energy_level"], string> = {
  low: "calm pace",
  medium: "balanced energy",
  high: "zoomies",
};
const HOME: Record<Enums["home_type"], string> = {
  apartment_no_balcony: "apartment",
  apartment_balcony: "apartment and balcony",
  independent_house: "independent house",
  house_with_garden: "house and garden",
};
const HANDLING: Record<Enums["handling_level"], string> = {
  easy: "easy to handle",
  moderate: "best with someone who has some experience",
  experienced_only: "best with an experienced owner",
};
const AGE: Record<Enums["age_band"], string> = {
  puppy: "a puppy",
  young: "young",
  adult: "an adult",
  senior: "a senior",
};

const hours = (h: number) => `${h} hour${h === 1 ? "" : "s"}`;
const list = (items: string[]) =>
  items.length < 2 ? (items[0] ?? "") : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
const size = (d: MatchDog) => (d.size ? SIZE_LABEL[d.size].toLowerCase() : null);
const band = (months: number | null): Enums["age_band"] | null =>
  months === null ? null : months < 12 ? "puppy" : months < 36 ? "young" : months < 96 ? "adult" : "senior";

/** Children, dogs and cats the adopter has at home where the dog's answer is `good`. */
function household(d: MatchDog, a: AdopterAnswers, good: boolean) {
  return [
    a.has_children_under_12 && d.good_with_children === good && "children",
    a.has_dogs && d.good_with_dogs === good && "dogs",
    a.has_cats && d.good_with_cats === good && "cats",
  ].filter((x): x is string => Boolean(x));
}

type Line = (d: MatchDog, a: AdopterAnswers) => string;

const WHY: Record<Category, Line> = {
  lifestyle: (d, a) =>
    d.energy
      ? `Your ${DAYS[a.activity_level]} days suit ${d.name}'s ${ENERGY[d.energy]}.`
      : `Your days suit ${d.name}'s energy.`,
  living: (d, a) =>
    size(d)
      ? `Your ${HOME[a.home_type]} has room for a ${size(d)} dog like ${d.name}.`
      : `${d.name} doesn't need a large space, so your ${HOME[a.home_type]} works.`,
  time: (d, a) =>
    d.alone_max_hours !== null
      ? `${d.name} can be alone up to ${hours(d.alone_max_hours)}, and you said about ${hours(a.hours_alone)}.`
      : `The time you can give each day suits ${d.name}'s energy.`,
  household: (d, a) => `${d.name} gets on with ${list(household(d, a, true))}, which suits your home.`,
  experience: (d) =>
    d.handling
      ? `${d.name} is ${HANDLING[d.handling]}, which suits your experience.`
      : `Your experience suits ${d.name}.`,
  size: (d) => `${d.name} is ${size(d) ?? "a size"}, a size you're looking for.`,
  age: (d) => `${d.name} is ${AGE[band(d.age_months) ?? "adult"]}, an age you're looking for.`,
  special_needs: (d, a) => {
    if (d.medical_needs && a.open_to_special_needs) return `${d.name} has special needs, and you're open to that.`;
    if (band(d.age_months) === "senior" && a.open_to_senior)
      return `${d.name} is a senior, and you're open to an older dog.`;
    return `${d.name} has no ongoing medical needs.`;
  },
};

const CONSIDER: Record<Category, Line> = {
  lifestyle: (d, a) => {
    if (!d.energy) return `${d.name}'s energy may not match your days.`;
    const gap = LEVEL[d.energy] - LEVEL[a.activity_level];
    if (gap > 0) return `${d.name} has more energy than the days you described.`;
    if (gap < 0) return `${d.name} is calmer than your days, so long outings may be too much.`;
    return `${d.name}'s ${ENERGY[d.energy]} isn't the energy you picked.`;
  },
  living: (d, a) =>
    d.needs_large_space
      ? `${d.name} needs a large space, and your ${HOME[a.home_type]} may feel tight.`
      : `${d.name} is a ${size(d) ?? "bigger"} dog, and your ${HOME[a.home_type]} may feel tight.`,
  time: (d, a) =>
    d.alone_max_hours !== null && a.hours_alone > d.alone_max_hours
      ? `${d.name} would be alone about ${hours(a.hours_alone)} on a normal day but is used to ${d.alone_max_hours}.`
      : `${d.name} needs more time each day than you can give right now.`,
  household: (d, a) => `${d.name} isn't comfortable with ${list(household(d, a, false))}, which you have at home.`,
  experience: (d) =>
    d.handling
      ? `${d.name} is ${HANDLING[d.handling]}, so a session with a trainer could help.`
      : `${d.name} may need more experience than you have.`,
  size: (d) => `${d.name} is ${size(d) ?? "a different size"}, not a size you picked.`,
  age: (d) => `${d.name} is ${AGE[band(d.age_months) ?? "adult"]}, not an age you picked.`,
  special_needs: (d, a) => {
    if (d.medical_needs && !a.open_to_special_needs) return `${d.name} has ongoing medical needs.`;
    if (band(d.age_months) === "senior" && !a.open_to_senior)
      return `${d.name} is a senior, and you said you'd prefer a younger dog.`;
    return `${d.name} has care needs worth asking about.`;
  },
};

/** Sentences for a match's explanation keys, in the order the scoring function ranked them. */
export function explain(m: Pick<Match, "why" | "consider" | "dog">, a: AdopterAnswers) {
  return {
    why: m.why.map((k) => WHY[k](m.dog, a)),
    consider: m.consider.map((k) => CONSIDER[k](m.dog, a)),
  };
}

/** Children/pets is left out of the score when the adopter has none at home: there's nothing to compare. */
export const appliesTo = (key: Category, a: AdopterAnswers) =>
  key !== "household" || a.has_children_under_12 || a.has_dogs || a.has_cats;

/** "3 dogs aren't shown because …" under the results, one line per hard constraint (Results.dc.html). */
export function excludedLine(key: string, n: number, a: AdopterAnswers) {
  const one = n === 1;
  const lead = `${n} ${one ? "dog isn't" : "dogs aren't"} shown because ${one ? "it" : "they"}`;
  const pets = [a.has_dogs && "dogs", a.has_cats && "cats"].filter((x): x is string => Boolean(x));
  switch (key) {
    case "children_under_12":
      return `${lead} ${one ? "isn't" : "aren't"} safe with children, and you have children under 12.`;
    case "other_pets":
      return `${lead} ${one ? "isn't" : "aren't"} safe with ${pets.join(" or ")}, and you have ${pets.length > 1 ? "both" : "one"} at home.`;
    case "large_space":
      return `${lead} ${one ? "needs" : "need"} a large space, and you live in an apartment.`;
    case "special_needs":
      return `${lead} ${one ? "has" : "have"} ongoing medical needs, and you said no to special needs.`;
    case "alone_time":
      return `${lead} can't be left alone for ${hours(a.hours_alone)} a day.`;
    default:
      return null;
  }
}
