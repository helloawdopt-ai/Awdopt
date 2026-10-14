import { CircleAlert } from "lucide-react";
import type { ReactNode } from "react";

/** DESIGN.md §16: White panel, Display S heading, one line, one secondary action. No sparkles. */
export function EmptyState({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-2 rounded-[24px] border-[2.5px] border-ink bg-surface p-5">
      <h2 className="font-display text-xl font-extrabold tracking-[-0.03em]">{title}</h2>
      <p className="text-base text-muted">{children}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

/** DESIGN.md §16: calm zone. Alert icon, one plain sentence, "Try again". */
export function ErrorState({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-3 rounded-[24px] border-[2.5px] border-ink bg-surface p-5"
    >
      <p className="flex items-start gap-2.5 text-base font-bold">
        <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-primary">
          <CircleAlert size={16} strokeWidth={2.6} aria-hidden="true" />
        </span>
        <span className="pt-0.5">{children}</span>
      </p>
      {action}
    </div>
  );
}
