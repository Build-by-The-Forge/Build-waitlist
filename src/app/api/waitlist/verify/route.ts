import { NextResponse, type NextRequest } from "next/server";
import { getSql } from "@/lib/db";
import { clientKey } from "@/lib/waitlist/request";
import { createSharedRateLimiter } from "@/lib/waitlist/shared-rate-limit";
import { verifyToken, type VerifyOutcome } from "@/lib/waitlist/verification";

export const runtime = "nodejs";

// Generous for people, tight enough to make token guessing pointless on top of 256-bit tokens.
const rateLimit = createSharedRateLimiter("verify", [
  { limit: 20, windowMs: 60_000 },
  { limit: 100, windowMs: 60 * 60_000 },
]);

function result(req: NextRequest, status: VerifyOutcome | "error" | "rate_limited") {
  // Redirect so the token doesn't linger in the address bar of the result page.
  const url = new URL(`/waitlist/verified?status=${status}`, req.nextUrl.origin);
  return NextResponse.redirect(url, { status: 303, headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
}

/** GET /api/waitlist/verify?token=... — the link (and button) in the verification email. */
export async function GET(req: NextRequest) {
  const limited = await rateLimit(clientKey(req));
  if (!limited.ok) return result(req, "rate_limited");

  const sql = getSql();
  if (!sql) {
    console.error("[waitlist] DATABASE_URL is not set; cannot verify.");
    return result(req, "error");
  }

  try {
    return result(req, await verifyToken(req.nextUrl.searchParams.get("token"), sql));
  } catch (err) {
    console.error("[waitlist] verification failed:", err instanceof Error ? err.message : err);
    return result(req, "error");
  }
}
