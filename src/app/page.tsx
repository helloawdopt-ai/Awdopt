import { Logo } from "@/components/brand/Logo";

// Holding page until the landing page ships in M1.
export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-[560px] flex-col justify-center gap-6 px-4">
      <Logo size={40} variant="sticker" label="AWDOPT" className="self-start" />
      <h1 className="font-display text-[30px] leading-[1.08] font-extrabold tracking-[-0.035em]">
        Better Matches. Better Adoptions.
      </h1>
      <p className="text-base text-muted">Coming soon to Mumbai.</p>
    </main>
  );
}
