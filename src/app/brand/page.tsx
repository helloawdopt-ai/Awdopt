import { requireAdmin } from "@/lib/server/auth";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { ArrowLeft, Menu } from "lucide-react";
import { Heart, Sparkle } from "@/components/brand/Glyphs";
import { Logo } from "@/components/brand/Logo";
import { DogCard } from "@/components/dog/DogCard";
import { CategoryBar, LimitedInfoTag, MatchRow, ReasonLine, ScoreSticker } from "@/components/dog/Match";
import { AdminTable, adminButton, adminSelect } from "@/components/ui/AdminTable";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button, ButtonLink, IconButton } from "@/components/ui/Button";
import { ChipGroup, RemovableChip, StatusChip, overline } from "@/components/ui/Chip";
import { OptionGrid, SegmentedControl } from "@/components/ui/Choice";
import { Checkbox, Input, Textarea } from "@/components/ui/Field";
import { PhotoUploader } from "@/components/ui/PhotoUploader";
import { PrivateLinkCard } from "@/components/ui/PrivateLinkCard";
import { Progress } from "@/components/ui/Progress";
import { SiteHeader } from "@/components/ui/SiteHeader";
import { StickyBar } from "@/components/ui/StickyBar";
import { TimelineSteps } from "@/components/ui/TimelineSteps";
import { TrustLine, TrustPanel } from "@/components/ui/Trust";

// Design-system preview. Hidden in production until it moves behind admin auth (M2).
export const metadata: Metadata = { title: "Brand preview", robots: { index: false, follow: false } };

const STATUSES = [
  "Interested",
  "Contacted",
  "Meeting",
  "Rejected",
  "Adoption in progress",
  "Adopted",
  "Adoption unsuccessful",
  "Follow-up required",
];
const CATEGORIES: [string, string, number | null][] = [
  ["Lifestyle & activity", "25%", 96],
  ["Living situation", "20%", 95],
  ["Time availability", "15%", 80],
  ["Children & other pets", "10%", 100],
  ["Dog experience", "10%", 85],
  ["Size preference", "10%", 95],
  ["Age preference", "5%", null],
  ["Special-needs fit", "5%", 90],
];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 border-t-2 border-dashed border-ink pt-6">
      <h2 className="font-display text-[22px] font-extrabold tracking-[-0.03em]">{title}</h2>
      {children}
    </section>
  );
}

