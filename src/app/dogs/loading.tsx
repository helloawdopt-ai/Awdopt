import { SiteHeader } from "@/components/ui/SiteHeader";
import { Skeleton } from "@/components/ui/States";

// Same boxes as the loaded page, so nothing shifts when the cards arrive.
export default function Loading() {
  return (
    <div className="mx-auto flex max-w-[1200px] flex-col gap-3.5 px-4 pt-3 pb-6" aria-busy="true">
      <SiteHeader />
      <p className="sr-only" role="status">
        Loading dogs…
      </p>
      <div className="flex flex-col gap-3.5 lg:grid lg:grid-cols-[272px_minmax(0,1fr)] lg:gap-8">
        <Skeleton className="hidden h-[640px] lg:block" />
        <div className="flex flex-col gap-3.5">
          <Skeleton className="h-[52px] w-3/4 rounded-[12px]" />
          <Skeleton className="h-11 w-32 rounded-full lg:hidden" />
          <div className="grid grid-cols-[minmax(0,1fr)] gap-[18px] md:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-[340px]" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
