"use server";

import { questionnaireSchema, toAdopter } from "@/lib/match-schema";
import { toE164 } from "@/lib/server/phone";
import { clientIp, underRateLimit } from "@/lib/server/rate-limit";
import { newToken, tokenHash } from "@/lib/server/results-token";
import { service } from "@/lib/server/supabase";
import { verifyTurnstile } from "@/lib/server/turnstile";

export type QuizResult = { ok: true; token: string } | { ok: false; error: string; field?: "phone" };

/**
 * Public write path (scope §10): zod → Turnstile → rate limit (10/h) → E.164 → submit_questionnaire
 * (server-only DB function). Returns the private results-link token; only its hash is stored.
 */
export async function submitQuestionnaire(values: unknown, turnstileToken: unknown): Promise<QuizResult> {
  const parsed = questionnaireSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: "Some answers need another look." };

  const ip = await clientIp();
  if (!(await verifyTurnstile(turnstileToken, ip))) {
    return { ok: false, error: "We couldn't confirm you're not a bot. Please try the check again." };
  }
  if (!(await underRateLimit("questionnaire", ip))) {
    return { ok: false, error: "Too many tries from this connection. Please try again in an hour." };
  }
  const phone = toE164(parsed.data.phone);
  if (!phone) return { ok: false, error: "Check the phone number.", field: "phone" };

  const token = newToken();
  const { error } = await service().rpc("submit_questionnaire", {
    p: toAdopter(parsed.data, phone),
    p_token_hash: tokenHash(token),
  });
  if (error) return { ok: false, error: "Something went wrong saving your answers. Please try again." };
  return { ok: true, token };
}
