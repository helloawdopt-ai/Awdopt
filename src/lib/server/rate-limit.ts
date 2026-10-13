import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import type { Database } from "@/lib/database.types";
import { service } from "./supabase";

type Action = Database["public"]["Enums"]["rate_limit_action"];

/** Client IP as Vercel reports it. Used for Turnstile and the salted hash only; never stored raw. */
export async function clientIp() {
  const h = await headers();
  return h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
}

/** Scope §10: 5 enquiries, 3 listings, 10 questionnaires per hour per salted IP hash. */
const LIMITS: Record<Action, number> = { enquiry: 5, listing: 3, questionnaire: 10 };

export async function underRateLimit(action: Action, ip: string | null) {
  const salt = process.env.RATE_LIMIT_IP_SALT;
  if (!salt) throw new Error("RATE_LIMIT_IP_SALT is not set");
  const hash = createHash("sha256")
    .update(`${salt}:${ip ?? "unknown"}`)
    .digest("hex");
  const { data, error } = await service.rpc("hit_rate_limit", {
    p_action: action,
    p_ip_hash: `\\x${hash}`,
    p_max: LIMITS[action],
    p_window: "1 hour",
  });
  if (error) throw new Error("Rate limit check failed");
  return data === true;
}
