"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { lazy, Suspense, useEffect, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { submitEnquiry } from "@/app/r/[token]/[dogSlug]/interested/actions";
import { Heart, Sparkle } from "@/components/brand/Glyphs";
import { DogPhoto, type Photo } from "@/components/dog/DogPhoto";
import { Button, ButtonLink, IconButton } from "@/components/ui/Button";
import { Checkbox, FieldError, Input, Textarea } from "@/components/ui/Field";
import { PrivateLinkCard } from "@/components/ui/PrivateLinkCard";
import { ErrorState } from "@/components/ui/States";
import { StickyBar } from "@/components/ui/StickyBar";
import { TimelineSteps } from "@/components/ui/TimelineSteps";
import { TrustPanel } from "@/components/ui/Trust";
import type { Enquiry } from "@/lib/enquiry-schema";
import { CONTACT_KEY } from "@/lib/questionnaire";

// zod and the schema load on the first validation, not with the page.
const resolver: Resolver<Enquiry> = async (...args) => {
  const [{ zodResolver }, { enquirySchema }] = await Promise.all([
    import("@hookform/resolvers/zod"),
    import("@/lib/enquiry-schema"),
  ]);
  return zodResolver(enquirySchema)(...args);
};
const EMPTY_ENQUIRY = { name: "", phone: "", email: "", message: "", consent: false };
const Turnstile = lazy(() => import("@/components/Turnstile").then((m) => ({ default: m.Turnstile })));

type Props = {
  token: string;
  slug: string;
  dog: { name: string; meta: string; photo: Photo | null };
  score: number;
  /** The private results link, shown again on the sent screen. */
  link: string;
};

