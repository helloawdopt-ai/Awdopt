import { describe, expect, it } from "vitest";
import { CATEGORIES, emptyNote, excludedLine, explain } from "@/lib/explanations";
import type { AdopterAnswers, MatchDog } from "@/lib/server/matches";

const adopter: AdopterAnswers = {
  activity_level: "medium",
  home_type: "apartment_balcony",
  hours_alone: 5,
  daily_time: "1_to_2h",
  experience: "some",
  has_children_under_12: true,
  has_dogs: true,
  has_cats: false,
  pref_sizes: ["medium"],
  pref_ages: ["young"],
  pref_energy: [],
  open_to_special_needs: false,
  open_to_senior: false,
  expires_at: "2027-01-01T00:00:00Z",
};
const bruno: MatchDog = {
  slug: "bruno",
  name: "Bruno",
  urgent: false,
  sex: "male",
  age_months: 24,
  breed: "Indie",
  size: "medium",
  energy: "high",
  locality: "Bandra",
  good_with_children: true,
  good_with_dogs: true,
  good_with_cats: null,
  needs_large_space: false,
  alone_max_hours: 4,
  handling: "moderate",
  medical_needs: false,
  photo: null,
};
const keys = CATEGORIES.map((c) => c.key);

describe("explain", () => {
  it("lists all 8 categories in scope order", () => {
    expect(keys).toEqual(["lifestyle", "living", "time", "household", "experience", "size", "age", "special_needs"]);
  });

  it("turns explanation keys into data-led sentences", () => {
    expect(explain({ why: ["household", "size"], consider: ["time", "lifestyle"], dog: bruno }, adopter)).toEqual({
      why: [
        "Bruno gets on with children and dogs, which suits your home.",
        "Bruno is medium, a size you're looking for.",
      ],
      consider: [
        "Bruno would be alone about 5 hours on a normal day but is used to 4.",
        "Bruno has more energy than the days you described.",
      ],
    });
  });

  it("has a sentence for every key, even when the dog's profile is mostly unknown", () => {
    const unknown: MatchDog = { ...bruno, size: null, energy: null, age_months: null, handling: null };
    const out = explain({ why: keys, consider: keys, dog: unknown }, adopter);
    for (const line of [...out.why, ...out.consider]) {
      expect(line).toMatch(/^Bruno|^Your|^The/);
      expect(line).not.toMatch(/undefined|null|NaN/);
    }
  });
});

describe("emptyNote / excludedLine", () => {
  it("names empty bars that aren't missing data", () => {
    const none = { ...adopter, has_children_under_12: false, has_dogs: false, has_cats: false, pref_ages: [] };
    expect(emptyNote("household", none)).toBe("Doesn't apply");
    expect(emptyNote("age", none)).toBe("No preference");
    expect(emptyNote("household", adopter)).toBeNull();
    expect(emptyNote("size", adopter)).toBeNull();
    expect(emptyNote("lifestyle", none)).toBeNull();
  });

  it("explains each exclusion in plain words", () => {
    expect(excludedLine("other_pets", 3, adopter)).toBe(
      "3 dogs aren't shown because they aren't safe with dogs, and you have one at home.",
    );
    expect(excludedLine("alone_time", 1, adopter)).toBe(
      "1 dog isn't shown because it can't be left alone for 5 hours a day.",
    );
    expect(excludedLine("unknown_key", 2, adopter)).toBeNull();
  });
});
