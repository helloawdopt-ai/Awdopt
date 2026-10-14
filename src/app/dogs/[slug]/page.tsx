import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DogProfile } from "@/components/dog/Profile";
import { ButtonLink } from "@/components/ui/Button";
import { dogMeta } from "@/lib/dog-format";
import { getDog, isSlug } from "@/lib/server/dogs";

type Props = { params: Promise<{ slug: string }> };

async function load(params: Props["params"]) {
  const { slug } = await params;
  return isSlug(slug) ? getDog(slug) : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const dog = await load(params);
  if (!dog) return { title: "Dog not found", robots: { index: false } };
  return {
    title: dog.name,
    description: `${[dogMeta(dog), dog.locality].filter(Boolean).join(" · ")}. Looking for a home.`,
  };
}

export default async function Page({ params }: Props) {
  const dog = await load(params);
  if (!dog) notFound();
  return (
    <DogProfile
      dog={dog}
      back={{ href: "/dogs", label: "Back to dogs" }}
      cta={
        <ButtonLink href="/match/basic" className="grow">
          See if we match
        </ButtonLink>
      }
    />
  );
}
