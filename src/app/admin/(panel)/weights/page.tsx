import type { Metadata } from "next";
import { saveWeights } from "@/app/admin/weights-actions";
import { adminButton, adminSelect } from "@/components/ui/AdminTable";
import { ErrorState } from "@/components/ui/States";
import { CATEGORIES } from "@/lib/explanations";
import { requireAdmin } from "@/lib/server/auth";

export const metadata: Metadata = { title: "Match weights", robots: { index: false } };

// What each category compares (scope §3); the formulas are in docs/SCORING.md.
const COMPARES: Record<string, string> = {
  lifestyle: "How active they are vs the dog's energy",
  living: "Their home vs the dog's size and space needs",
  time: "Hours alone and daily time vs the dog's limit and energy",
  household: "Children, dogs and cats at home vs who the dog is good with",
  experience: "Their dog experience vs how easy the dog is to handle",
  size: "Sizes they'd like vs the dog's size",
  age: "Ages they'd like vs the dog's age",
  special_needs: "Open to special needs or a senior vs the dog's needs and age",
};

const MESSAGES = {
  saved: "Saved. Every results link and the adopter pages use these now.",
  zero: "At least one weight must be above 0. Nothing was saved.",
  invalid: "Weights must be numbers from 0 to 999. Nothing was saved.",
  failed: "Something went wrong. Please check the values below and try again.",
};

export default async function Page({ searchParams }: { searchParams: Promise<{ done?: string; error?: string }> }) {
  const { supabase } = await requireAdmin();
  const [{ done, error: notice }, weights, constraints] = await Promise.all([
    searchParams,
    supabase.from("match_weights").select("category, weight"),
    supabase.from("hard_constraints").select("key, description, enabled").order("key"),
  ]);
  if (weights.error || constraints.error)
    return <ErrorState>We couldn&rsquo;t load the weights. Refresh the page to try again.</ErrorState>;

  const weight = new Map(weights.data.map((w) => [w.category, w.weight]));
  const total = weights.data.reduce((sum, w) => sum + w.weight, 0);
  const key = notice ?? done;

  return (
    <>
      <h1 className="font-display text-[26px] font-extrabold tracking-[-0.03em]">Match weights</h1>
      <p className="max-w-[70ch] text-sm text-muted">
        Each category&rsquo;s weight is its share of the score. Any numbers work: only how they compare matters (25 and
        50 is the same as 1 and 2). Changes apply at once to every results link. Enquiries keep the score and weights
        from when they were sent.
      </p>
      {key && key in MESSAGES && (
        <p
          role={notice ? "alert" : "status"}
          className={`rounded-[16px] border-2 border-ink px-3.5 py-2.5 text-sm font-bold ${notice ? "bg-surface" : "bg-fresh"}`}
        >
          {MESSAGES[key as keyof typeof MESSAGES]}
        </p>
      )}

      <form action={saveWeights} className="flex max-w-[760px] flex-col gap-5">
        <fieldset className="flex flex-col gap-3 rounded-[16px] border-2 border-ink bg-surface p-4">
          <legend className="px-1 text-[17px] font-extrabold">Weights</legend>
          {CATEGORIES.map(({ key, label }) => {
            const w = weight.get(key) ?? 0;
            return (
              <div key={key} className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1">
                <label htmlFor={`w-${key}`} className="text-sm">
                  <span className="block font-extrabold">{label}</span>
                  <span className="block text-muted">{COMPARES[key]}</span>
                </label>
                <span className="flex items-center gap-3">
                  <input
                    id={`w-${key}`}
                    name={key}
                    type="number"
                    inputMode="decimal"
                    required
                    min={0}
                    max={999}
                    step="any"
                    defaultValue={w}
                    className={`${adminSelect} w-24 text-right tabular-nums`}
                  />
                  <span className="w-12 text-right text-sm text-muted tabular-nums">
                    {total > 0 ? Math.round((w / total) * 100) : 0}%
                  </span>
                </span>
              </div>
            );
          })}
        </fieldset>

        <fieldset className="flex flex-col gap-2 rounded-[16px] border-2 border-ink bg-surface p-4">
          <legend className="px-1 text-[17px] font-extrabold">Hard constraints</legend>
          <p className="text-sm text-muted">
            When one is on, a dog that fails it is left out of the adopter&rsquo;s results instead of scoring low. A dog
            whose answer is &ldquo;Not known yet&rdquo; is never left out.
          </p>
          {constraints.data.map((c) => (
            <label key={c.key} className="flex min-h-11 items-center gap-3 text-sm">
              <input
                type="checkbox"
                name="constraint"
                value={c.key}
                defaultChecked={c.enabled}
                className="size-6 shrink-0 accent-primary"
              />
              {c.description}
            </label>
          ))}
        </fieldset>

        <button type="submit" className={`${adminButton.replace("bg-surface", "bg-fresh font-extrabold")} self-start`}>
          Save weights and constraints
        </button>
      </form>
    </>
  );
}
