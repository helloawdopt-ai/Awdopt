import type { ReactNode } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { SiteHeader } from "@/components/ui/SiteHeader";
import { SiteMenu } from "@/components/ui/SiteMenu";

/** Calm one-message page (no tilt, no sparkles): "opening soon" states and placeholders. */
export function NoticePage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-[560px] flex-col px-4 pt-3 pb-7">
      <SiteHeader action={<SiteMenu />} />
      <main className="flex flex-1 flex-col justify-center gap-4 py-10">
        <h1 className="font-display text-[26px] leading-[1.1] font-extrabold tracking-[-0.035em]">{title}</h1>
        <div className="flex flex-col gap-3 text-base leading-normal text-muted">{children}</div>
        <ButtonLink href="/" variant="secondary" className="mt-2 self-start">
          Back to home
        </ButtonLink>
      </main>
    </div>
  );
}
