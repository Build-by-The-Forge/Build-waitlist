import { NextResponse, type NextRequest } from "next/server";
import { getSql } from "@/lib/db";
import { EmailNotConfiguredError, getEmailRouter } from "@/lib/email";
import { site } from "@/lib/site";
import { mailDomainAccepts } from "@/lib/waitlist/domain";
import { isValidEmail, normalizeEmail } from "@/lib/waitlist/email";
import { clientKey, isAllowedOrigin, readJsonBody } from "@/lib/waitlist/request";
import { createSharedRateLimiter } from "@/lib/waitlist/shared-rate-limit";
import type { WaitlistStatus } from "@/lib/waitlist/types";
import { requestSignup } from "@/lib/waitlist/verification";

export const runtime = "nodejs";

/** Humans take longer than this to reach the form and type an email. */
const MIN_FILL_MS = 1_200;

const rateLimit = createSharedRateLimiter("signup", [
  { limit: 5, windowMs: 60_000 },
  { limit: 20, windowMs: 60 * 60_000 },
]);

function reply(status: WaitlistStatus, httpStatus: number, headers?: Record<string, string>) {
  return NextResponse.json({ status }, { status: httpStatus, headers: { "Cache-Control": "no-store", ...headers } });
}

/**
 * Public signup. A new or still-pending address gets a verification email;
 * it only counts as a confirmed waitlist member once that link is clicked.
 */
export async function POST(req: NextRequest) {
  if (!isAllowedOrigin(req)) return reply("invalid", 403);
  if (!req.headers.get("content-type")?.includes("application/json")) return reply("invalid", 415);

  const limited = await rateLimit(clientKey(req));
  if (!limited.ok) return reply("rate_limited", 429, { "Retry-After": String(limited.retryAfterSeconds) });

  const body = await readJsonBody(req);
  if (body === "too_large") return reply("invalid", 413);
  if (!body) return reply("invalid", 400);

  // Bot traps: a hidden field humans never fill, and an implausibly fast submit.
  // Answer as if it worked so bots get no signal to adapt to.
  const elapsed = typeof body.elapsedMs === "number" ? body.elapsedMs : 0;
  if ((typeof body.company === "string" && body.company.length > 0) || elapsed < MIN_FILL_MS) {
    return reply("verification_sent", 202);
  }

  if (!isValidEmail(body.email)) return reply("invalid", 422);
  const email = body.email.trim();
  const source = typeof body.source === "string" && /^[a-z0-9_-]{1,64}$/i.test(body.source) ? body.source : null;

  if (!(await mailDomainAccepts(email))) return reply("invalid_domain", 422);

  const sql = getSql();
  if (!sql) {
    console.error("[waitlist] DATABASE_URL is not set; email verification needs Postgres.");
    return reply("error", 500);
  }

  try {
    const outcome = await requestSignup(
      { email, emailNormalized: normalizeEmail(email), source },
      { sql, email: getEmailRouter(), siteUrl: site.url },
    );
    if (outcome === "already_verified") return reply("duplicate", 200);
    if (outcome === "send_failed") return reply("email_failed", 503, { "Retry-After": "30" });
    return reply("verification_sent", 202);
  } catch (err) {
    console.error("[waitlist] signup failed:", err instanceof Error ? err.message : err);
    // Misconfigured email reads like any other send failure to the visitor.
    if (err instanceof EmailNotConfiguredError) return reply("email_failed", 503, { "Retry-After": "30" });
    return reply("error", 500);
  }
}
