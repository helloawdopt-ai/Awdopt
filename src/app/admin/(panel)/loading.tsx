// DESIGN.md §16 skeleton while an admin page loads: Oat Milk blocks, dashed Plum at 20%, no shimmer.
const block = "rounded-[16px] border-2 border-dashed border-ink/20 bg-bg";

export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading" className="flex flex-col gap-5">
      <div className={`${block} h-9 w-56`} />
      <div className={`${block} h-14 w-full max-w-[70ch]`} />
      <div className={`${block} h-80 w-full`} />
    </div>
  );
}
