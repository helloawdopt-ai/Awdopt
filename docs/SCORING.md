# How the matching score works

The score is rule-based and fully traceable: no machine learning and no AI-written text. It runs in the
database as one function, `score_dogs_for_adopter(adopter_id)`, defined in
`supabase/migrations/20261015100000_matching.sql`. **That file's header comment is the source of truth**; this
page explains it. Tests with hand-worked numbers: `tests/matching.test.ts`.

Every approved dog is checked against one adopter in two stages:

1. **Hard constraints** decide whether the dog can be shown at all.
2. **Weighted categories** give every remaining dog a score from 0 to 100, and the list is sorted by it.

## Stage 1: hard constraints

A dog that fails an **enabled** constraint is **left out** of that adopter's results (not shown with a low score).
The results page says how many dogs were left out and why. **A dog whose answer is unknown ("Not known yet") is
never left out.**

| Key | The dog is left out when… |
|---|---|
| `children_under_12` | the adopter has children under 12 **and** the dog is not good with children |
| `other_pets` | the adopter has a dog and the dog is not good with dogs, **or** has a cat and the dog is not good with cats |
| `large_space` | the dog needs a large space **and** the adopter lives in an apartment (with or without a balcony). An independent house or a house with a garden counts as large |
| `special_needs` | the dog has ongoing medical or special needs **and** the adopter said no to special needs |
| `alone_time` | the adopter's hours alone per day are more than the dog's longest time alone |

Each one can be switched off in the admin (Match weights → Hard constraints). All five start on.

## Stage 2: the score

Each of the 8 categories produces a fit `s` between 0 (poor) and 1 (great), or **nothing** when it can't be
compared because one side didn't answer. Then:

```
score      = 100 × Σ(weight × s)  /  Σ(weight)        over the categories that could be compared
confidence =       Σ(weight)      /  Σ(weight)        compared  ÷  all categories that apply
```

So a category nobody can compare is simply left out: it never adds points, and it never counts as a bad match
either. **Confidence** is the share of the total weight that could actually be compared. Below 70% the result
shows "Based on limited info".

### Category formulas

Many checks compare two positions on an ordered scale, for example energy low → medium → high. They use a **step**:
`s = 1 − 0.5 × gap`, so a gap of 0 gives 1, a gap of 1 gives 0.5, a gap of 2 gives 0. Where only a shortfall
matters, having *more* than needed scores 1.

When a category has several checks, its `s` is the average of the checks both sides answered.

| Category | Starting weight | Checks |
|---|---|---|
| **Lifestyle / activity** | 25 | Step between the adopter's activity (low/medium/high) and the dog's energy. If the adopter picked preferred energy levels: step to the closest one |
| **Living situation** | 20 | Home space: apartment 0, apartment with balcony 1, independent house or house with garden 2. Dog's need: 2 if it needs a large space, otherwise its size (small 0, medium 1, large 2); 0 if it doesn't need a large space and its size is unknown. Step on the shortfall (need − space) |
| **Time availability** | 15 | Alone time: 1 if the adopter's hours alone are within the dog's limit, otherwise 1 − (hours over ÷ 4), not below 0. Daily time: step on the shortfall between what the dog's energy needs (low: under 1 hr, medium: 1–2 hrs, high: 2–4 hrs) and the time the adopter has |
| **Children / other pets** | 10 | For each of children, dogs and cats the adopter has at home: 1 if the dog is good with them, 0 if not. If the adopter has none of them, this category **doesn't apply**: it leaves the score and the confidence total (shown as "Doesn't apply") |
| **Dog experience** | 10 | Step on the shortfall between the dog's handling (easy / needs some experience / experienced owners only) and the adopter's experience (first dog / some / very experienced) |
| **Size preference** | 10 | Step to the closest preferred size. No preference = can't be compared (shown as "No preference") |
| **Age preference** | 5 | Step to the closest preferred age band. Bands: puppy under 1 year, young 1–3, adult 3–8, senior 8+. No preference = can't be compared |
| **Special-needs fit** | 5 | If the dog has medical needs: 1 if the adopter is open to them, else 0. If the dog is a senior: 1 if open to seniors, else 0. 1 when the dog is known to have neither |

Breed preference and "who you live with" are stored and shown to the admin but not scored.

### Worked example

Adopter: high activity, alone 4 hrs a day, 2–4 hrs free daily, some experience, apartment with balcony, no
children or pets, prefers medium-sized young or adult dogs, preferred energy medium or high.
Dog: medium energy, medium size, 2 years old, can be alone 6 hrs, easy to handle, no medical needs, children/pets
answers unknown.

- Lifestyle: activity high vs energy medium → gap 1 → 0.5; preferred energy includes medium → 1. Average **0.75**.
- Living: space 1 (balcony), need 1 (medium) → no shortfall → **1**.
- Time: 4 ≤ 6 hrs → 1; medium energy needs 1–2 hrs, adopter has 2–4 → 1. Average **1**.
- Children / other pets: adopter has none → **doesn't apply**.
- Experience: easy vs some → no shortfall → **1**.
- Size: medium preferred → **1**. Age: young preferred → **1**. Special needs: none, not a senior → **1**.

Weights that apply: 25 + 20 + 15 + 10 + 10 + 5 + 5 = 90 (household's 10 doesn't apply).
Score = 100 × (25×0.75 + 20 + 15 + 10 + 10 + 5 + 5) / 90 = 100 × 83.75 / 90 = **93%**, confidence 90/90 = **100%**.

## Ranking and ties

Dogs that pass Stage 1 are sorted by score (highest first), then confidence, then the date they were listed
(earlier first), then id, so the order is always stable. Urgent dogs are flagged on their card but are **never
ranked higher**.

## Explanations

"Why this could work" lists up to 3 categories with `s ≥ 0.75`, best first. "Things to consider" lists up to 2 with
`s < 0.6`, worst first. Ties go to the higher weight, then the order in the table above. Categories with weight 0
never appear. The sentences come from a single map in `src/lib/explanations.ts` and are built only from the dog's
profile and the adopter's answers.

## How to retune

**Weights (no code change):** Admin → Match weights. Enter any non-negative numbers; only how they compare matters
(25 and 50 behaves exactly like 1 and 2). At least one must be above 0. The page shows each one's share of the
total.

**Hard constraints (no code change):** same page, tick or untick.

What changes when you save:
- Every results link and the admin's adopter pages use the new values on their next load (nothing is cached).
- Enquiries already sent keep the score, category scores and weights from the moment they were sent.

**Formulas (code change):** write a **new** migration that redefines the function with
`create or replace function public.score_dogs_for_adopter …` (copy it from the `matching` migration), update the
header comment, update the hand-worked fixtures in `tests/matching.test.ts` and this page, and run `npm test`.
Keep it one SQL call: with 500 dogs it runs in about 40 ms. Never edit a migration that is already applied to
production.

**Questionnaire wording:** `src/lib/questionnaire.ts` holds every question and option label. Changing the
wording needs no database change; adding or removing an option does (it is an enum value in the database).
