import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { editDog } from "@/app/admin/dog-actions";
import { adminButton } from "@/components/ui/AdminTable";
import { Input, Select, Textarea } from "@/components/ui/Field";
import { ErrorState } from "@/components/ui/States";
import {
  BREEDS,
  ENERGY_LABEL,
  HANDLING_LABEL,
  NOT_KNOWN,
  REGIONS,
  SEX_LABEL,
  SIZE_LABEL,
  VACCINATION_LABEL,
} from "@/lib/dog-format";
import { VIDEO_URL } from "@/lib/listing-schema";
import { requireAdmin } from "@/lib/server/auth";

export const metadata: Metadata = { title: "Edit dog", robots: { index: false } };

const yesNo = (v: boolean | null) => (v === null ? "" : v ? "yes" : "no");
const YES_NO = { yes: "Yes", no: "No" };

/** Native select with a blank "Not known yet" first option (blank = NULL, as in the listing form). */
function Pick({
  label,
  name,
  value,
  options,
}: {
  label: string;
  name: string;
  value: string;
  options: Record<string, string>;
}) {
  return (
    <Select label={label} id={name} name={name} defaultValue={value}>
      <option value="">{NOT_KNOWN}</option>
      {Object.entries(options).map(([v, l]) => (
        <option key={v} value={v}>
          {l}
        </option>
      ))}
    </Select>
  );
}

// Plain HTML form: the browser checks the same limits as the DB (maxLength, min/max, pattern),
// and editDog validates everything again with the listing schema.
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { supabase } = await requireAdmin();
  const [{ id }, { error }] = await Promise.all([params, searchParams]);
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const { data: dog } = await supabase.from("dogs").select("*").eq("id", id).maybeSingle();
  if (!dog) notFound();
  if (dog.status !== "pending" && dog.status !== "approved")
    return <ErrorState>Adopted and removed dogs can&rsquo;t be edited.</ErrorState>;

  const months = dog.age_months;
  return (
    <>
      <Link
        href={`/admin/dogs/${dog.id}`}
        className="inline-flex min-h-11 items-center self-start text-sm font-bold lg:min-h-0"
      >
        ← Back to {dog.name}
      </Link>
      <h1 className="font-display text-[26px] font-extrabold tracking-[-0.03em]">Edit {dog.name}</h1>
      <p className="text-sm text-muted">
        Blank means &ldquo;{NOT_KNOWN}&rdquo; on the profile. Photos and the lister&rsquo;s details can&rsquo;t be
        changed here.
      </p>
      {error === "invalid" && <ErrorState>Some values weren&rsquo;t valid, so nothing was saved.</ErrorState>}

      <form action={editDog} className="flex max-w-[760px] flex-col gap-4">
        <input type="hidden" name="id" value={dog.id} />
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Name" id="name" name="name" defaultValue={dog.name} required maxLength={40} />
          <Pick label="Sex" name="sex" value={dog.sex ?? ""} options={SEX_LABEL} />
          <Input
            label="Age: years"
            id="age_years"
            name="age_years"
            type="number"
            inputMode="numeric"
            min={0}
            max={25}
            defaultValue={months === null ? "" : Math.floor(months / 12)}
          />
          <Input
            label="Age: months"
            id="age_months"
            name="age_months"
            type="number"
            inputMode="numeric"
            min={0}
            max={11}
            defaultValue={months === null ? "" : months % 12}
          />
          <Pick
            label="Breed / type"
            name="breed"
            value={dog.breed ?? ""}
            options={Object.fromEntries(BREEDS.map((b) => [b, b]))}
          />
          <Select label="Area" id="locality" name="locality" defaultValue={dog.locality} required>
            {Object.values(REGIONS).map((r) => (
              <optgroup key={r.label} label={r.label}>
                {r.areas.map((a) => (
                  <option key={a}>{a}</option>
                ))}
              </optgroup>
            ))}
          </Select>
          <Pick label="Size" name="size" value={dog.size ?? ""} options={SIZE_LABEL} />
          <Pick label="Energy" name="energy" value={dog.energy ?? ""} options={ENERGY_LABEL} />
          <Pick
            label="Good with kids"
            name="good_with_children"
            value={yesNo(dog.good_with_children)}
            options={YES_NO}
          />
          <Pick label="Good with dogs" name="good_with_dogs" value={yesNo(dog.good_with_dogs)} options={YES_NO} />
          <Pick label="Good with cats" name="good_with_cats" value={yesNo(dog.good_with_cats)} options={YES_NO} />
          <Pick
            label="Needs a large space"
            name="needs_large_space"
            value={yesNo(dog.needs_large_space)}
            options={YES_NO}
          />
          <Input
            label="Longest time alone (hours)"
            id="alone_max_hours"
            name="alone_max_hours"
            type="number"
            inputMode="numeric"
            min={0}
            max={12}
            defaultValue={dog.alone_max_hours ?? ""}
          />
          <Pick label="Handling" name="handling" value={dog.handling ?? ""} options={HANDLING_LABEL} />
          <Pick
            label="Medical / special needs"
            name="medical_needs"
            value={yesNo(dog.medical_needs)}
            options={YES_NO}
          />
          <Pick label="Vaccination" name="vaccination" value={dog.vaccination ?? ""} options={VACCINATION_LABEL} />
          <Pick label="Sterilised" name="sterilised" value={yesNo(dog.sterilised)} options={YES_NO} />
          <Input
            label="Video link"
            id="video_url"
            name="video_url"
            type="url"
            optional
            maxLength={300}
            pattern={`${VIDEO_URL.source.slice(1)}.*`}
            defaultValue={dog.video_url ?? ""}
          />
        </div>
        <Textarea
          label="Health notes"
          id="medical_notes"
          name="medical_notes"
          optional
          maxLength={500}
          defaultValue={dog.medical_notes ?? ""}
        />
        <Textarea
          label="Temperament"
          id="temperament"
          name="temperament"
          optional
          maxLength={300}
          defaultValue={dog.temperament ?? ""}
        />
        <Textarea
          label="Story"
          id="story"
          name="story"
          optional
          rows={5}
          maxLength={2000}
          defaultValue={dog.story ?? ""}
        />
        <Textarea
          label="Why they need a new home"
          id="rehoming_reason"
          name="rehoming_reason"
          optional
          maxLength={500}
          defaultValue={dog.rehoming_reason ?? ""}
        />
        <Textarea
          label="Other information"
          id="other_info"
          name="other_info"
          optional
          maxLength={1000}
          defaultValue={dog.other_info ?? ""}
        />
        <Textarea
          label="Admin notes (never public)"
          id="admin_notes"
          name="admin_notes"
          optional
          maxLength={1000}
          defaultValue={dog.admin_notes ?? ""}
        />
        <label className="flex min-h-11 items-center gap-2.5 text-sm font-bold">
          <input type="checkbox" name="urgent" defaultChecked={dog.urgent} className="size-6 accent-primary" />
          Urgent (shown as a badge, never ranked higher)
        </label>
        <div className="flex flex-wrap gap-3">
          <button type="submit" className={adminButton.replace("bg-surface", "bg-fresh font-extrabold")}>
            Save changes
          </button>
          <Link href={`/admin/dogs/${dog.id}`} className={adminButton}>
            Cancel
          </Link>
        </div>
      </form>
    </>
  );
}
