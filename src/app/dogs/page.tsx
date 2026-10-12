import type { Metadata } from "next";
import { NoticePage } from "@/components/ui/NoticePage";

// Placeholder until discovery ships in M2.
export const metadata: Metadata = { title: "Find a Dog", robots: { index: false } };

export default function Page() {
  return (
    <NoticePage title="Browsing opens soon">
      <p>We&rsquo;re checking the first dogs for the Mumbai pilot. Please check back in a few days.</p>
    </NoticePage>
  );
}
