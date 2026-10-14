import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { QuizStep } from "@/components/match/QuizStep";
import { parseFilters } from "@/lib/dog-format";
import { STEPS } from "@/lib/questionnaire";
import { listDogs } from "@/lib/server/dogs";

type Props = { params: Promise<{ step: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { step } = await params;
  // Only the first step is a landing page worth indexing.
  return {
    title: "Get my match scores",
    description: "Answer a few questions about your home and days, and AWDOPT scores every dog for you.",
    robots: step === "basic" ? undefined : { index: false },
  };
}

export default async function Page({ params }: Props) {
  const { step } = await params;
  if (!STEPS.some((s) => s.slug === step)) notFound();
  // "Scoring N dogs" on the matching screen; cached with the dog list.
  const total =
    step === "intent"
      ? await listDogs(parseFilters({}), null).then(
          (r) => r.total ?? null,
          () => null,
        )
      : null;
  return <QuizStep slug={step} total={total} />;
}