export default async function BrandPage() {
  // Internal component preview: admins only (DESIGN.md Step 0 note).
  await requireAdmin();
  if (process.env.VERCEL_ENV === "production") notFound();

  return (
    <>
      <main className="mx-auto flex max-w-[560px] flex-col gap-8 px-4 pt-3 pb-10">
        <SiteHeader
          action={
            <IconButton label="Open menu" tone="menu">
              <Menu size={22} strokeWidth={2.4} aria-hidden="true" />
            </IconButton>
          }
        />
        <div className="flex flex-col gap-2.5">
          <h1 className="font-display text-[30px] leading-[1.08] font-extrabold tracking-[-0.035em]">Sticker Club</h1>
          <p className="text-base leading-normal text-muted">Every core component from DESIGN.md §7, in every state.</p>
        </div>

        <Section title="Logo">
          <div className="flex flex-wrap items-end gap-6">
            <Logo size={20} label="AWDOPT" />
            <Logo size={40} label="AWDOPT" />
            <Logo size={28} variant="sticker" label="AWDOPT" />
          </div>
          <div className="on-dark flex items-center gap-6 rounded-[20px] border-[2.5px] border-ink bg-ink p-5">
            <Logo size={32} variant="reversed" label="AWDOPT" />
          </div>
          <div className="flex items-end gap-4">
            <Logo variant="icon" size={16} label="AWDOPT icon, 16px" />
            <Logo variant="icon" size={32} label="AWDOPT icon, 32px" />
            <Logo variant="icon" size={64} label="AWDOPT icon, 64px" />
            <Logo variant="icon" size={120} label="AWDOPT icon, 120px" />
          </div>
          <div className="flex items-center gap-4">
            <Sparkle size={38} />
            <Sparkle size={26} className="fill-primary" />
            <Sparkle size={26} className="fill-surface" />
            <Heart size={22} />
          </div>
        </Section>

        <Section title="Buttons">
          <Button>Find My Matches</Button>
          <ButtonLink href="/brand" variant="secondary">
            List a Dog
          </ButtonLink>
          <Button variant="ghost">Ghost</Button>
          <Button disabled>Disabled</Button>
          <div className="flex gap-3">
            <IconButton label="Back" href="/brand">
              <ArrowLeft size={20} strokeWidth={2.4} aria-hidden="true" />
            </IconButton>
            <IconButton label="Open menu" tone="menu">
              <Menu size={22} strokeWidth={2.4} aria-hidden="true" />
            </IconButton>
          </div>
        </Section>

        <Section title="Chips">
          <ChipGroup
            legend="Size"
            name="size"
            options={["Small", "Medium", "Large"].map((v) => ({ value: v, label: v }))}
            defaultValue="Medium"
          />
          <div className="flex flex-wrap gap-2">
            <RemovableChip href="/brand" label="Remove filter: Indie">
              Indie
            </RemovableChip>
            <StatusChip tone="fresh">Great fit</StatusChip>
            <StatusChip tone="highlight">Good fit</StatusChip>
            <StatusChip>Worth a look</StatusChip>
            <StatusChip tone="bubble">Urgent</StatusChip>
            <LimitedInfoTag />
          </div>
        </Section>

        <Section title="Choices">
          <Progress current={3} section="Lifestyle" />
          <Progress current={2} section="About the dog" prefix="List a Dog" />
          <OptionGrid
            legend="How active are you?"
            name="activity"
            defaultValue="walks"
            options={[
              { value: "couch", label: "Couch era", hint: "Mostly home, short strolls" },
              { value: "walks", label: "Daily walks", hint: "Morning + evening walks" },
              { value: "runs", label: "Runs & hikes", hint: "Out most weekends" },
              { value: "always", label: "Always moving", hint: "Sport, trails, beach runs" },
            ]}
          />
          <SegmentedControl
            legend="Energy"
            name="energy"
            defaultValue="Balanced"
            options={["Chill", "Balanced", "Zoomies"].map((v) => ({ value: v, label: v }))}
          />
        </Section>

        <Section title="Form (calm zone)">
          <Input id="b-name" label="Your name" autoComplete="name" />
          <Input
            id="b-phone"
            label="Phone / WhatsApp"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            error="Enter a 10-digit Indian mobile number."
          />
          <Input
            id="b-email"
            label="Email"
            type="email"
            inputMode="email"
            autoComplete="email"
            hint="We only use this to reach you about this dog."
          />
          <Textarea id="b-msg" label="Message" optional placeholder="Anything you'd like the team to know?" />
          <TrustPanel>
            Only the AWDOPT team can see them, to arrange a meeting. They are never shown publicly or sold. Ask us
            anytime and we&apos;ll delete them.
          </TrustPanel>
          <Checkbox id="b-consent">
            I agree to AWDOPT using these details to contact me about this dog.{" "}
            <a href="/privacy" className="font-extrabold">
              Privacy notice
            </a>
          </Checkbox>
          <TrustLine>Only the AWDOPT team sees your contact details. Never shown publicly.</TrustLine>
          <PhotoUploader previews={[]} />
        </Section>

        <Section title="Dogs and matches">
          <DogCard
            href="/brand"
            name="Bruno"
            locality="Andheri W"
            meta="Male · 2 yrs · Indie · Medium"
            summary="Goofy, loyal, and a total couch hog after his evening walk."
            energy="Zoomies"
            priority
          />
          <MatchRow
            href="/brand"
            rank={1}
            name="Bruno"
            meta="2 yrs · Indie · Andheri W"
            reason="Your active mornings match his zoomies."
            score={92}
            confidence={1}
          />
          <MatchRow
            href="/brand"
            rank={3}
            name="Max"
            meta="7 yrs · Indie · Powai"
            reason="Calm senior who fits a 1BHK perfectly."
            score={82}
            confidence={0.6}
            tint={2}
          />
          <MatchRow
            href="/brand"
            rank={6}
            name="Tofu"
            meta="5 yrs · Beagle mix · Thane"
            reason="Right size; needs more time daily."
            score={64}
            confidence={0.9}
            tint={3}
          />
          <div className="relative h-[210px] rounded-[24px] border-[2.5px] border-ink bg-highlight">
            <ScoreSticker score={92} className="absolute -right-1.5 -bottom-5" />
          </div>
          <div className="mt-4 flex flex-col gap-[11px] rounded-[22px] border-[2.5px] border-ink bg-surface px-4 py-3.5">
            {CATEGORIES.map(([label, weight, score]) => (
              <CategoryBar key={label} label={label} weight={weight} score={score} />
            ))}
          </div>
          <div className="flex flex-col gap-2.5">
            <h3 className={overline}>Why this could work</h3>
            <ul className="flex flex-col gap-2.5">
              <ReasonLine kind="why">Good with other dogs, and you already have one.</ReasonLine>
              <ReasonLine kind="why">Your daily walks and weekend runs match his zoomies.</ReasonLine>
            </ul>
            <h3 className={`${overline} mt-1.5`}>Things to consider</h3>
            <ul className="flex flex-col gap-2.5">
              <ReasonLine kind="consider">He would be alone about 5 hours on weekdays; he is used to 4.</ReasonLine>
            </ul>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="flex flex-col gap-0.5 rounded-[16px] border-2 border-ink bg-surface p-2.5">
              <span className="text-sm font-extrabold">Kids</span>
              <span className="text-[13px]">Yes</span>
            </div>
            <div className="flex flex-col gap-0.5 rounded-[16px] border-2 border-dashed border-ink p-2.5">
              <span className="text-sm font-extrabold">Cats</span>
              <span className="text-[13px] text-muted">Not known yet</span>
            </div>
          </div>
        </Section>

        <Section title="Success moments">
          <TimelineSteps
            steps={[
              { lead: "The AWDOPT team calls or WhatsApps you", text: "to say hi and answer questions." },
              { lead: "You meet Bruno", text: "with his foster family." },
              { lead: "If it clicks,", text: "we help with the adoption and check in after." },
            ]}
          />
          <PrivateLinkCard url="https://example.test/r/sample-token" />
        </Section>

        <Section title="Bottom sheet">
          <BottomSheet
            title="Filters"
            trigger="Open filters"
            triggerClassName="press inline-flex h-11 items-center self-start rounded-full bg-ink px-4 text-sm font-bold text-bg on-dark active:translate-[2px]"
            footer={
              <>
                <Button variant="secondary">Clear</Button>
                <Button className="grow">Show 9 dogs</Button>
              </>
            }
          >
            <div className="flex flex-col gap-[18px]">
              <ChipGroup
                legend="Age"
                name="age"
                options={["Puppy", "Young", "Adult", "Senior"].map((v) => ({ value: v, label: v }))}
              />
              <ChipGroup
                legend="Breed / type"
                name="breed"
                defaultValue="Indie"
                options={["Indie", "Labrador mix", "Beagle", "Any breed"].map((v) => ({ value: v, label: v }))}
              />
              <ChipGroup
                legend="Energy"
                name="energy-f"
                options={["Chill", "Balanced", "Zoomies"].map((v) => ({ value: v, label: v }))}
              />
            </div>
          </BottomSheet>
        </Section>

        <Section title="Admin (calm zone)">
          <AdminTable label="Recent enquiries">
            <table>
              <thead>
                <tr>
                  <th>Adopter</th>
                  <th>Dog</th>
                  <th>Match</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="font-extrabold">Riya S.</td>
                  <td>Bruno</td>
                  <td className="font-extrabold tabular">92%</td>
                  <td>
                    <select aria-label="Status for Riya S." defaultValue="Meeting" className={adminSelect}>
                      {STATUSES.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <button type="button" className={`${adminButton} bg-fresh font-extrabold`}>
                      Approve
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </AdminTable>
        </Section>
      </main>
      <StickyBar>
        <ButtonLink href="/brand" variant="primary" className="grow">
          <Heart size={20} />
          I&apos;m Interested
        </ButtonLink>
      </StickyBar>
    </>
  );
}
