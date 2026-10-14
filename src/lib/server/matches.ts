import "server-only";
import type { Database } from "@/lib/database.types";
import type { PhotoRow } from "@/lib/photo-url";
import { isToken, tokenHash } from "./results-token";
import { service } from "./supabase";

type Enums = Database["public"]["Enums"];
export type Category = Enums["match_category"];

/** Questionnaire answers the explanations use (never contact details). */
export type AdopterAnswers = {
  activity_level: Enums["energy_level"];
  home_type: Enums["home_type"];
  hours_alone: number;
  daily_time: Enums["daily_time"];
  experience: Enums["experience_level"];
  has_children_under_12: boolean;
  has_dogs: boolean;
  has_cats: boolean;
  pref_sizes: Enums["dog_size"][];
  pref_ages: Enums["age_band"][];
  pref_energy: Enums["energy_level"][];
  open_to_special_needs: boolean;
  open_to_senior: boolean;
  expires_at: string;
};

export type MatchDog = {
  slug: string;
  name: string;
  urgent: boolean;
  sex: Enums["dog_sex"] | null;
  age_months: number | null;
  breed: string | null;
  size: Enums["dog_size"] | null;
  energy: Enums["energy_level"] | null;
  locality: string;
  good_with_children: boolean | null;
  good_with_dogs: boolean | null;
  good_with_cats: boolean | null;
  needs_large_space: boolean | null;
  alone_max_hours: number | null;
  handling: Enums["handling_level"] | null;
  medical_needs: boolean | null;
  photo: PhotoRow | null;
};

export type Match = {
  rank: number;
  score: number;
  /** Share of the weight that applies and could be answered, 0–1. */
  confidence: number;
  /** 0–1, or null when it couldn't be scored (unknown, or Children/pets that doesn't apply). */
  categories: Record<Category, number | null>;
  why: Category[];
  consider: Category[];
  dog: MatchDog;
};

export type Results = {
  adopter: AdopterAnswers;
  total: number;
  excluded: Partial<Record<string, number>>;
  matches: Match[];
};

/**
 * The adopter's ranked matches (one SQL call), or null for a wrong or expired link. Never cached:
 * results are personal and change with weights and listings.
 */
export async function getResults(token: string, slug?: string): Promise<Results | null> {
  if (!isToken(token)) return null;
  const { data, error } = await service().rpc("results_for_token", {
    p_token_hash: tokenHash(token),
    ...(slug ? { p_slug: slug } : {}),
  });
  if (error) throw new Error("Could not load matches");
  return data as Results | null;
}
