"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/server/auth";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// Real file signatures, so a renamed file can't slip through (the bucket only checks the declared type).
const MAGIC: Record<string, (b: Uint8Array) => boolean> = {
  webp: (b) => ascii(b, 0, 4) === "RIFF" && ascii(b, 8, 12) === "WEBP",
  jpg: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
};
const ascii = (b: Uint8Array, from: number, to: number) => String.fromCharCode(...b.subarray(from, to));

function dogId(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!UUID.test(id)) redirect("/admin");
  return id;
}

/**
 * Approve: every stored file must exist, be ≤ 2MB and match its extension's magic bytes. Then the
 * files are copied to the public bucket, the dog goes live, and the private copies are deleted.
 * Runs on the admin's own session, so RLS and the storage policies (aal2 admin) apply.
 */
export async function approveDog(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = dogId(formData);
  const { data: dog } = await supabase
    .from("dogs")
    .select("id, status, dog_photos(path_480, path_960, path_1600)")
    .eq("id", id)
    .single();
  if (!dog || dog.status !== "pending") redirect("/admin");
  const paths = dog.dog_photos.flatMap((p) => [p.path_480, p.path_960, p.path_1600]);
  if (!paths.length) redirect(`/admin/dogs/${id}?error=photos`);

  const uploads = supabase.storage.from("listing-uploads");
  for (const path of paths) {
    const { data: file } = await uploads.download(path);
    const ext = path.split(".").pop() ?? "";
    const bytes = file && file.size <= 2 * 1024 * 1024 ? new Uint8Array(await file.slice(0, 16).arrayBuffer()) : null;
    if (!bytes || !MAGIC[ext]?.(bytes)) redirect(`/admin/dogs/${id}?error=photos`);
  }
  for (const path of paths) {
    const { error } = await uploads.copy(path, path, { destinationBucket: "dog-photos" });
    // Already copied by an earlier, interrupted approval: fine.
    if (error && !/exists/i.test(error.message)) redirect(`/admin/dogs/${id}?error=failed`);
  }
  const { error } = await supabase
    .from("dogs")
    .update({ status: "approved", approved_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "pending");
  if (error) redirect(`/admin/dogs/${id}?error=failed`);
  await uploads.remove(paths);
  updateTag("dogs");
  redirect("/admin?done=approved");
}

/** Reject: the dog becomes "removed" (kept for the record) and its private uploads are deleted. */
export async function rejectDog(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = dogId(formData);
  const { data: dog } = await supabase
    .from("dogs")
    .select("status, dog_photos(path_480, path_960, path_1600)")
    .eq("id", id)
    .single();
  if (!dog || dog.status !== "pending") redirect("/admin");
  const { error } = await supabase.from("dogs").update({ status: "removed" }).eq("id", id).eq("status", "pending");
  if (error) redirect(`/admin/dogs/${id}?error=failed`);
  const paths = dog.dog_photos.flatMap((p) => [p.path_480, p.path_960, p.path_1600]);
  if (paths.length) await supabase.storage.from("listing-uploads").remove(paths);
  redirect("/admin?done=rejected");
}
