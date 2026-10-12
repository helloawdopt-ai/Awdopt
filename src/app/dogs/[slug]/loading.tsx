import { Skeleton } from "@/components/ui/States";

export default function Loading() {
  return (
    <div className="mx-auto max-w-[1200px] lg:grid lg:grid-cols-2 lg:gap-10 lg:px-4 lg:pt-6" aria-busy="true">
      <p className="sr-only" role="status">
        Loading dog…
      </p>
      <Skeleton className="h-[340px] rounded-none lg:aspect-[4/3] lg:h-auto lg:rounded-[24px]" />
      <div className="flex flex-col gap-[18px] px-4 pt-[18px] lg:px-0 lg:pt-0">
        <Skeleton className="h-[86px] w-2/3 rounded-[12px]" />
        <Skeleton className="h-[90px] rounded-[16px]" />
        <Skeleton className="h-[180px] rounded-[16px]" />
        <Skeleton className="h-[220px] rounded-[22px]" />
      </div>
    </div>
  );
}
