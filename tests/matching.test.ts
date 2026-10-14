import { createHash, randomBytes } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Matching engine (scope §3) against awdopt-dev: 10 made-up dogs × 5 made-up adopters, every
// expected value worked out by hand from the formulas in supabase/migrations/*_matching.sql.
// Weights L 25 · Lv 20 · T 15 · H 10 · E 10 · S 10 · A 5 · SN 5. Positions: energy/size/handling/
// experience 0–2, age band 0–3 (puppy, young, adult, senior), home space 0–2. step(gap) = 1 − 0.5·gap.
// Children/pets doesn't apply to adopters with no kids, dogs or cats (A2, A4): it leaves the score
// and the confidence total (Σw = 90), rather than counting as unknown.
const DEV_HOST = "bdrkuwznuuklrryxddba.supabase.co";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const secret = process.env.SUPABASE_SECRET_KEY ?? "";
if (!url || !secret)
  throw new Error("Matching tests need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local");
// Inserts approved dogs and flips weights/constraints, so it must never point at prod.
if (new URL(url).host !== DEV_HOST) throw new Error("Matching tests only run against awdopt-dev");

const headers = {
  apikey: secret,
  "Content-Type": "application/json",
  ...(secret.startsWith("eyJ") ? { Authorization: `Bearer ${secret}` } : {}),
};
async function rest<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${url}/rest/v1/${path}`, { ...init, headers: { ...headers, ...init.headers } });
  const body = await res.text();
  if (!res.ok) throw new Error(`${path}: ${res.status} ${body}`);
  return (body ? JSON.parse(body) : null) as T;
}

const LISTER = "00000000-0000-4000-f000-000000000000";
const dogId = (n: number) => `00000000-0000-4000-f000-0000000000${String(n).padStart(2, "0")}`;
const adopterId = (n: number) => `00000000-0000-4000-f100-00000000000${n}`;

const NO_DATA = {
  age_months: null,
  size: null,
  energy: null,
  good_with_children: null,
  good_with_dogs: null,
  good_with_cats: null,
  needs_large_space: null,
  alone_max_hours: null,
  handling: null,
  medical_needs: null,
};
const yes = true;
const no = false;
// prettier-ignore
const DOGS: Record<number, Record<string, unknown>> = {
  1:  { age_months: 24, size: "medium", energy: "medium", good_with_children: yes, good_with_dogs: yes, good_with_cats: yes, needs_large_space: no, alone_max_hours: 8, handling: "easy", medical_needs: no },
  2:  {}, // nothing known
  3:  { age_months: 48, size: "small", energy: "low", good_with_children: no, good_with_dogs: yes, good_with_cats: yes, needs_large_space: no, alone_max_hours: 6, handling: "easy", medical_needs: no },
  4:  { age_months: 36, size: "large", energy: "high", good_with_children: yes, good_with_dogs: yes, good_with_cats: no, needs_large_space: no, alone_max_hours: 4, handling: "moderate", medical_needs: no },
  5:  { age_months: 60, size: "large", energy: "medium", good_with_children: yes, good_with_dogs: yes, good_with_cats: yes, needs_large_space: yes, alone_max_hours: 6, handling: "moderate", medical_needs: no },
  6:  { age_months: 120, size: "small", energy: "low", good_with_children: yes, good_with_dogs: yes, good_with_cats: yes, needs_large_space: no, alone_max_hours: 10, handling: "easy", medical_needs: yes },
  7:  { age_months: 6, size: "small", energy: "high", good_with_children: yes, good_with_dogs: yes, needs_large_space: no, alone_max_hours: 2, handling: "easy", medical_needs: no },
  8:  { age_months: 30, size: "medium", energy: "high", good_with_children: yes, needs_large_space: no, alone_max_hours: 5, handling: "experienced_only", medical_needs: no },
  9:  { age_months: 30, size: "medium", energy: "high", good_with_children: yes, needs_large_space: no, alone_max_hours: 5, handling: "experienced_only", medical_needs: no }, // D8's twin, listed later
  10: { age_months: 18, size: "medium" }, // half known
};

// prettier-ignore
const ADOPTERS: Record<number, Record<string, unknown>> = {
  // A1: balcony flat (space 1), kids + cats, medium (1), 4 h alone, 1–2 h daily (1), some experience (1)
  1: { home_type: "apartment_balcony", household: "family", has_children_under_12: yes, has_dogs: no, has_cats: yes, activity_level: "medium", hours_alone: 4, daily_time: "1_to_2h", experience: "some", pref_sizes: ["small", "medium"], pref_ages: ["young"], pref_energy: [], open_to_special_needs: no, open_to_senior: no },
  // A2: house with garden (2), no kids/pets, high (2), 6 h alone, 4+ h daily (3), experienced (2), no preferences
  2: { home_type: "house_with_garden", household: "alone", has_children_under_12: no, has_dogs: no, has_cats: no, activity_level: "high", hours_alone: 6, daily_time: "over_4h", experience: "experienced", pref_sizes: [], pref_ages: [], pref_energy: [], open_to_special_needs: yes, open_to_senior: yes },
  // A3: flat, no balcony (0), a dog at home, low (0), 2 h alone, under 1 h daily (0), first dog (0)
  3: { home_type: "apartment_no_balcony", household: "flatmates", has_children_under_12: no, has_dogs: yes, has_cats: no, activity_level: "low", hours_alone: 2, daily_time: "under_1h", experience: "first_time", pref_sizes: ["small"], pref_ages: ["adult", "senior"], pref_energy: ["low"], open_to_special_needs: yes, open_to_senior: no },
  // A4: flat, no balcony (0), no kids/pets, medium (1), 6 h alone, 2–4 h daily (2), experienced (2)
  4: { home_type: "apartment_no_balcony", household: "partner", has_children_under_12: no, has_dogs: no, has_cats: no, activity_level: "medium", hours_alone: 6, daily_time: "2_to_4h", experience: "experienced", pref_sizes: [], pref_ages: ["senior"], pref_energy: ["low", "medium"], open_to_special_needs: no, open_to_senior: yes },
  // A5: independent house (2), kids + a dog, high (2), 0 h alone, 2–4 h daily (2), first dog (0)
  5: { home_type: "independent_house", household: "family", has_children_under_12: yes, has_dogs: yes, has_cats: no, activity_level: "high", hours_alone: 0, daily_time: "2_to_4h", experience: "first_time", pref_sizes: ["large"], pref_ages: ["puppy", "young"], pref_energy: ["high"], open_to_special_needs: yes, open_to_senior: no },
};

type Row = {
  dog_id: string;
  rank: number | null;
  score: number | null;
  confidence: number;
  categories: Record<string, number | null>;
  why: string[];
  consider: string[];
  excluded_by: string[];
};

// Ranked [dog, score, confidence] per adopter, then the excluded dogs and why.
const EXPECTED: Record<number, { ranked: [number, number, number][]; excluded: Record<number, string[]> }> = {
  1: {
    ranked: [
      // D1: every category 1 → 100, all 8 answered
      [1, 100, 1],
      // D10: only living (need 1 − space 1 → 1), size (medium ∈ prefs → 1), age (young → 1) answered:
      // 35/35 → 100 on confidence 0.35 (renormalised)
      [10, 100, 0.35],
      // D8: L |1−2| .5 · Lv 1 · T (alone 4 ≤ 5 → 1, daily 2−1 → .5) .75 · H (kids 1, cats unknown) 1 ·
      // E 2−1 → .5 · S 1 · A 1 · SN neither 1 → 12.5+20+11.25+10+5+10+5+5 = 78.75
      [8, 78.75, 1],
      [9, 78.75, 1], // identical to D8, listed later
      [2, 0, 0], // nothing known: k = 0 everywhere
    ],
    excluded: {
      3: ["children_under_12"],
      4: ["other_pets"],
      5: ["large_space"],
      6: ["special_needs"],
      7: ["alone_time"],
    },
  },
  2: {
    ranked: [
      // D10: only Lv (1 − 2 → 1) answered → 20/20 = 100 on 20/90 = 0.222
      [10, 100, 0.222],
      // D1: L .5 · Lv 1 · T 1 · E 1 · SN 1, no size/age preference → 62.5/75 = 83.33 on 75/90
      [1, 83.33, 0.833],
      // D5: same as D1 (needs space, has a garden) → 83.33, listed after D1
      [5, 83.33, 0.833],
      // D3: L |2−0| 0 · Lv 1 · T 1 · E 1 · SN 1 → 50/75 = 66.67
      [3, 66.67, 0.833],
      // D6: as D3, SN (medical + senior, open to both) 1 → 66.67, listed after D3
      [6, 66.67, 0.833],
      [2, 0, 0], // nothing known
    ],
    excluded: { 4: ["alone_time"], 7: ["alone_time"], 8: ["alone_time"], 9: ["alone_time"] },
  },
  3: {
    ranked: [
      // D3: everything 1 → 100
      [3, 100, 1],
      // D6: SN (medical, open → 1; senior, not open → 0) .5, rest 1 → 97.5
      [6, 97.5, 1],
      // D1: L (|0−1| .5, pref .5) .5 · Lv 1−0 → .5 · T (1, daily 1−0 → .5) .75 · H 1 · E 1 · S .5 · A .5 · SN 1
      // → 12.5+10+11.25+10+10+5+2.5+5 = 66.25
      [1, 66.25, 1],
      // D7: L 0 · Lv 1 · T (1, daily 2 → 0) .5 · H 1 · E 1 · S 1 · A puppy vs adult/senior 0 · SN 1
      // → 0+20+7.5+10+10+10+0+5 = 62.5
      [7, 62.5, 1],
      // D10: Lv .5 · S .5 · A .5 → 17.5/35 = 50
      [10, 50, 0.35],
      // D8: L 0 · Lv .5 · T .5 · H unknown (good with dogs?) · E 2−0 → 0 · S .5 · A .5 · SN 1 → 30/90 = 33.33
      [8, 33.33, 0.9],
      [9, 33.33, 0.9],
      // D4: L 0 · Lv 2−0 → 0 · T (1, daily 2 → 0) .5 · H 1 · E .5 · S 0 · A 1 · SN 1 → 32.5
      [4, 32.5, 1],
      [2, 0, 0],
    ],
    excluded: { 5: ["large_space"] },
  },
  4: {
    ranked: [
      // D3: L (|1−0| .5, pref low 1) .75 · Lv 1 · T 1 · E 1 · A adult vs senior .5 · SN 1, no size pref
      // → 18.75+20+15+10+2.5+5 = 71.25/80 = 89.06 on 80/90
      [3, 89.06, 0.889],
      // D1: L 1 · Lv 1−0 → .5 · T 1 · E 1 · A young vs senior 0 · SN 1 → 65/80 = 81.25
      [1, 81.25, 0.889],
      // D10: Lv .5 · A 0 → 10/25 = 40 on 25/90
      [10, 40, 0.278],
      [2, 0, 0],
    ],
    excluded: {
      4: ["alone_time"],
      5: ["large_space"],
      6: ["special_needs"],
      7: ["alone_time"],
      8: ["alone_time"],
      9: ["alone_time"],
    },
  },
  5: {
    ranked: [
      // D4: L 1 · Lv 1 · T 1 · H 1 · E 1−0 → .5 · S 1 · A adult vs puppy/young .5 · SN 1 → 92.5
      [4, 92.5, 1],
      // D7: everything 1 except S (small vs large) 0 → 90
      [7, 90, 1],
      // D10: Lv 1 · S .5 · A 1 → 30/35 = 85.71
      [10, 85.71, 0.35],
      // D8: L 1 · Lv 1 · T 1 · H (kids 1, dogs unknown) 1 · E 2−0 → 0 · S .5 · A 1 · SN 1 → 85
      [8, 85, 1],
      [9, 85, 1],
      // D1: L .5 · Lv 1 · T 1 · H 1 · E 1 · S .5 · A 1 · SN 1 → 82.5
      [1, 82.5, 1],
      // D5: L .5 · Lv 1 · T 1 · H 1 · E .5 · S 1 · A .5 · SN 1 → 80
      [5, 80, 1],
      // D6: L 0 · Lv 1 · T 1 · H 1 · E 1 · S 0 · A 0 · SN (medical 1, senior 0) .5 → 57.5
      [6, 57.5, 1],
      [2, 0, 0],
    ],
    excluded: { 3: ["children_under_12"] },
  },
};

const tokens: Record<number, string> = {};
const hash = (token: string) => "\\x" + createHash("sha256").update(token).digest("hex");
const score = (adopter: number) =>
  rest<Row[]>("rpc/score_dogs_for_adopter", {
    method: "POST",
    body: JSON.stringify({ p_adopter_id: adopterId(adopter) }),
  }).then((rows) => rows.filter((r) => r.dog_id.startsWith("00000000-0000-4000-f000-")));
const dogNo = (id: string) => Number(id.slice(-2));
const now = new Date().toISOString();

beforeAll(async () => {
  await rest("listers", {
    method: "POST",
    body: JSON.stringify({
      id: LISTER,
      name: "Fixture Lister",
      phone: "+910000000088",
      relationship: "rescuer",
      consent_at: now,
    }),
  });
  await rest("dogs", {
    method: "POST",
    body: JSON.stringify(
      Object.entries(DOGS).map(([n, fields]) => ({
        ...NO_DATA,
        ...fields,
        id: dogId(Number(n)),
        slug: `fixture-match-${n}`,
        lister_id: LISTER,
        status: "approved",
        name: `Fixture Dog ${n}`,
        locality: "Bandra",
        approved_at: now,
        // Listing order breaks ties: D1 first … D10 last.
        created_at: new Date(Date.UTC(2020, 0, 1, 0, Number(n))).toISOString(),
      })),
    ),
  });
  await rest("adopters", {
    method: "POST",
    body: JSON.stringify(
      Object.entries(ADOPTERS).map(([n, answers]) => {
        tokens[Number(n)] = randomBytes(32).toString("base64url");
        return {
          ...answers,
          id: adopterId(Number(n)),
          name: `Fixture Adopter ${n}`,
          age: 30,
          city: "Mumbai",
          phone: `+91000000007${n}`,
          pref_breed: "any",
          timeline: "exploring",
          results_token_hash: hash(tokens[Number(n)]!),
          token_expires_at: new Date(Date.now() + 3_600_000).toISOString(),
          consent_at: now,
        };
      }),
    ),
  });
}, 30_000);

const QUIZ_PHONE = "+910000000066"; // adopters created through submit_questionnaire below

afterAll(async () => {
  // Enquiries go with their adopter (on delete cascade).
  await rest(`adopters?phone=eq.${encodeURIComponent(QUIZ_PHONE)}`, { method: "DELETE" });
  await rest(`adopters?id=in.(${Object.keys(ADOPTERS).map((n) => adopterId(Number(n)))})`, { method: "DELETE" });
  await rest(`dogs?lister_id=eq.${LISTER}`, { method: "DELETE" });
  await rest(`listers?id=eq.${LISTER}`, { method: "DELETE" });
});

describe("score_dogs_for_adopter", () => {
  it.each([1, 2, 3, 4, 5])("ranks adopter %i's eligible dogs as hand-computed", async (a) => {
    const rows = await score(a);
    const ranked = rows.filter((r) => r.rank !== null);
    expect(ranked.map((r) => [dogNo(r.dog_id), r.score, r.confidence])).toEqual(EXPECTED[a]!.ranked);
    // Rank order matches (seed dogs on dev may sit between the fixtures).
    expect(ranked.every((r, i) => i === 0 || r.rank! > ranked[i - 1]!.rank!)).toBe(true);
  });

  it.each([1, 2, 3, 4, 5])("excludes adopter %i's dogs that fail a hard constraint", async (a) => {
    const excluded = (await score(a)).filter((r) => r.rank === null);
    expect(Object.fromEntries(excluded.map((r) => [dogNo(r.dog_id), r.excluded_by]))).toEqual(EXPECTED[a]!.excluded);
    for (const r of excluded) expect(r.score).toBeNull();
  });

  it("covers every hard constraint (adopter 1 trips each one once)", () => {
    expect(Object.values(EXPECTED[1]!.excluded).flat().sort()).toEqual(
      ["alone_time", "children_under_12", "large_space", "other_pets", "special_needs"].sort(),
    );
  });

  it("gives unanswered data no points: a dog with nothing known scores 0 with confidence 0", async () => {
    const d2 = (await score(1)).find((r) => dogNo(r.dog_id) === 2)!;
    expect(Object.values(d2.categories).every((s) => s === null)).toBe(true);
    expect([d2.score, d2.confidence]).toEqual([0, 0]);
  });

  it("leaves Children/pets out of score and confidence when the adopter has no kids or pets", async () => {
    const d1 = (await score(2)).find((r) => dogNo(r.dog_id) === 1)!;
    expect(d1.categories.household).toBeNull();
    // Answered: L, Lv, T, E, SN = 75 of the 90 that apply (no size/age preference), not of 100.
    expect([d1.score, d1.confidence]).toEqual([83.33, 0.833]);
  });

  it("renormalises over answered categories and reports the confidence", async () => {
    const d10 = (await score(1)).find((r) => dogNo(r.dog_id) === 10)!;
    expect(d10.categories).toEqual({
      lifestyle: null,
      living: 1,
      time: null,
      household: null,
      experience: null,
      size: 1,
      age: 1,
      special_needs: null,
    });
    expect([d10.score, d10.confidence]).toEqual([100, 0.35]);
  });

  it("returns explanation keys: up to 3 best (≥ 0.75), up to 2 worst (< 0.6)", async () => {
    const pick = (rows: Row[], n: number) => {
      const r = rows.find((x) => dogNo(x.dog_id) === n)!;
      return [r.why, r.consider];
    };
    const a1 = await score(1);
    expect(pick(a1, 1)).toEqual([["lifestyle", "living", "time"], []]);
    expect(pick(a1, 8)).toEqual([
      ["living", "household", "size"],
      ["lifestyle", "experience"],
    ]);
    const a3 = await score(3);
    expect(pick(a3, 1)).toEqual([
      ["household", "experience", "special_needs"],
      ["lifestyle", "living"],
    ]);
    expect(pick(a3, 6)).toEqual([["lifestyle", "living", "time"], ["special_needs"]]);
    expect(pick(a3, 7)).toEqual([
      ["living", "household", "experience"],
      ["lifestyle", "age"],
    ]);
    const a4 = await score(4);
    expect(pick(a4, 1)).toEqual([
      ["lifestyle", "time", "experience"],
      ["age", "living"],
    ]);
  });

  it("lets a dog back in, scored, when its constraint is switched off", async () => {
    await rest("hard_constraints?key=eq.children_under_12", {
      method: "PATCH",
      body: JSON.stringify({ enabled: false }),
    });
    try {
      // D3 for A1: L |1−0| .5 · Lv 1 · T 1 · H (kids 0, cats 1) .5 · E 1 · S 1 · A adult vs young .5 · SN 1
      // → 12.5+20+15+5+10+10+2.5+5 = 80, ranked between D10 (100) and D8 (78.75)
      const ranked = (await score(1)).filter((r) => r.rank !== null).map((r) => [dogNo(r.dog_id), r.score]);
      expect(ranked).toEqual([
        [1, 100],
        [10, 100],
        [3, 80],
        [8, 78.75],
        [9, 78.75],
        [2, 0],
      ]);
    } finally {
      await rest("hard_constraints?key=eq.children_under_12", {
        method: "PATCH",
        body: JSON.stringify({ enabled: true }),
      });
    }
  });

  it("re-ranks when a weight changes", async () => {
    const [{ weight }] = await rest<[{ weight: number }]>("match_weights?category=eq.lifestyle&select=weight");
    await rest("match_weights?category=eq.lifestyle", { method: "PATCH", body: JSON.stringify({ weight: 0 }) });
    try {
      // Lifestyle off (Σw = 75): A3's D7 (62.5/75 = 83.33) overtakes D1 (53.75/75 = 71.67).
      const rows = await score(3);
      const d1 = rows.find((r) => dogNo(r.dog_id) === 1)!;
      const d7 = rows.find((r) => dogNo(r.dog_id) === 7)!;
      expect([d7.score, d1.score]).toEqual([83.33, 71.67]);
      expect(d7.rank!).toBeLessThan(d1.rank!);
      expect(d1.confidence).toBe(1);
    } finally {
      await rest("match_weights?category=eq.lifestyle", { method: "PATCH", body: JSON.stringify({ weight }) });
    }
  });
});

describe("results_for_token", () => {
  type Results = {
    adopter: Record<string, unknown>;
    total: number;
    excluded: Record<string, number>;
    matches: { rank: number; score: number; dog: Record<string, unknown> }[];
  } | null;
  const results = (token_hash: string, slug?: string) =>
    rest<Results>("rpc/results_for_token", {
      method: "POST",
      body: JSON.stringify({ p_token_hash: token_hash, ...(slug ? { p_slug: slug } : {}) }),
    });

  it("returns ranked card data and exclusion counts, never contact details", async () => {
    const r = (await results(hash(tokens[4]!)))!;
    const fixtures = r.matches.filter((m) => String(m.dog.slug).startsWith("fixture-match-"));
    expect(fixtures.map((m) => [m.dog.slug, m.score])).toEqual(
      EXPECTED[4]!.ranked.map(([n, s]) => [`fixture-match-${n}`, s]),
    );
    expect(r.excluded.alone_time).toBeGreaterThanOrEqual(4);
    expect(Object.keys(fixtures[0]!.dog).sort()).toEqual(
      [
        ...["age_months", "breed", "energy", "locality", "name", "photo", "sex", "size", "slug", "urgent"],
        ...["good_with_children", "good_with_dogs", "good_with_cats", "needs_large_space", "alone_max_hours"],
        ...["handling", "medical_needs"],
      ].sort(),
    );
    for (const key of ["name", "phone", "email", "age", "city"]) expect(r.adopter).not.toHaveProperty(key);
  });

  it("narrows to one dog by slug, and not to an excluded one", async () => {
    const one = (await results(hash(tokens[4]!), "fixture-match-3"))!;
    expect(one.matches.map((m) => [m.dog.slug, m.score])).toEqual([["fixture-match-3", 89.06]]);
    expect((await results(hash(tokens[4]!), "fixture-match-5"))!.matches).toEqual([]);
  });

  it("returns nothing for a wrong or expired token", async () => {
    expect(await results(hash(randomBytes(32).toString("base64url")))).toBeNull();
    await rest(`adopters?id=eq.${adopterId(5)}`, {
      method: "PATCH",
      body: JSON.stringify({ token_expires_at: new Date(Date.now() - 1000).toISOString() }),
    });
    expect(await results(hash(tokens[5]!))).toBeNull();
  });
});

describe("submit_questionnaire and submit_enquiry", () => {
  const rpc = <T>(fn: string, args: object) => rest<T>(`rpc/${fn}`, { method: "POST", body: JSON.stringify(args) });
  const answers = {
    ...ADOPTERS[1],
    name: "Fixture Quiz Adopter",
    age: 30,
    city: "Mumbai",
    phone: QUIZ_PHONE,
    email: null,
    pref_sizes: ["small", "small", "medium"],
    pref_breed: "any",
    adopt_reason: null,
    timeline: "asap",
  };

  it("stores answers under the token's hash for 90 days, and scores like the same answers do", async () => {
    const token = randomBytes(32).toString("base64url");
    const id = await rpc<string>("submit_questionnaire", { p: answers, p_token_hash: hash(token) });
    const [row] = await rest<{ pref_sizes: string[]; token_expires_at: string; results_token_hash: string }[]>(
      `adopters?id=eq.${id}&select=pref_sizes,token_expires_at,results_token_hash`,
    );
    expect(row!.pref_sizes).toEqual(["medium", "small"]); // duplicates dropped
    expect(row!.results_token_hash).toBe(hash(token));
    const days = (Date.parse(row!.token_expires_at) - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(89.9);
    expect(days).toBeLessThanOrEqual(90);
    const r = (await rest<{ matches: { dog: { slug: string }; score: number }[] }>("rpc/results_for_token", {
      method: "POST",
      body: JSON.stringify({ p_token_hash: hash(token) }),
    }))!;
    const fixtures = r.matches.filter((m) => m.dog.slug.startsWith("fixture-match-"));
    expect(fixtures.map((m) => [Number(m.dog.slug.split("-").at(-1)), m.score])).toEqual(
      EXPECTED[1]!.ranked.map(([n, score]) => [n, score]),
    );
  });

  it("rejects an adopter under 18 and an unknown option", async () => {
    const hash32 = hash(randomBytes(32).toString("base64url"));
    await expect(rpc("submit_questionnaire", { p: { ...answers, age: 17 }, p_token_hash: hash32 })).rejects.toThrow();
    await expect(
      rpc("submit_questionnaire", { p: { ...answers, home_type: "castle" }, p_token_hash: hash32 }),
    ).rejects.toThrow();
  });

  it("stores an enquiry with a score snapshot, once per phone per dog while it is open", async () => {
    const enquiry = {
      dog_slug: "fixture-match-1",
      name: "Fixture Enquirer",
      phone: QUIZ_PHONE,
      email: null,
      message: null,
    };
    const send = (p: object, token = tokens[1]!) => rpc<string>("submit_enquiry", { p, p_token_hash: hash(token) });
    expect(await send(enquiry)).toBe("sent");
    expect(await send(enquiry)).toBe("duplicate");

    const [row] = await rest<
      { id: string; score: number; confidence: number; category_scores: object; weights: Record<string, number> }[]
    >(`enquiries?adopter_id=eq.${adopterId(1)}&select=id,score,confidence,category_scores,weights`);
    expect([row!.score, row!.confidence]).toEqual([100, 1]); // A1 × D1, hand-computed above
    expect(Object.keys(row!.category_scores)).toHaveLength(8);
    expect(row!.weights).toMatchObject({ lifestyle: 25, living: 20, age: 5 });

    // A closed enquiry no longer blocks a new one.
    await rest(`enquiries?id=eq.${row!.id}`, { method: "PATCH", body: JSON.stringify({ status: "rejected" }) });
    expect(await send(enquiry)).toBe("sent");
  });

  it("refuses dogs that are excluded or not listed, and wrong or expired links", async () => {
    const base = { name: "Fixture Enquirer", phone: QUIZ_PHONE, email: null, message: null };
    const send = (slug: string, token: string) =>
      rpc<string>("submit_enquiry", { p: { ...base, dog_slug: slug }, p_token_hash: hash(token) });
    expect(await send("fixture-match-3", tokens[1]!)).toBe("unavailable"); // A1 has kids; D3 isn't safe with them
    expect(await send("no-such-dog", tokens[1]!)).toBe("unavailable");
    expect(await send("fixture-match-1", randomBytes(32).toString("base64url"))).toBe("expired");
    expect(await send("fixture-match-1", tokens[5]!)).toBe("expired"); // expired in the test above
  });
});
