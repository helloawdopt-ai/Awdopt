import "server-only";
import { unstable_cache } from "next/cache";
import type { Database } from "@/lib/database.types";
import { AGE_BANDS, INDIE, PEDIGREE_BREEDS, REGIONS, type Filters } from "@/lib/dog-format";
import type { PhotoRow } from "@/lib/photo-url";
import { service } from "./supabase";

// Generated types drop nullability on function results; every optional dog field can be NULL.
type Row = Database["public"]["Functions"]["public_dogs"]["Returns"][number];
type Required = "id" | "slug" | "name" | "locality" | "city" | "urgent" | "created_at";
export type PublicDog = { [K in Exclude<keyof Row, Required | "photos">]: Row[K] | null } & Pick<Row, Required> & {
    photos: PhotoRow[];
  };
export type DogCardData = Pick<
  PublicDog,
  | "id"
  | "slug"
  | "name"
  | "sex"
  | "age_months"
  | "breed"
  | "size"
  | "energy"
  | "locality"
  | "temperament"
  | "urgent"
  | "photos"
  | "created_at"
>;

export const PAGE_SIZE = 12;
const CARD_COLUMNS = "id,slug,name,sex,age_months,breed,size,energy,locality,temperament,urgent,photos,created_at";

// Keyset cursor "created_at|id". It reaches PostgREST filter syntax, so it is validated strictly.
const CURSOR =
  /^(\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,6})?\+00:00)\|([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/;
export const isCursor = (c: unknown): c is string => typeof c === "string" && CURSOR.test(c);

async function fetchDogs(filters: Filters, cursor: string | null) {
  let q = service()
    .rpc("public_dogs", undefined, { get: true, count: cursor ? undefined : "exact" })
    .select(CARD_COLUMNS)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(PAGE_SIZE + 1);

  if (filters.area.length)
    q = q.in(
      "locality",
      filters.area.flatMap((r) => REGIONS[r].areas),
    );
  if (filters.size.length) q = q.in("size", filters.size);
  if (filters.energy.length) q = q.in("energy", filters.energy);
  if (filters.breed.length)
    q = q.in(
      "breed",
      filters.breed.flatMap((b) => (b === "indie" ? [INDIE] : [...PEDIGREE_BREEDS])),
    );

  // Age bands and the cursor are OR-groups; PostgREST takes one top-level `or`, so AND them inside it.
  const groups: string[] = [];
  if (filters.age.length)
    groups.push(
      `or(${filters.age.map((a) => `and(age_months.gte.${AGE_BANDS[a].months[0]},age_months.lt.${AGE_BANDS[a].months[1]})`).join(",")})`,
    );
  if (cursor) {
    const [, at, id] = CURSOR.exec(cursor)!;
    groups.push(`or(created_at.lt."${at}",and(created_at.eq."${at}",id.lt.${id}))`);
  }
  if (groups.length) q = q.or(`and(${groups.join(",")})`);

  const { data, error, count } = await q;
  if (error) throw new Error("Could not load dogs");
  const rows = data as unknown as DogCardData[];
  const page = rows.slice(0, PAGE_SIZE);
  const last = page.at(-1);
  return {
    dogs: page,
    next: rows.length > PAGE_SIZE && last ? `${last.created_at}|${last.id}` : null,
    total: count,
  };
}

// Admin actions refresh the cache at once (updateTag("dogs")). The 5-minute revalidate is a safety
// net for changes made outside the app, e.g. in the Supabase dashboard.
const CACHE = { tags: ["dogs"], revalidate: 300 };

/** A page of approved dogs, cached under the "dogs" tag. */
export const listDogs = unstable_cache(fetchDogs, ["dogs-list"], CACHE);

/** Shape check before a slug reaches a query or a cache key (matches the DB CHECK). */
export const isSlug = (s: string) => s.length <= 80 && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(s);

export const getDog = unstable_cache(
  async (slug: string) => {
    const { data, error } = await service().rpc("public_dogs", undefined, { get: true }).eq("slug", slug).maybeSingle();
    if (error) throw new Error("Could not load dog");
    return data as unknown as PublicDog | null;
  },
  ["dog"],
  CACHE,
);
