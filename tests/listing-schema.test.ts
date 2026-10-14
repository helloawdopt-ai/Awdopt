import { describe, expect, it, vi } from "vitest";
import { EMPTY_LISTING, listingSchema, toDog, validPhotos } from "@/lib/listing-schema";

vi.mock("server-only", () => ({}));
const { toE164 } = await import("@/lib/server/phone");

const valid = {
  ...EMPTY_LISTING,
  lister_name: " Sample Lister ",
  lister_phone: "98200 12345",
  relationship: "rescuer",
  name: "Sample Dog",
  locality: "Bandra",
  consent: true,
};

describe("listing schema", () => {
  it("accepts a minimal listing and trims text", () => {
    const r = listingSchema.safeParse(valid);
    expect(r.success).toBe(true);
    expect(r.data?.lister_name).toBe("Sample Lister");
  });

  it("requires name, phone, relationship, area and consent", () => {
    const r = listingSchema.safeParse({ ...EMPTY_LISTING });
    const fields = new Set(r.error?.issues.map((i) => i.path[0]));
    for (const f of ["lister_name", "lister_phone", "relationship", "name", "locality", "consent"])
      expect(fields).toContain(f);
  });

  it("enforces the DB limits and allowed values", () => {
    const bad = (patch: object) => listingSchema.safeParse({ ...valid, ...patch }).success;
    expect(bad({ name: "x".repeat(41) })).toBe(false);
    expect(bad({ story: "x".repeat(2001) })).toBe(false);
    expect(bad({ locality: "My street 4" })).toBe(false);
    expect(bad({ breed: "Wolf" })).toBe(false);
    expect(bad({ alone_max_hours: "13" })).toBe(false);
    expect(bad({ age_months: "12" })).toBe(false);
    expect(bad({ video_url: "https://evil.example/x" })).toBe(false);
    expect(bad({ video_url: "https://youtu.be/abc" })).toBe(true);
    expect(bad({ size: "huge" })).toBe(false);
  });

  it("maps blanks to NULL (Not known yet) and answers to DB values", () => {
    const v = listingSchema.parse({
      ...valid,
      age_years: "2",
      age_months: "3",
      good_with_cats: "no",
      alone_max_hours: "0",
    });
    const dog = toDog(v);
    expect(dog).toMatchObject({ age_months: 27, good_with_cats: false, alone_max_hours: 0 });
    expect(dog.good_with_children).toBeNull();
    expect(dog.sex).toBeNull();
    expect(dog.breed).toBeNull();
    expect(toDog(listingSchema.parse(valid)).age_months).toBeNull();
  });
});

describe("photos and phone", () => {
  it("validates photo metadata", () => {
    expect(validPhotos([{ width: 1600, height: 1200, ext: "webp" }])).toBe(true);
    expect(validPhotos([])).toBe(false);
    expect(validPhotos(Array(7).fill({ width: 10, height: 10, ext: "jpg" }))).toBe(false);
    expect(validPhotos([{ width: 2000, height: 10, ext: "webp" }])).toBe(false);
    expect(validPhotos([{ width: 10, height: 10, ext: "svg" }])).toBe(false);
  });

  it("normalises phone numbers to E.164, reading bare numbers as Indian", () => {
    expect(toE164("98200 12345")).toBe("+919820012345");
    expect(toE164("+1 201 555 0123")).toBe("+12015550123");
    expect(toE164("12345")).toBeNull();
  });
});
