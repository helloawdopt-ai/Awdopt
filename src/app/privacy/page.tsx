import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SiteHeader } from "@/components/ui/SiteHeader";
import { SiteMenu } from "@/components/ui/SiteMenu";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What AWDOPT collects, why, who sees it, and how to ask us to change or delete it.",
};

const CONTACT = "hello.awdopt@gmail.com";

function Section({ id, title, children }: { id?: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="flex scroll-mt-4 flex-col gap-2.5">
      <h2 className="font-display text-[22px] leading-[1.12] font-extrabold tracking-[-0.03em]">{title}</h2>
      {children}
    </section>
  );
}

// Calm zone (DESIGN.md §1): plain copy, no tilt, no sparkles.
export default function Page() {
  return (
    <div className="mx-auto flex max-w-[560px] flex-col px-4 pt-3 pb-12">
      <SiteHeader action={<SiteMenu />} />
      <main className="flex flex-col gap-8 pt-6 text-[15px] leading-normal [&_li]:ml-5 [&_li]:list-disc [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1.5">
        <div className="flex flex-col gap-2.5">
          <h1 className="font-display text-[28px] leading-[1.1] font-extrabold tracking-[-0.035em]">Privacy notice</h1>
          <p className="text-muted">Last updated 12 October 2026</p>
          <p>
            AWDOPT helps people in Mumbai find a dog that fits their life. This notice explains what we collect, why,
            who can see it, and how to ask us to change or delete it.
          </p>
        </div>

        <Section id="your-data" title="What we collect">
          <ul>
            <li>
              <strong>If you look for a dog:</strong> your name, age, city, phone or WhatsApp number, email (optional),
              and your answers about your home, routine and preferences.
            </li>
            <li>
              <strong>If you say you&rsquo;re interested in a dog:</strong> your name, phone or WhatsApp number, email
              (optional) and any message you write.
            </li>
            <li>
              <strong>If you list a dog:</strong> your name, phone or WhatsApp number, email (optional), your
              relationship to the dog, and the dog&rsquo;s details and photos.
            </li>
          </ul>
          <p>
            We only collect these details after you tick the consent box on the form. We don&rsquo;t ask for your home
            address. For a dog, we only ask for the area it lives in.
          </p>
        </Section>

        <Section title="Why we use it">
          <ul>
            <li>To score how well each dog fits your answers and show you your matches.</li>
            <li>To contact you and the dog&rsquo;s family when you say you&rsquo;re interested.</li>
            <li>To check every dog listing before it goes live.</li>
            <li>To keep the site safe from spam and abuse.</li>
          </ul>
          <p>
            We don&rsquo;t sell your details, we don&rsquo;t use them for advertising, and we don&rsquo;t share them
            with anyone else.
          </p>
        </Section>

        <Section title="Who can see it">
          <ul>
            <li>
              <strong>Only the AWDOPT team</strong> sees contact details. They are never shown on the site.
            </li>
            <li>
              A dog&rsquo;s profile, photos and area are public once our team approves the listing. The lister&rsquo;s
              name and contact details are not.
            </li>
            <li>
              Your results are on a private link. Anyone with the link can see your matches, so keep it to yourself. The
              link never shows your contact details, and it stops working after 90 days.
            </li>
          </ul>
        </Section>

        <Section title="Photos">
          <p>
            Photos are resized in your browser before they are uploaded, which also removes location data stored in the
            file. They stay private until our team approves the listing.
          </p>
        </Section>

        <Section title="Keeping the site safe">
          <ul>
            <li>
              Forms are protected by Cloudflare Turnstile, which checks that a person, not a bot, is sending them.
            </li>
            <li>
              To limit repeated submissions, we keep a scrambled code made from your IP address. We never store the IP
              address itself.
            </li>
            <li>We don&rsquo;t use advertising or tracking cookies, and we don&rsquo;t run analytics.</li>
          </ul>
        </Section>

        <Section title="Where it is stored">
          <p>
            Your details are stored with Supabase, in Mumbai, and the site runs on Vercel. Both only store and process
            the data on our behalf.
          </p>
        </Section>

        <Section title="How long we keep it">
          <p>
            We keep your details for as long as we need them to help with an adoption during the AWDOPT pilot. You can
            ask us to delete them at any time.
          </p>
        </Section>

        <Section title="Your choices">
          <p>
            You can ask us to see, correct or delete your details, or withdraw your consent. Email{" "}
            <a href={`mailto:${CONTACT}`} className="font-bold">
              {CONTACT}
            </a>{" "}
            from the email you used, or tell us the phone number you gave us.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            AWDOPT, Mumbai ·{" "}
            <a href={`mailto:${CONTACT}`} className="font-bold">
              {CONTACT}
            </a>
          </p>
          <p className="text-muted">If we change this notice, we&rsquo;ll update the date at the top.</p>
        </Section>
      </main>
    </div>
  );
}
