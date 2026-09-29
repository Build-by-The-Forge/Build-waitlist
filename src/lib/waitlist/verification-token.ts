import { createHash, randomBytes } from "node:crypto";

/**
 * Email verification tokens.
 *
 * The raw token (32 random bytes, base64url) exists only in the emailed link.
 * The database stores its SHA-256 hash, so a database leak can't be replayed
 * as working verification links. A fast hash is fine here: with 256 bits of
 * entropy there is nothing to brute-force.
 */
const TOKEN_BYTES = 32;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/; // 32 bytes in unpadded base64url

export const DEFAULT_TTL_HOURS = 24;

export function generateToken(): string {
  return randomBytes(TOKEN_BYTES).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

/** Cheap shape check so junk never reaches the database. */
export function isWellFormedToken(token: unknown): token is string {
  return typeof token === "string" && TOKEN_PATTERN.test(token);
}

export function tokenTtlHours(): number {
  const n = Number(process.env.VERIFICATION_TOKEN_TTL_HOURS);
  return Number.isFinite(n) && n > 0 && n <= 168 ? n : DEFAULT_TTL_HOURS;
}

export function tokenExpiry(from: Date = new Date(), ttlHours: number = tokenTtlHours()): Date {
  return new Date(from.getTime() + ttlHours * 60 * 60 * 1000);
}

/** The link emailed to the user. Carries only the opaque token, never the address. */
export function verificationUrl(siteUrl: string, token: string): string {
  const url = new URL("/api/waitlist/verify", siteUrl);
  url.searchParams.set("token", token);
  return url.toString();
}
