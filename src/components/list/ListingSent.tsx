"use client";

import { Lock } from "lucide-react";
import { DogPhoto } from "@/components/dog/DogPhoto";
import { ButtonLink } from "@/components/ui/Button";
import { useListing } from "./ListingProvider";

/** ListSent.dc.html: success sticker (decorative tilt allowed), then calm copy. */
export function ListingSent() {
  const { submitted } = useListing();
  const name = submitted?.name;

  return (
    <main className="flex min-h-dvh flex-col bg-fresh px-4 pt-16 pb-6">
      <div className="mx-auto flex w-full max-w-[560px] grow flex-col gap-5">
        <div
          aria-hidden="true"
          className="relative flex w-[230px] -rotate-5 flex-col gap-2.5 self-center rounded-[16px] border-[2.5px] border-ink bg-surface p-2.5 pb-3.5 shadow-sticker-6"
        >
          <DogPhoto
            name={name ?? "the dog"}
            tint={1}
            photo={submitted?.preview ? { src: submitted.preview, width: 480, height: 360, alt: "" } : null}
            className="h-[190px] rounded-[10px]"
          />
          <p className="font-display text-lg font-extrabold">{name ?? "Your dog"}</p>
          <span className="absolute top-[18px] -right-[18px] rotate-12 rounded-full border-[2.5px] border-ink bg-highlight px-3 py-1.5 font-display text-[13px] font-bold">
            in review
          </span>
        </div>

        <div className="flex flex-col gap-2">
          <h1 className="font-display text-[26px] leading-[1.1] font-extrabold tracking-[-0.035em]">
            Thanks! {name ? `${name}’s` : "The"} listing is with our team.
          </h1>
          <p className="text-base leading-normal">
            Every listing is checked by a real person before it goes live. Our team will message you on WhatsApp once
            it&rsquo;s approved, or if we need anything else.
          </p>
        </div>

        <p className="flex items-start gap-2.5 rounded-[20px] border-[2.5px] border-ink bg-surface px-3.5 py-3 text-sm leading-[1.45]">
          <Lock size={18} strokeWidth={2.25} aria-hidden="true" className="mt-px shrink-0" />
          Your phone number is never shown on {name ? `${name}’s` : "the dog’s"} page. Interested adopters reach you
          through AWDOPT.
        </p>

        <div className="mt-auto flex flex-col gap-2.5">
          <ButtonLink href="/">Back home</ButtonLink>
          <ButtonLink href="/list/you" variant="secondary">
            List another dog
          </ButtonLink>
        </div>
      </div>
    </main>
  );
}
