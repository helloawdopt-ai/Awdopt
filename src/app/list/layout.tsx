import type { ReactNode } from "react";
import { ListingProvider } from "@/components/list/ListingProvider";

// The provider keeps answers and photos while moving between /list/* steps.
export default function ListLayout({ children }: { children: ReactNode }) {
  return <ListingProvider>{children}</ListingProvider>;
}
