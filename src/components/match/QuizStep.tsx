"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Lock } from "lucide-react";
import { lazy, Suspense } from "react";
import { Button, IconButton } from "@/components/ui/Button";
import { ChipGroup } from "@/components/ui/Chip";
import { OptionGrid, SegmentedControl } from "@/components/ui/Choice";
import { Checkbox, FieldError, Input, Textarea } from "@/components/ui/Field";
import { Progress } from "@/components/ui/Progress";
import { ErrorState } from "@/components/ui/States";
import { StickyBar } from "@/components/ui/StickyBar";
import { TrustPanel } from "@/components/ui/Trust";
import type { Answers } from "@/lib/match-schema";
import {
  ACTIVITY,
  DAILY_TIME,
  EXPERIENCE,
  HOME_TYPES,
  HOUSEHOLDS,
  PREF_AGES,
  PREF_BREED,
  PREF_ENERGY,
  PREF_SIZES,
  QUESTIONS as Q,
  STEPS,
  TIMELINE,
  yesNo,
} from "@/lib/questionnaire";
import { Matching } from "./Matching";
import { useQuiz } from "./QuizProvider";

// Only the last step needs Turnstile; the placeholder keeps its height so nothing shifts.
const Turnstile = lazy(() => import("@/components/Turnstile").then((m) => ({ default: m.Turnstile })));

type Key = keyof Answers;

function Fields({ slug }: { slug: string }) {
  const { form, setToken, turnstileKey } = useQuiz();
  const { register, formState } = form;
  const err = (name: Key) => formState.errors[name]?.message;
  const current = (name: Key) => form.getValues(name) as string;
  const cards = (name: Key, options: { value: string; label: string }[]) => (
    <div className="flex flex-col gap-1">
      <OptionGrid
        legend={Q[name as keyof typeof Q]}
        name={name}
        options={options}
        defaultValue={current(name)}
        inputProps={register(name)}
      />
      <FieldError id={`${name}-error`} error={err(name)} />
    </div>
  );
  const yn = (name: Key) => (
    <div className="flex flex-col gap-1">
      <SegmentedControl
        legend={Q[name as keyof typeof Q]}
        name={name}
        options={yesNo}
        defaultValue={current(name)}
        inputProps={register(name)}
      />
      <FieldError id={`${name}-error`} error={err(name)} />
    </div>
  );
  const chips = (name: Key, options: { value: string; label: string }[], type: "checkbox" | "radio" = "checkbox") => (
    <ChipGroup
      legend={Q[name as keyof typeof Q]}
      name={name}
      type={type}
      options={options}
      defaultValue={form.getValues(name) as string | string[]}
      inputProps={register(name)}
    />
  );

  switch (slug) {
    case "basic":
      return (
        <>
          <TrustPanel>
            Only the AWDOPT team sees your name and number. They never appear on your results page or a dog&rsquo;s
            page.
          </TrustPanel>
          <Input
            label={Q.name}
            id="name"
            autoComplete="name"
            maxLength={80}
            error={err("name")}
            {...register("name")}
          />
          <Input
            label={Q.age}
            id="age"
            inputMode="numeric"
            autoComplete="off"
            maxLength={3}
            hint={Q.ageHint}
            error={err("age")}
            {...register("age")}
          />
          <Input
            label={Q.city}
            id="city"
            autoComplete="address-level2"
            maxLength={40}
            error={err("city")}
            {...register("city")}
          />
          <Input
            label={Q.phone}
            id="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            maxLength={20}
            error={err("phone")}
            {...register("phone")}
          />
          <Input
            label={Q.email}
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            optional
            maxLength={254}
            error={err("email")}
            {...register("email")}
          />
        </>
      );
    case "home":
      return (
        <>
          {cards("home_type", HOME_TYPES)}
          {cards("household", HOUSEHOLDS)}
          {yn("has_children_under_12")}
          {yn("has_dogs")}
          {yn("has_cats")}
        </>
      );
    case "lifestyle":
      return (
        <>
          {cards("activity_level", ACTIVITY)}
          <Input
            label={Q.hours_alone}
            id="hours_alone"
            inputMode="numeric"
            autoComplete="off"
            maxLength={2}
            hint={Q.hoursHint}
            error={err("hours_alone")}
            {...register("hours_alone")}
          />
          {cards("daily_time", DAILY_TIME)}
          {cards("experience", EXPERIENCE)}
        </>
      );
    case "preferences":
      return (
        <>
          {chips("pref_sizes", PREF_SIZES)}
          {chips("pref_ages", PREF_AGES)}
          {chips("pref_energy", PREF_ENERGY)}
          {chips("pref_breed", PREF_BREED, "radio")}
          {yn("open_to_special_needs")}
          {yn("open_to_senior")}
        </>
      );
    default:
      return (
        <>
          <Textarea
            label={Q.adopt_reason}
            id="adopt_reason"
            optional
            maxLength={500}
            error={err("adopt_reason")}
            {...register("adopt_reason")}
          />
          {cards("timeline", TIMELINE)}
          <TrustPanel>
            Your answers are used to score dogs for you. Your contact details are only for the AWDOPT team, to help if
            you say you&rsquo;re interested in a dog. Ask us anytime and we&rsquo;ll delete them.
          </TrustPanel>
          <div className="flex flex-col gap-1">
            <Checkbox
              id="consent"
              aria-describedby={err("consent") ? "consent-error" : undefined}
              {...register("consent")}
            >
              I agree to AWDOPT storing my answers and contact details to match me with dogs. See our{" "}
              <Link href="/privacy">privacy notice</Link>.
            </Checkbox>
            <FieldError id="consent-error" error={err("consent")} />
          </div>
          <Suspense fallback={<div className="min-h-[65px]" />}>
            <Turnstile onToken={setToken} resetKey={turnstileKey} />
          </Suspense>
        </>
      );
  }
}

