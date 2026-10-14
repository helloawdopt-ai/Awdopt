"use client";

import { Button, ButtonLink } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/States";

export default function DogsError({ retry }: { retry: () => void }) {
  return (
    // No SiteHeader: this is a client boundary and the logo's SVG paths would ship in every /dogs bundle.
    <div className="mx-auto flex max-w-[560px] flex-col gap-6 px-4 pt-10 pb-7">
      <main className="flex flex-col gap-4">
        <ErrorState
          action={
            <div className="flex flex-wrap gap-2.5">
              <Button variant="secondary" onClick={retry}>
                Try again
              </Button>
              <ButtonLink href="/" variant="ghost">
                Back to home
              </ButtonLink>
            </div>
          }
        >
          We couldn&rsquo;t load this page. Please try again.
        </ErrorState>
      </main>
    </div>
  );
}
