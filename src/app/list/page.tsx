import type { Metadata } from "next";
import { NoticePage } from "@/components/ui/NoticePage";

// Placeholder until the listing form ships in M2.
export const metadata: Metadata = { title: "List a Dog", robots: { index: false } };

export default function Page() {
  return (
    <NoticePage title="Listing opens soon">
      <p>
        Owners, rescuers, fosters and shelters will be able to list a dog here for free. Please check back in a few
        days.
      </p>
    </NoticePage>
  );
}
