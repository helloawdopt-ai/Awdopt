import type { ReactNode } from "react";
import { QuizProvider } from "@/components/match/QuizProvider";

// The provider keeps answers while moving between /match/* steps.
export default function MatchLayout({ children }: { children: ReactNode }) {
  return <QuizProvider>{children}</QuizProvider>;
}
