"use server";

import { DogCards } from "@/components/dog/DogCards";
import { parseFilters, type SearchParams } from "@/lib/dog-format";
import { isCursor, listDogs } from "@/lib/server/dogs";

/** "Load more": the next page of cards after `cursor`. Inputs come from the browser, so re-validate. */
export async function loadMoreDogs(params: SearchParams, cursor: string, start: number) {
  if (!isCursor(cursor) || !Number.isInteger(start) || start < 0 || start > 10_000) throw new Error("Bad request");
  const filters = parseFilters(typeof params === "object" && params ? params : {});
  const { dogs, next } = await listDogs(filters, cursor);
  return { cards: <DogCards dogs={dogs} start={start} />, count: dogs.length, next };
}
