import "server-only";

/** Verifies a Turnstile token on the server (single use). Fails closed if the secret is missing. */
export async function verifyTurnstile(token: unknown, ip: string | null) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) throw new Error("TURNSTILE_SECRET_KEY is not set");
  if (typeof token !== "string" || token.length === 0 || token.length > 2048) return false;
  const body = new URLSearchParams({ secret, response: token });
  if (ip) body.set("remoteip", ip);
  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body });
  if (!res.ok) return false;
  return ((await res.json()) as { success?: boolean }).success === true;
}