/** "I'm Interested" (Interested.dc.html), then its confirmation (Sent.dc.html). Calm zone until sent. */
export function EnquiryForm({ token, slug, dog, score, link }: Props) {
  const form = useForm<Enquiry>({ resolver, defaultValues: EMPTY_ENQUIRY as Enquiry, mode: "onTouched" });
  const { register, formState } = form;
  const err = (name: keyof Enquiry) => formState.errors[name]?.message;
  const [prefilled, setPrefilled] = useState(false);
  const [captcha, setCaptcha] = useState<string | null>(null);
  const [turnstileKey, setTurnstileKey] = useState(0);
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string>();
  const back = `/r/${token}/${slug}`;

  // Name, phone and email from this tab's questionnaire, if it was filled in here. Never from the
  // server: anyone holding the link would see them.
  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(CONTACT_KEY) ?? "null");
      if (saved && typeof saved === "object") {
        form.reset({ ...EMPTY_ENQUIRY, ...saved, message: "", consent: false } as Enquiry);
        // One-time sync from sessionStorage after hydration (the server can't read it).
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setPrefilled(true);
      }
    } catch {}
  }, [form]);

  const submit = form.handleSubmit(async (values) => {
    if (!captcha) {
      setError("Please complete the check above the button.");
      return;
    }
    setError(undefined);
    setStatus("sending");
    const res = await submitEnquiry(token, slug, values, captcha).catch(() => null);
    setTurnstileKey((k) => k + 1); // tokens are single use
    if (res?.ok) {
      setStatus("sent");
      window.scrollTo(0, 0);
      return;
    }
    setStatus("idle");
    setError(res?.error ?? "Something went wrong sending your interest. Please try again.");
    if (res?.field) form.setError(res.field, { message: "Check the phone number" });
  });

  if (status === "sent") return <Sent name={dog.name} token={token} link={link} />;

  return (
    <>
      <div className="mx-auto flex max-w-[560px] flex-col gap-3.5 px-4 pt-3 pb-8">
        <header className="flex h-14 items-center gap-3">
          <IconButton href={back} label={`Back to you and ${dog.name}`}>
            <ChevronLeft size={20} strokeWidth={2.4} aria-hidden="true" />
          </IconButton>
          <h1 className="text-[17px] font-extrabold">Say hi to {dog.name}</h1>
        </header>
        <main className="flex flex-col gap-3.5">
          <div className="flex items-center gap-3 rounded-[20px] border-[2.5px] border-ink bg-surface p-2.5">
            <DogPhoto
              photo={dog.photo}
              name={dog.name}
              className="size-14 shrink-0 rounded-[14px] border-2 border-ink [&_span]:hidden"
            />
            <div className="flex min-w-0 grow flex-col gap-0.5">
              <strong className="truncate font-display text-[17px]">{dog.name}</strong>
              <span className="text-[13px] text-muted">{dog.meta}</span>
            </div>
            <span className="rounded-full border-2 border-ink bg-bubble px-2.5 py-1 font-display text-[15px] font-extrabold tabular">
              {score}%<span className="sr-only"> match</span>
            </span>
          </div>
          {prefilled && (
            <p className="text-sm text-muted">We filled this in from your answers. Check it&rsquo;s right.</p>
          )}
          <form noValidate onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-3.5">
            <Input
              label="Your name"
              id="name"
              autoComplete="name"
              maxLength={80}
              error={err("name")}
              {...register("name")}
            />
            <Input
              label="Phone / WhatsApp"
              id="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              maxLength={20}
              error={err("phone")}
              {...register("phone")}
            />
            <Input
              label="Email"
              id="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              optional
              maxLength={254}
              error={err("email")}
              {...register("email")}
            />
            <Textarea
              label="Message"
              id="message"
              optional
              maxLength={1000}
              placeholder="Anything you'd like the team to know?"
              error={err("message")}
              {...register("message")}
            />
            <TrustPanel>
              Only the AWDOPT team can see them, to arrange a meeting with {dog.name}&rsquo;s people. They are never
              shown publicly or sold. Ask us anytime and we&rsquo;ll delete them.
            </TrustPanel>
            <div className="flex flex-col gap-1">
              <Checkbox
                id="consent"
                aria-describedby={err("consent") ? "consent-error" : undefined}
                {...register("consent")}
              >
                I agree to AWDOPT using these details to contact me about {dog.name}. See our{" "}
                <Link href="/privacy">privacy notice</Link>.
              </Checkbox>
              <FieldError id="consent-error" error={err("consent")} />
            </div>
            <Suspense fallback={<div className="min-h-[65px]" />}>
              <Turnstile onToken={setCaptcha} resetKey={turnstileKey} />
            </Suspense>
          </form>
          {error && <ErrorState>{error}</ErrorState>}
        </main>
      </div>
      <StickyBar>
        <Button className="grow" onClick={submit} disabled={status === "sending"}>
          {status === "sending" ? "Sending…" : "Send my interest"}
        </Button>
      </StickyBar>
    </>
  );
}

function Sent({ name, token, link }: { name: string; token: string; link: string }) {
  return (
    <main className="relative min-h-dvh overflow-hidden bg-highlight px-4 pt-14 pb-6">
      <div className="relative mx-auto flex max-w-[560px] flex-col gap-[18px]">
        <Sparkle size={40} className="absolute -top-6 right-4 fill-bubble" />
        <h1 className="flex -rotate-4 items-center gap-2.5 self-start rounded-[26px] border-[2.5px] border-ink bg-bubble px-5 py-3.5 font-display text-[26px] font-extrabold tracking-[-0.03em] shadow-sticker-lg">
          <Heart size={24} />
          interest sent!
        </h1>
        <p className="text-[17px] leading-normal font-semibold" role="status">
          {name}&rsquo;s people will hear about you soon. Here&rsquo;s what happens next.
        </p>
        <div className="rounded-[24px] border-[2.5px] border-ink bg-surface p-4 shadow-sticker-lg">
          <TimelineSteps
            steps={[
              { lead: "The AWDOPT team calls or WhatsApps you", text: "to say hi and answer questions." },
              { lead: `You meet ${name}`, text: "with the people caring for them now." },
              { lead: "If it clicks,", text: "we help with the adoption and check in after." },
            ]}
          />
        </div>
        <PrivateLinkCard url={link} />
        <div className="flex flex-col gap-2.5">
          <ButtonLink href={`/r/${token}`}>Back to my matches</ButtonLink>
          <ButtonLink href="/dogs" variant="secondary">
            Browse more dogs
          </ButtonLink>
        </div>
      </div>
    </main>
  );
}
