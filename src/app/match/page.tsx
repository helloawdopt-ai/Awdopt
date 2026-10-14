import type { Metadata } from "next";
import { NoticePage } from "@/components/ui/NoticePage";

// Placeholder until the questionnaire ships in M3.
export const metadata: Metadata = { title: "Get my match scores", robots: { index: false } };

export default function Page() {
  return (
    <NoticePage title="Match scores open soon">
      <p>
        Soon you&rsquo;ll answer a few questions about your home and days, and we&rsquo;ll score every dog for you.
        Until then, browse the dogs and check back in a few weeks.
      </p>
    </NoticePage>
  );
}
