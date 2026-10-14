"use server";

import { listingSchema, toDog, validPhotos } from "@/lib/listing-schema";
import { toE164 } from "@/lib/server/phone";
import { clientIp, underRateLimit } from "@/lib/server/rate-limit";
import { service } from "@/lib/server/supabase";
import { verifyTurnstile } from "@/lib/server/turnstile";

export type SubmitResult = { ok: true; uploads: string[][] } | { ok: false; error: string; field?: "lister_phone" };

const GENERIC = "Something went wrong sending the listing. Please try again.";

/**
 * Public write path (scope §10): zod → Turnstile → rate limit → submit_listing (server-only DB
 * function) → signed upload URLs for each photo size. The browser then PUTs the resized photos.
 * Nothing is public until an admin approves; the bytes are checked at approval.
 */
export async function submitListing(values: unknown, photos: unknown, turnstileToken: unknown): Promise<SubmitResult> {
  const parsed = listingSchema.safeParse(values);
  if (!parsed.success || !validPhotos(photos)) return { ok: false, error: "Some answers need another look." };
  const v = parsed.data;

  const ip = await clientIp();
  if (!(await verifyTurnstile(turnstileToken, ip))) {
    return { ok: false, error: "We couldn't confirm you're not a bot. Please try the check again." };
  }
  if (!(await underRateLimit("listing", ip))) {
    return { ok: false, error: "Too many listings from this connection. Please try again in an hour." };
  }
  const phone = toE164(v.lister_phone);
  if (!phone) return { ok: false, error: "Check the phone number.", field: "lister_phone" };

  const { data, error } = await service().rpc("submit_listing", {
    p: {
      lister: { name: v.lister_name, phone, email: v.lister_email || null, relationship: v.relationship },
      dog: toDog(v),
      photos,
    },
  });
  if (error || !data) return { ok: false, error: GENERIC };

  const paths = (data as { paths: string[][] }).paths;
  const bucket = service().storage.from("listing-uploads");
  try {
    const uploads = await Promise.all(
      paths.map((sizes) =>
        Promise.all(
          sizes.map(async (path) => {
            const { data: signed, error: signError } = await bucket.createSignedUploadUrl(path);
            if (signError || !signed) throw signError;
            return signed.signedUrl;
          }),
        ),
      ),
    );
    return { ok: true, uploads };
  } catch {
    return { ok: false, error: GENERIC };
  }
}
