import { DogSticker, Sparkle } from "@/components/brand/Glyphs";
import { Hero3D } from "@/components/hero/Hero3D";
import { ButtonLink } from "@/components/ui/Button";
import { SiteHeader } from "@/components/ui/SiteHeader";
import { SiteMenu } from "@/components/ui/SiteMenu";
import { TrustLine } from "@/components/ui/Trust";
import Link from "next/link";

const steps = [
  {
    tone: "bg-highlight",
    title: "Tell us how you live",
    body: "Five quick sections: you, your home, your days, what you're looking for, and why.",
  },
  {
    tone: "bg-bubble",
    title: "We score every dog on 8 things",
    body: "Energy, space, time alone, kids and pets, experience, size, age and special needs. No guesswork, no AI fluff.",
  },
  {
    tone: "bg-fresh",
    title: "Say “I’m interested”",
    body: "The AWDOPT team personally connects you with the dog’s family.",
  },
];

// The poster is the LCP-safe first paint and the fallback (reduced motion, low-end, no WebGL).
// Hero3D swaps in the 3D "Sticker Flip" over it when the page is idle (DESIGN.md §10).
function HeroPoster() {
  return (
    <Hero3D className="h-80 shrink-0 rounded-[28px] border-[2.5px] border-ink bg-fresh lg:h-[440px]">
      <div className="absolute top-[34px] left-[34px] flex w-[196px] -rotate-6 flex-col gap-2.5 rounded-[14px] border-[2.5px] border-ink bg-surface p-2.5 pb-3 shadow-sticker-6 lg:top-14 lg:left-16 lg:w-[250px]">
        {/* Illustration until the client sends a real dog photo (then: AVIF poster, fetchpriority high). */}
        <div data-hero-photo className="h-44 overflow-hidden rounded-lg bg-highlight lg:h-56">
          <DogSticker className="size-full" />
        </div>
        <p data-hero-caption className="text-[15px] font-bold">
          Bruno, 2 · Indie
        </p>
      </div>
      <p className="absolute top-[150px] right-[18px] rotate-6 rounded-[22px] border-[2.5px] border-ink bg-bubble px-4 py-3 font-display text-base leading-[1.2] font-bold shadow-sticker lg:top-52 lg:right-16 lg:text-xl">
        aww.
        <br />
        92% match
      </p>
      <Sparkle size={38} className="absolute top-9 right-11 fill-highlight" />
      <Sparkle size={26} className="absolute bottom-[22px] left-5 fill-primary" />
    </Hero3D>
  );
}

export default function Home() {
  return (
    <div className="mx-auto flex max-w-[1200px] flex-col gap-[18px] px-4 pt-3 pb-7">
      <SiteHeader action={<SiteMenu />} />

      <main className="flex flex-col gap-[18px]">
        <section className="flex flex-col gap-[18px] lg:grid lg:grid-cols-2 lg:items-center lg:gap-12">
          <div className="lg:order-2">
            <HeroPoster />
          </div>
          <div className="flex flex-col gap-[18px] lg:order-1">
            <div className="flex flex-col gap-2.5">
              <h1 className="font-display text-[30px] leading-[1.08] font-extrabold tracking-[-0.035em] lg:text-[44px]">
                Better Matches. Better Adoptions.
              </h1>
              <p className="text-base leading-normal text-muted lg:text-[17px]">
                Answer a few questions about your life. We&rsquo;ll find the dogs who&rsquo;d vibe with it, and tell you
                exactly why.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/dogs" className="sm:flex-1">
                Find a Dog
              </ButtonLink>
              <ButtonLink href="/list" variant="secondary" className="sm:flex-1">
                List a Dog
              </ButtonLink>
            </div>
            <TrustLine>Only the AWDOPT team sees your contact details. Never shown publicly.</TrustLine>
          </div>
        </section>

        <section id="how" aria-labelledby="how-title" className="mt-[22px] flex scroll-mt-4 flex-col gap-3.5">
          <h2 id="how-title" className="font-display text-[22px] font-extrabold tracking-[-0.03em]">
            How the matching works
          </h2>
          <ol className="flex flex-col gap-3.5 lg:grid lg:grid-cols-3">
            {steps.map((s, i) => (
              <li
                key={s.title}
                className="flex items-start gap-3.5 rounded-[22px] border-[2.5px] border-ink bg-surface p-4 shadow-sticker"
              >
                <span
                  aria-hidden="true"
                  className={`flex size-10 shrink-0 items-center justify-center rounded-full border-2 border-ink font-display font-extrabold ${s.tone}`}
                >
                  {i + 1}
                </span>
                <div className="flex flex-col gap-1">
                  <h3 className="text-base font-bold">{s.title}</h3>
                  <p className="text-sm leading-[1.45] text-muted">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section
          aria-labelledby="list-title"
          className="mt-3.5 flex flex-col gap-3 rounded-[28px] border-[2.5px] border-ink bg-primary px-5 py-[22px] shadow-sticker-6 lg:px-8 lg:py-7"
        >
          <h2 id="list-title" className="font-display text-[22px] leading-[1.15] font-extrabold tracking-[-0.03em]">
            Know a dog who needs a home?
          </h2>
          <p className="max-w-[60ch] text-[15px] leading-normal">
            Owners, rescuers, fosters and shelters can list a dog for free. Every listing is checked by our team before
            it goes live.
          </p>
          <ButtonLink href="/list" variant="secondary" className="h-12 self-start text-base">
            List a Dog
          </ButtonLink>
        </section>
      </main>

      <footer className="mt-3.5 flex flex-col gap-2.5 border-t-2 border-dashed border-ink pt-[18px] text-sm text-muted">
        <p className="font-display text-base font-extrabold text-ink">Better Matches. Better Adoptions.</p>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-[18px]">
          <Link href="/privacy" className="inline-flex min-h-11 items-center font-bold">
            Privacy
          </Link>
          <Link href="/privacy#your-data" className="inline-flex min-h-11 items-center font-bold">
            How we use your data
          </Link>
          <a href="mailto:hello.awdopt@gmail.com" className="inline-flex min-h-11 items-center font-bold">
            Contact
          </a>
        </nav>
        <p>Mumbai pilot · AWDOPT</p>
      </footer>
    </div>
  );
}
