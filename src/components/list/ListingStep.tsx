"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { lazy, Suspense, type ReactNode } from "react";
import { Button, IconButton } from "@/components/ui/Button";
import { OptionGrid, SegmentedControl } from "@/components/ui/Choice";
import { Checkbox, FieldError, Input, Select, Textarea } from "@/components/ui/Field";
import { PhotoUploader } from "@/components/ui/PhotoUploader";
import { Progress } from "@/components/ui/Progress";
import { ErrorState } from "@/components/ui/States";
import { StickyBar } from "@/components/ui/StickyBar";
import { TrustPanel } from "@/components/ui/Trust";
import { BREEDS, REGIONS } from "@/lib/dog-format";
import { STEPS, type ListingValues } from "@/lib/listing";
import { useListing } from "./ListingProvider";

// Only the last step needs Turnstile; the placeholder keeps its height so nothing shifts.
const Turnstile = lazy(() => import("@/components/Turnstile").then((m) => ({ default: m.Turnstile })));

const NOT_SURE = { value: "", label: "Not sure" };
const yesNo = [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }, NOT_SURE];

const HEADINGS: Record<string, string> = {
  you: "First, about you",
  dog: "Tell us about the dog",
  health: "Health & story",
  home: "Home & routine",
  details: "Last details",
};

