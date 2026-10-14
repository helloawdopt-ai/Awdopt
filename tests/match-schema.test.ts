import { describe, expect, it } from "vitest";
import { questionnaireSchema, toAdopter } from "@/lib/match-schema";
import { EMPTY_ANSWERS } from "@/lib/questionnaire";

const valid = {
  ...EMPTY_ANSWERS,
  name: "  Test Adopter ",
  age: "18",
  city: "Mumbai",
  phone: "98200 12345",
  home_type: "apartment_balcony",
  household: "family",
  has_children_under_12: "no",
  has_dogs: "yes",
  has_cats: "no",
  activity_level: "medium",
  hours_alone: "0",
  daily_time: "1_to_2h",
  experience: "some",
  open_to_special_needs: "no",
  open_to_senior: "yes",
  timeline: "exploring",
  consent: true,
};
const errorsFor = (v: unknown) =>
  questionnaireSchema.safeParse(v).error?.issues.map((i) => [i.path.join("."), i.message]) ?? [];

describe("questionnaireSchema", () => {
  it("accepts a complete questionnaire with no preferences", () => {
    expect(errorsFor(valid)).toEqual([]);
  });

  it("requires adopters to be 18 or older", () => {
    expect(errorsFor({ ...valid, age: "17" })).toEqual([["age", "You need to be 18 or older to adopt"]]);
    expect(errorsFor({ ...valid, age: "abc" })).toContainEqual(["age", "Enter your age in years"]);
  });

  it("limits hours alone to 0–24 and requires every single choice", () => {
    expect(errorsFor({ ...valid, hours_alone: "25" })).toEqual([["hours_alone", "Enter 0 to 24 hours"]]);
    expect(errorsFor({ ...valid, home_type: "", has_cats: "" }).map(([p]) => p)).toEqual(["home_type", "has_cats"]);
  });

  it("needs the unticked consent box ticked", () => {
    expect(errorsFor({ ...valid, consent: false })).toEqual([["consent", "Please confirm to see your matches"]]);
  });

  it("reads untouched chip groups as no preference and rejects unknown options", () => {
    expect(questionnaireSchema.parse({ ...valid, pref_sizes: false }).pref_sizes).toEqual([]);
    expect(errorsFor({ ...valid, pref_ages: ["kitten"] }).map(([p]) => p)).toEqual(["pref_ages.0"]);
  });
});

describe("toAdopter", () => {
  it("maps answers to the submit_questionnaire payload", () => {
    const v = questionnaireSchema.parse({ ...valid, pref_sizes: ["small"], email: "" });
    expect(toAdopter(v, "+919820012345")).toMatchObject({
      name: "Test Adopter",
      age: 18,
      phone: "+919820012345",
      email: null,
      has_children_under_12: false,
      has_dogs: true,
      hours_alone: 0,
      pref_sizes: ["small"],
      pref_breed: "any",
      open_to_special_needs: false,
      open_to_senior: true,
      adopt_reason: null,
    });
  });
});
