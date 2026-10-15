import "server-only";
import { createHash, randomBytes } from "node:crypto";

// Private results links (/r/<token>): 32 random bytes, base64url. Only the SHA-256 is stored, so a
// database leak can't be turned back into working links. Never log a token.

export const newToken = () => randomBytes(32).toString("base64url");

/** True for something shaped like one of our tokens; anything else is a 404 without a DB call. */
export const isToken = (t: string) => /^[A-Za-z0-9_-]{43}$/.test(t);

/** bytea literal for PostgREST. */
export const tokenHash = (t: string) => `\\x${createHash("sha256").update(t).digest("hex")}`;
