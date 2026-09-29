import { NextResponse, type NextRequest } from "next/server";
import { getSql } from "@/lib/db";
import { getEmailProvider } from "@/lib/email";
import { site } from "@/lib/site";
import { isValidEmail, normalizeEmail } from "@/lib/waitlist/email";
import { clientKey, isAllowedOrigin, readJsonBody } from "@/lib/waitlist/request";
import { createSharedRateLimiter } from "@/lib/waitlist/shared-rate-limit";
import { resendVerification } from "@/lib/waitlist/verification";

export const runtime = "nodejs";

// Layered with the per-address cooldown (60s) and daily cap (5) in the database.
const perIp = createSharedRateLimiter("resend-ip", [
  { limit: 3, windowMs: 60_000 },
  { limit: 10, windowMs: 60 * 60_000 },
]);
const perEmail = createSharedRateLimiter("resend-email", [{ limit: 3, windowMs: 60 * 60_000 }]);

type ResendStatus = "ok" | "invalid" | "rate_limited";

function reply(status: ResendStatus, httpStatus: number, headers?: Record<string, string>) {
  return NextResponse.json({ status }, { status: httpStatus, headers: { "Cache-Control": "no-store", ...headers } });
}

/**
 * POST /api/waitlist/verify/resend { email }
 *
 * Always answers "ok" for a well-formed address, whether it's pending,
 * verified or unknown, so it can't reveal who is on the waitlist. Only
 * pending addresses actually receive an email.
 */
export async function POST(req: NextRequest) {
  if (!isAllowedOrigin(req)) return reply("invalid", 403);
  if (!req.headers.get("content-type")?.includes("application/json")) return reply("invalid", 415);

  const ip = await perIp(clientKey(req));
  if (!ip.ok) return reply("rate_limited", 429, { "Retry-After": String(ip.retryAfterSeconds) });

  const body = await readJsonBody(req);
  if (body === "too_large") return reply("invalid", 413);
  if (!body) return reply("invalid", 400);
  if (typeof body.company === "string" && body.company.length > 0) return reply("ok", 202);
  if (!isValidEmail(body.email)) return reply("invalid", 422);

  const emailNormalized = normalizeEmail(body.email);
  // Per-address limit answers "ok" too: a 429 here would confirm the address exists.
  if (!(await perEmail(emailNormalized)).ok) return reply("ok", 202);

  const sql = getSql();
  if (!sql) {
    console.error("[waitlist] DATABASE_URL is not set; cannot resend.");
    return reply("ok", 202);
  }

  try {
    await resendVerification(emailNormalized, { sql, email: getEmailProvider(), siteUrl: site.url });
  } catch (err) {
    console.error("[waitlist] resend failed:", err instanceof Error ? err.message : err);
  }
  return reply("ok", 202);
}