/** One section of the adopter questionnaire, as in Quiz.dc.html. `total` = dogs on the matching screen. */
export function QuizStep({ slug, total = null }: { slug: string; total?: number | null }) {
  const router = useRouter();
  const { checkStep, submit, status, error, restored } = useQuiz();
  const i = STEPS.findIndex((s) => s.slug === slug);
  const step = STEPS[i]!;
  const next = STEPS[i + 1];

  if (status === "matching") return <Matching total={total} />;

  return (
    <>
      <div className="mx-auto flex max-w-[560px] flex-col gap-4 px-4 pt-3 pb-8">
        <header className="flex h-14 items-center gap-3">
          <IconButton
            href={i === 0 ? "/" : `/match/${STEPS[i - 1]!.slug}`}
            label={i === 0 ? "Back to home" : "Previous step"}
          >
            <ChevronLeft size={20} strokeWidth={2.4} aria-hidden="true" />
          </IconButton>
          <Progress current={i + 1} section={step.title} />
        </header>
        <main className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <h1 className="font-display text-[26px] leading-[1.1] font-extrabold tracking-[-0.035em]">{step.title}</h1>
            {"intro" in step && <p className="text-base text-muted">{step.intro}</p>}
          </div>
          <form key={restored} noValidate onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-5">
            <Fields slug={slug} />
          </form>
          {error && !next && <ErrorState>{error}</ErrorState>}
        </main>
      </div>
      <StickyBar className="flex-col">
        <p className="flex items-center gap-2 text-xs text-muted">
          <Lock size={14} strokeWidth={2.25} className="text-ink" aria-hidden="true" />
          Answers stay on this device until you finish.
        </p>
        {next ? (
          <Button onClick={async () => (await checkStep(slug)) && router.push(`/match/${next.slug}`)}>
            Next: {next.title}
          </Button>
        ) : (
          <Button onClick={submit}>{Q.submit}</Button>
        )}
      </StickyBar>
    </>
  );
}
