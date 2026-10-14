import type { Metadata } from "next";
import { SlidersHorizontal } from "lucide-react";
import { DogCards } from "@/components/dog/DogCards";
import { FilterFields } from "@/components/dog/Filters";
import { LoadMore } from "@/components/dog/LoadMore";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button, ButtonLink } from "@/components/ui/Button";
import { RemovableChip } from "@/components/ui/Chip";
import { SiteHeader } from "@/components/ui/SiteHeader";
import { SiteMenu } from "@/components/ui/SiteMenu";
import { EmptyState } from "@/components/ui/States";
import { StickyBar } from "@/components/ui/StickyBar";
import { FILTER_LABEL, filtersQuery, parseFilters, type Filters, type SearchParams } from "@/lib/dog-format";
import { listDogs } from "@/lib/server/dogs";

export const metadata: Metadata = {
  title: "Find a Dog",
  description: "Dogs looking for a home in Mumbai. Filter by area, age, size, breed and energy.",
};

function appliedChips(filters: Filters) {
  return (Object.keys(filters) as (keyof Filters)[]).flatMap((key) =>
    filters[key].map((value) => {
      const label = (FILTER_LABEL[key] as (v: string) => string)(value);
      const without = { ...filters, [key]: (filters[key] as string[]).filter((v) => v !== value) };
      return (
        <RemovableChip key={`${key}-${value}`} href={`/dogs${filtersQuery(without)}`} label={`Remove filter: ${label}`}>
          {label}
        </RemovableChip>
      );
    }),
  );
}

export default async function Page({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const filters = parseFilters(params);
  const active = Object.values(filters).flat().length;
  const { dogs, next, total } = await listDogs(filters, null);
  const n = total ?? dogs.length;
  const chips = appliedChips(filters);

  const showButton = (form: string) => (
    <Button type="submit" form={form} className="grow">
      Show dogs
    </Button>
  );
  const clear = (
    <ButtonLink href="/dogs" variant="secondary">
      Clear
    </ButtonLink>
  );

  return (
    <>
      <div className="mx-auto flex max-w-[1200px] flex-col gap-3.5 px-4 pt-3 pb-6">
        <SiteHeader action={<SiteMenu />} />
        <main className="lg:grid lg:grid-cols-[296px_minmax(0,1fr)] lg:items-start lg:gap-8">
          {/* Desktop: filters in a sidebar instead of the bottom sheet. */}
          <aside className="hidden rounded-[24px] border-[2.5px] border-ink bg-surface p-5 lg:sticky lg:top-4 lg:block">
            <form id="filters-side" action="/dogs" className="flex flex-col gap-5">
              <h2 className="font-display text-xl font-extrabold tracking-[-0.03em]">Filters</h2>
              <FilterFields filters={filters} />
              <div className="flex gap-2.5">
                {clear}
                {showButton("filters-side")}
              </div>
            </form>
          </aside>

          <div className="flex flex-col gap-3.5">
            <div className="flex flex-col gap-1">
              <h1 className="font-display text-[26px] leading-[1.1] font-extrabold tracking-[-0.035em] lg:text-[34px]">
                Dogs looking for a home
              </h1>
              <p className="text-sm text-muted">
                {n} {n === 1 ? "dog" : "dogs"}
                {active ? " match your filters" : ""} · Mumbai
              </p>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1 lg:flex-wrap lg:overflow-visible">
              <BottomSheet
                title="Filters"
                triggerClassName="press inline-flex h-11 shrink-0 items-center gap-2 rounded-full bg-ink px-4 text-sm font-bold text-bg hover:-translate-px active:translate-[2px] lg:hidden"
                trigger={
                  <>
                    <SlidersHorizontal size={16} strokeWidth={2.2} aria-hidden="true" />
                    Filters{active ? ` · ${active}` : ""}
                  </>
                }
                footer={
                  <>
                    {clear}
                    {showButton("filters-sheet")}
                  </>
                }
              >
                <form id="filters-sheet" action="/dogs">
                  <FilterFields filters={filters} />
                </form>
              </BottomSheet>
              {chips}
            </div>

            <div className="flex flex-col gap-[18px]">
              {dogs.length ? (
                <LoadMore key={filtersQuery(filters)} params={params} next={next} count={dogs.length}>
                  <DogCards dogs={dogs} />
                </LoadMore>
              ) : active ? (
                <EmptyState
                  title="No dogs match these filters"
                  action={
                    <ButtonLink href="/dogs" variant="secondary">
                      Clear filters
                    </ButtonLink>
                  }
                >
                  Try removing a filter or two.
                </EmptyState>
              ) : (
                <EmptyState
                  title="No dogs listed yet"
                  action={
                    <ButtonLink href="/list" variant="secondary">
                      List a Dog
                    </ButtonLink>
                  }
                >
                  The first dogs for the Mumbai pilot are on their way.
                </EmptyState>
              )}
            </div>
          </div>
        </main>
      </div>
      <StickyBar>
        <ButtonLink href="/match/basic" className="grow">
          Get my match scores
        </ButtonLink>
      </StickyBar>
    </>
  );
}
