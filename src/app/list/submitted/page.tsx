import type { Metadata } from "next";
import { ListingSent } from "@/components/list/ListingSent";

export const metadata: Metadata = { title: "Listing in review", robots: { index: false } };

export default function Page() {
  return <ListingSent />;
}
