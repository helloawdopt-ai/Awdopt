"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import * as z from "zod/mini";
import { UUID } from "@/lib/admin-format";
import { listingSchema, toDog } from "@/lib/listing-schema";
import { requireAdmin } from "@/lib/server/auth";

// Real file signatures, so a renamed file can't slip through (the bucket only checks the declared type).
const MAGIC: Record<string, (b: Uint8Array) => boolean> = {
  webp: (b) => ascii(b, 0, 4) === "RIFF" && ascii(b, 8, 12) === "WEBP",
  jpg: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
};
const ascii = (b: Uint8Array, from: number, to: number) => String.fromCharCode(...b.subarray(from, to));

const photoPaths = (dog: { dog_photos: { path_480: string; path_960: string; path_1600: string }[] }) =>
  dog.dog_photos.flatMap((p) => [p.path_480, p.path_960, p.path_1600]);

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
  const paths = photoPaths(dog);
  if (!paths.length) redirect(`/admin/dogs/${id}?error=photos`);

  // Checks run in parallel, then copies: six sequential Storage calls took ~4.5s.
  const uploads = supabase.storage.from("listing-uploads");
  const real = await Promise.all(
    paths.map(async (path) => {
      const { data: file } = await uploads.download(path);
      const ext = path.split(".").pop() ?? "";
      const bytes = file && file.size <= 2 * 1024 * 1024 ? new Uint8Array(await file.slice(0, 16).arrayBuffer()) : null;
      return !!bytes && !!MAGIC[ext]?.(bytes);
    }),
  );
  if (!real.every(Boolean)) redirect(`/admin/dogs/${id}?error=photos`);
  const copies = await Promise.all(paths.map((path) => uploads.copy(path, path, { destinationBucket: "dog-photos" })));
  // Already copied by an earlier, interrupted approval: fine.
  if (copies.some(({ error }) => error && !/exists/i.test(error.message))) redirect(`/admin/dogs/${id}?error=failed`);
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
  const paths = photoPaths(dog);
  if (paths.length) await supabase.storage.from("listing-uploads").remove(paths);
  redirect("/admin?done=rejected");
}

// The listing form's dog fields, validated again on the server (the edit form is plain HTML).
const dogSchema = z.omit(listingSchema, {
  lister_name: true,
  lister_phone: true,
  lister_email: true,
  relationship: true,
  consent: true,
});
const TEXT_FIELDS = Object.keys(dogSchema.shape).filter((k) => k !== "urgent");

/** Edit a pending or live dog's fields and admin notes. Photos and the slug stay as they are. */
export async function editDog(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = dogId(formData);
  const values = Object.fromEntries(TEXT_FIELDS.map((k) => [k, String(formData.get(k) ?? "")]));
  const parsed = dogSchema.safeParse({ ...values, urgent: formData.get("urgent") === "on" });
  const notes = String(formData.get("admin_notes") ?? "").trim();
  if (!parsed.success || notes.length > 1000) redirect(`/admin/dogs/${id}/edit?error=invalid`);
  const { data, error } = await supabase
    .from("dogs")
    .update({ ...toDog(parsed.data), admin_notes: notes || null })
    .eq("id", id)
    .in("status", ["pending", "approved"])
    .select("id");
  if (error || !data.length) redirect(`/admin/dogs/${id}?error=failed`);
  updateTag("dogs");
  redirect(`/admin/dogs/${id}?done=saved`);
}

/** Live → adopted: off Find a Dog and out of everyone's results. Photos are kept for the record. */
export async function markAdopted(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = dogId(formData);
  const { data, error } = await supabase
    .from("dogs")
    .update({ status: "adopted" })
    .eq("id", id)
    .eq("status", "approved")
    .select("id");
  if (error || !data.length) redirect(`/admin/dogs/${id}?error=failed`);
  updateTag("dogs");
  redirect(`/admin/dogs/${id}?done=adopted`);
}

/** Live → removed: the record and its enquiries stay, the public photo files are deleted. */
export async function removeDog(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = dogId(formData);
  const { data: dog } = await supabase
    .from("dogs")
    .select("status, dog_photos(path_480, path_960, path_1600)")
    .eq("id", id)
    .single();
  if (!dog || dog.status !== "approved") redirect(`/admin/dogs/${id}`);
  // Files first: if this fails nothing else has changed, and a retry is safe.
  const paths = photoPaths(dog);
  if (paths.length) {
    const { error } = await supabase.storage.from("dog-photos").remove(paths);
    if (error) redirect(`/admin/dogs/${id}?error=failed`);
  }
  const { error } = await supabase.from("dogs").update({ status: "removed" }).eq("id", id).eq("status", "approved");
  if (error) redirect(`/admin/dogs/${id}?error=failed`);
  await supabase.from("dog_photos").delete().eq("dog_id", id);
  updateTag("dogs");
  redirect(`/admin/dogs/${id}?done=removed`);
}
