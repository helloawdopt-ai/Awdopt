"use client";

import { useState, useTransition, type ReactNode } from "react";
import { loadMoreDogs } from "@/app/dogs/actions";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/States";
import type { SearchParams } from "@/lib/dog-format";

/** Grid of cards plus cursor-based "Load more" (12 per page). */
export function LoadMore({
  params,
  next: firstNext,
  count,
  children,
}: {
  params: SearchParams;
  next: string | null;
  count: number;
  children: ReactNode;
}) {
  const [pages, setPages] = useState<ReactNode[]>([]);
  const [next, setNext] = useState(firstNext);
  const [shown, setShown] = useState(count);
  const [status, setStatus] = useState("");
  const [failed, setFailed] = useState(false);
  const [pending, start] = useTransition();

  const load = () =>
    start(async () => {
      if (!next) return;
      try {
        const page = await loadMoreDogs(params, next, shown);
        setPages((p) => [...p, page.cards]);
        setNext(page.next);
        setShown((n) => n + page.count);
        setStatus(`${page.count} more dogs loaded`);
        setFailed(false);
      } catch {
        setFailed(true);
      }
    });

  return (
    <>
      <ul className="grid gap-[18px] md:grid-cols-2 xl:grid-cols-3">
        {children}
        {pages}
      </ul>
      <p aria-live="polite" className="sr-only">
        {status}
      </p>
      {failed ? (
        <ErrorState
          action={
            <Button variant="secondary" onClick={load}>
              Try again
            </Button>
          }
        >
          We couldn&rsquo;t load more dogs.
        </ErrorState>
      ) : (
        next && (
          <Button variant="secondary" onClick={load} disabled={pending} className="self-center">
            {pending ? "Loading…" : "Load more"}
          </Button>
        )
      )}
    </>
  );
}
