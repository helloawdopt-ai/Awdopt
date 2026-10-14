import { ChipGroup } from "@/components/ui/Chip";
import { FILTERS, FILTER_LABEL, type Filters } from "@/lib/dog-format";

const LEGEND = { area: "Location", age: "Age", size: "Size", breed: "Breed / type", energy: "Energy" } as const;

/** Filter chips for a plain GET form: state lives in the URL query, works without JavaScript. */
export function FilterFields({ filters }: { filters: Filters }) {
  return (
    <div className="flex flex-col gap-5">
      {(Object.keys(FILTERS) as (keyof Filters)[]).map((key) => (
        <ChipGroup
          key={key}
          legend={LEGEND[key]}
          name={key}
          defaultValue={filters[key]}
          options={FILTERS[key].map((v) => ({ value: v, label: (FILTER_LABEL[key] as (v: string) => string)(v) }))}
        />
      ))}
    </div>
  );
}
