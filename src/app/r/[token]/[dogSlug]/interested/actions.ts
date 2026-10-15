"use server";

import { enquirySchema } from "@/lib/enquiry-schema";
import { isSlug } from "@/lib/server/dogs";
import { toE164 } from "@/lib/server/phone";
import { clientIp, underRateLimit } from "@/lib/server/rate-limit";
import { isToken, tokenHash } from "@/lib/server/results-token";
import { service } from "@/lib/server/supabase";
import { verifyTurnstile } from "@/lib/server/turnstile";

export type EnquiryResult = { ok: true } | { ok: false; error: string; field?: "phone" };

const OUTCOME: Record<string, string> = {
  duplicate: "You've already told us you're interested in this dog. The AWDOPT team will be in touch.",
  unavailable: "This dog isn't available to you any more. Your other matches are still on your link.",
  expired: "This link has expired. Take the quiz again for fresh matches and a new link.",
};

/**
 * Public write path (scope §10): zod → Turnstile → rate limit (5/h) → E.164 → submit_enquiry, which
 * recomputes the score snapshot and enforces one open enquiry per phone per dog.
 */
export async function submitEnquiry(
  token: unknown,
  slug: unknown,
  values: unknown,
  turnstileToken: unknown,
): Promise<EnquiryResult> {
  if (typeof token !== "string" || !isToken(token) || typeof slug !== "string" || !isSlug(slug)) {
    return { ok: false, error: OUTCOME.expired! };
  }
  const parsed = enquirySchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: "Some answers need another look." };
  const v = parsed.data;

  const ip = await clientIp();
  if (!(await verifyTurnstile(turnstileToken, ip))) {
    return { ok: false, error: "We couldn't confirm you're not a bot. Please try the check again." };
  }
  if (!(await underRateLimit("enquiry", ip))) {
    return { ok: false, error: "Too many enquiries from this connection. Please try again in an hour." };
  }
  const phone = toE164(v.phone);
  if (!phone) return { ok: false, error: "Check the phone number.", field: "phone" };

  const { data, error } = await service().rpc("submit_enquiry", {
    p: { dog_slug: slug, name: v.name, phone, email: v.email || null, message: v.message || null },
    p_token_hash: tokenHash(token),
  });
  if (error) return { ok: false, error: "Something went wrong sending your interest. Please try again." };
  return data === "sent" ? { ok: true } : { ok: false, error: OUTCOME[data] ?? OUTCOME.expired! };
}
