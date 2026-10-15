"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { ENQUIRY_STATUS_LABEL, UUID } from "@/lib/admin-format";
import { requireAdmin } from "@/lib/server/auth";

type Status = keyof typeof ENQUIRY_STATUS_LABEL;
const isStatus = (v: string): v is Status => v in ENQUIRY_STATUS_LABEL;

/**
 * Status + reason for one enquiry (scope #13). "Adopted" also marks the dog adopted, so it leaves
 * Find a Dog. Reopening a closed enquiry while the same phone has another open one for that dog
 * hits the one-open-enquiry index (23505) and is refused with a message.
 */
export async function setEnquiryStatus(formData: FormData) {
  const { supabase } = await requireAdmin();
  const back = formData.get("back") === "/admin" ? "/admin" : "/admin/enquiries";
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!UUID.test(id) || !isStatus(status) || reason.length > 500) redirect(`${back}?error=invalid`);

  const { data, error } = await supabase
    .from("enquiries")
    .update({ status, reason: reason || null })
    .eq("id", id)
    .select("dog_id");
  if (error?.code === "23505") redirect(`${back}?error=open`);
  if (error || !data.length) redirect(`${back}?error=failed`);
  if (status === "adopted") {
    const dog = await supabase
      .from("dogs")
      .update({ status: "adopted" })
      .eq("id", data[0]!.dog_id)
      .eq("status", "approved");
    updateTag("dogs");
    if (dog.error) redirect(`${back}?error=dog`);
  }
  redirect(`${back}?done=saved`);
}
