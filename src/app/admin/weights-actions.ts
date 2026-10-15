"use server";

import { redirect } from "next/navigation";
import { CATEGORIES } from "@/lib/explanations";
import { requireAdmin } from "@/lib/server/auth";

/**
 * Saves all 8 weights in one upsert (the DB trigger refuses a set that is all zero) and the hard
 * constraint switches. No cache work: results are never cached, so every results link and the
 * admin adopter view use the new values on their next load. Enquiry snapshots keep the old ones.
 */
export async function saveWeights(formData: FormData) {
  const { supabase } = await requireAdmin();
  const rows = CATEGORIES.map(({ key }) => {
    const raw = String(formData.get(key) ?? "").trim();
    return { category: key, weight: raw === "" ? NaN : Number(raw) }; // blank is invalid, not 0
  });
  // numeric(5,2): 0–999.99, two decimals kept.
  if (rows.some((r) => !Number.isFinite(r.weight) || r.weight < 0 || r.weight > 999.99))
    redirect("/admin/weights?error=invalid");
  if (!rows.some((r) => r.weight > 0)) redirect("/admin/weights?error=zero");
  const { error } = await supabase
    .from("match_weights")
    .upsert(rows.map((r) => ({ ...r, weight: Math.round(r.weight * 100) / 100 })));
  if (error) redirect("/admin/weights?error=failed");

  const on = formData.getAll("constraint").map(String);
  const { data: all } = await supabase.from("hard_constraints").select("key");
  const off = (all ?? []).map((c) => c.key).filter((k) => !on.includes(k));
  const results = await Promise.all([
    on.length && supabase.from("hard_constraints").update({ enabled: true }).in("key", on),
    off.length && supabase.from("hard_constraints").update({ enabled: false }).in("key", off),
  ]);
  if (results.some((r) => r && r.error)) redirect("/admin/weights?error=failed");
  redirect("/admin/weights?done=saved");
}
