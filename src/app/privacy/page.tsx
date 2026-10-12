import type { Metadata } from "next";
import { NoticePage } from "@/components/ui/NoticePage";

// PLACEHOLDER: replace with the client's privacy notice before any form collects personal data.
export const metadata: Metadata = { title: "Privacy", robots: { index: false } };

export default function Page() {
  return (
    <NoticePage title="Privacy notice">
      <p>AWDOPT&rsquo;s full privacy notice will be published here before we collect any personal details.</p>
      <p>Right now this site does not ask for or store any information about you.</p>
    </NoticePage>
  );
}
