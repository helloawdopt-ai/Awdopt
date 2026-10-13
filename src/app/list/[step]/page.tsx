import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ListingStep } from "@/components/list/ListingStep";
import { STEPS } from "@/lib/listing";

type Props = { params: Promise<{ step: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { step } = await params;
  // Only the first step is a landing page worth indexing.
  return {
    title: "List a Dog",
    description: "List a dog for adoption in Mumbai for free. Every listing is checked by the AWDOPT team.",
    robots: step === "you" ? undefined : { index: false },
  };
}

export default async function Page({ params }: Props) {
  const { step } = await params;
  if (!STEPS.some((s) => s.slug === step)) notFound();
  return <ListingStep slug={step} />;
}
