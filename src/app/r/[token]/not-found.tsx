import Link from "next/link";
import { NoticePage } from "@/components/ui/NoticePage";

// Same page for a wrong and an expired link: it never says which.
export default function NotFound() {
  return (
    <NoticePage title="This link doesn't work">
      <p>It may have expired (links last 90 days) or been copied with a piece missing.</p>
      <p>
        <Link href="/match/basic">Take the quiz again</Link> to get fresh matches and a new link.
      </p>
    </NoticePage>
  );
}