function Fields({ slug }: { slug: string }) {
  const { form, photos, photoError, photosBusy, addPhotos, removePhoto, setToken, turnstileKey } = useListing();
  const { register, formState } = form;
  const err = (name: keyof ListingValues) => formState.errors[name]?.message;
  const seg = (name: keyof ListingValues, legend: string, options: { value: string; label: string }[]) => (
    <SegmentedControl
      legend={legend}
      name={name}
      options={options}
      defaultValue={form.getValues(name) as string}
      inputProps={register(name)}
    />
  );

  switch (slug) {
    case "you":
      return (
        <>
          <TrustPanel>
            Only the AWDOPT team sees your name and number. They are never shown on the dog&rsquo;s page.
          </TrustPanel>
          <Input
            label="Your name"
            id="lister_name"
            autoComplete="name"
            maxLength={80}
            error={err("lister_name")}
            {...register("lister_name")}
          />
          <Input
            label="Phone / WhatsApp"
            id="lister_phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            maxLength={20}
            hint="We'll message you here about the listing."
            error={err("lister_phone")}
            {...register("lister_phone")}
          />
          <Input
            label="Email"
            id="lister_email"
            type="email"
            inputMode="email"
            autoComplete="email"
            optional
            maxLength={254}
            error={err("lister_email")}
            {...register("lister_email")}
          />
          <div className="flex flex-col gap-1">
            <OptionGrid
              legend="Your relationship to the dog"
              name="relationship"
              defaultValue={form.getValues("relationship")}
              inputProps={register("relationship")}
              options={[
                { value: "owner", label: "Owner", hint: "It's my dog" },
                { value: "rescuer", label: "Rescuer", hint: "I rescued this dog" },
                { value: "foster", label: "Foster", hint: "I'm fostering" },
                { value: "shelter_ngo", label: "Shelter / NGO", hint: "We care for the dog" },
                { value: "helper", label: "Helping out", hint: "Helping a dog find a home" },
              ]}
            />
            <FieldError id="relationship-error" error={err("relationship")} />
          </div>
        </>
      );
    case "dog":
      return (
        <>
          <PhotoUploader
            previews={photos.map((p) => p.preview)}
            onAdd={addPhotos}
            onRemove={removePhoto}
            busy={photosBusy}
            error={photoError}
          />
          <Input
            label="Dog's name"
            id="name"
            autoComplete="off"
            maxLength={40}
            error={err("name")}
            {...register("name")}
          />
          {seg("sex", "Sex", [{ value: "female", label: "Female" }, { value: "male", label: "Male" }, NOT_SURE])}
          {seg("size", "Size", [
            { value: "small", label: "Small" },
            { value: "medium", label: "Medium" },
            { value: "large", label: "Large" },
            NOT_SURE,
          ])}
          {seg("energy", "Energy", [
            { value: "low", label: "Chill" },
            { value: "medium", label: "Balanced" },
            { value: "high", label: "Zoomies" },
            NOT_SURE,
          ])}
          {seg("good_with_children", "Good with kids?", yesNo)}
          {seg("good_with_dogs", "Good with other dogs?", yesNo)}
          {seg("good_with_cats", "Good with cats?", yesNo)}
          <Input
            label="Video link"
            id="video_url"
            type="url"
            inputMode="url"
            placeholder="https://"
            optional
            hint="A YouTube or Google Drive link."
            maxLength={300}
            error={err("video_url")}
            {...register("video_url")}
          />
        </>
      );
    case "health":
      return (
        <>
          {seg("medical_needs", "Ongoing medical or special needs?", yesNo)}
          <Textarea
            label="Health notes"
            id="medical_notes"
            optional
            maxLength={500}
            hint="Medication, conditions, recent vet visits."
            error={err("medical_notes")}
            {...register("medical_notes")}
          />
          {seg("vaccination", "Vaccination", [
            { value: "full", label: "Full" },
            { value: "partial", label: "Partly" },
            { value: "none", label: "None" },
            NOT_SURE,
          ])}
          {seg("sterilised", "Sterilised?", yesNo)}
          <Textarea
            label="Temperament"
            id="temperament"
            optional
            maxLength={300}
            hint="A few words: shy, playful, calm with strangers…"
            error={err("temperament")}
            {...register("temperament")}
          />
          <Textarea
            label="The dog's story"
            id="story"
            optional
            rows={5}
            maxLength={2000}
            error={err("story")}
            {...register("story")}
          />
        </>
      );
    case "home":
      return (
        <>
          <fieldset className="flex flex-col gap-1.5">
            <legend className="mb-1.5 text-sm font-extrabold">
              Age <span className="font-medium text-muted">(optional)</span>
            </legend>
            <div className="grid grid-cols-2 gap-2.5">
              <Input
                label="Years"
                id="age_years"
                inputMode="numeric"
                maxLength={2}
                error={err("age_years")}
                {...register("age_years")}
              />
              <Input
                label="Months"
                id="age_months"
                inputMode="numeric"
                maxLength={2}
                error={err("age_months")}
                {...register("age_months")}
              />
            </div>
          </fieldset>
          <Select label="Breed / type" id="breed" optional error={err("breed")} {...register("breed")}>
            <option value="">Not sure</option>
            {BREEDS.map((b) => (
              <option key={b}>{b}</option>
            ))}
          </Select>
          <Select
            label="Area"
            id="locality"
            hint="The area only, never your address."
            error={err("locality")}
            {...register("locality")}
          >
            <option value="">Choose the area</option>
            {Object.values(REGIONS).map((r) => (
              <optgroup key={r.label} label={r.label}>
                {r.areas.map((a) => (
                  <option key={a}>{a}</option>
                ))}
              </optgroup>
            ))}
          </Select>
          {seg("needs_large_space", "Needs a large space?", yesNo)}
          <Input
            label="Longest time it can be left alone (hours)"
            id="alone_max_hours"
            inputMode="numeric"
            maxLength={2}
            optional
            hint="0 to 12."
            error={err("alone_max_hours")}
            {...register("alone_max_hours")}
          />
          <OptionGrid
            legend="Handling"
            name="handling"
            defaultValue={form.getValues("handling")}
            inputProps={register("handling")}
            options={[
              { value: "easy", label: "Easy", hint: "Fine for a first-time adopter" },
              { value: "moderate", label: "Some experience", hint: "Needs a little know-how" },
              { value: "experienced_only", label: "Experienced only", hint: "Needs an experienced owner" },
              { value: "", label: "Not sure", hint: "We'll ask you later" },
            ]}
          />
          <Textarea
            label="Why does the dog need a new home?"
            id="rehoming_reason"
            optional
            maxLength={500}
            error={err("rehoming_reason")}
            {...register("rehoming_reason")}
          />
        </>
      );
    default:
      return (
        <>
          <Textarea
            label="Anything else adopters should know?"
            id="other_info"
            optional
            maxLength={1000}
            error={err("other_info")}
            {...register("other_info")}
          />
          <Checkbox id="urgent" {...register("urgent")}>
            This dog needs a home urgently.{" "}
            <span className="text-muted">Shown as a badge; it doesn&rsquo;t move the dog up the list.</span>
          </Checkbox>
          <TrustPanel>
            A real person on the AWDOPT team checks every listing before it goes live. Your contact details are never
            shown publicly.
          </TrustPanel>
          <div className="flex flex-col gap-1">
            <Checkbox
              id="consent"
              aria-describedby={err("consent") ? "consent-error" : undefined}
              {...register("consent")}
            >
              I can rehome this dog, and I agree to AWDOPT storing these details to review and publish the listing. See
              our <Link href="/privacy">privacy notice</Link>.
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

/** One step of the 5-step listing form, as in ListDog.dc.html. */
export function ListingStep({ slug }: { slug: string }) {
  const router = useRouter();
  const { checkStep, submit, status, error, progress, failedUploads, retryUploads } = useListing();
  const i = STEPS.findIndex((s) => s.slug === slug);
  const step = STEPS[i]!;
  const next = STEPS[i + 1];
  const busy = status !== "idle";

  let action: ReactNode;
  if (next) {
    action = (
      <Button className="grow" onClick={async () => (await checkStep(slug)) && router.push(`/list/${next.slug}`)}>
        Next: {next.title}
      </Button>
    );
  } else if (failedUploads) {
    action = (
      <Button className="grow" onClick={retryUploads} disabled={busy}>
        {busy ? progress : "Try the upload again"}
      </Button>
    );
  } else {
    action = (
      <Button className="grow" onClick={submit} disabled={busy}>
        {status === "sending" ? "Sending…" : status === "uploading" ? progress : "Send for review"}
      </Button>
    );
  }

  return (
    <>
      <div className="mx-auto flex max-w-[560px] flex-col gap-4 px-4 pt-3 pb-8">
        <header className="flex h-14 items-center gap-3">
          <IconButton
            href={i === 0 ? "/" : `/list/${STEPS[i - 1]!.slug}`}
            label={i === 0 ? "Back to home" : "Previous step"}
          >
            <ChevronLeft size={20} strokeWidth={2.4} aria-hidden="true" />
          </IconButton>
          <Progress current={i + 1} section={step.title} prefix="List a Dog" />
        </header>
        <main className="flex flex-col gap-5">
          <h1 className="font-display text-[26px] leading-[1.1] font-extrabold tracking-[-0.035em]">
            {HEADINGS[slug]}
          </h1>
          <form noValidate onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-5">
            <Fields slug={slug} />
          </form>
          {error && !next && <ErrorState>{error}</ErrorState>}
        </main>
      </div>
      <StickyBar>{action}</StickyBar>
    </>
  );
}
