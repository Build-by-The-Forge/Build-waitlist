import { NextResponse, type NextRequest } from "next/server";
import { isValidEmail, normalizeEmail } from "@/lib/waitlist/email";
import { createRateLimiter } from "@/lib/waitlist/rate-limit";
import { clientKey, isAllowedOrigin, readJsonBody } from "@/lib/waitlist/request";
import { getWaitlistStore } from "@/lib/waitlist/store";
import type { WaitlistStatus } from "@/lib/waitlist/types";

export const runtime = "nodejs";

/** Humans take longer than this to reach the form and type an email. */
const MIN_FILL_MS = 1_200;

const rateLimit = createRateLimiter([
  { limit: 5, windowMs: 60_000 },
  { limit: 20, windowMs: 60 * 60_000 },
]);

function reply(status: WaitlistStatus, httpStatus: number, headers?: Record<string, string>) {
  return NextResponse.json({ status }, { status: httpStatus, headers: { "Cache-Control": "no-store", ...headers } });
}

export async function POST(req: NextRequest) {
  if (!isAllowedOrigin(req)) return reply("invalid", 403);
  if (!req.headers.get("content-type")?.includes("application/json")) return reply("invalid", 415);

  const limited = rateLimit(clientKey(req));
  if (!limited.ok) return reply("rate_limited", 429, { "Retry-After": String(limited.retryAfterSeconds) });

  const body = await readJsonBody(req);
  if (body === "too_large") return reply("invalid", 413);
  if (!body) return reply("invalid", 400);

  // Bot traps: a hidden field humans never fill, and an implausibly fast submit.
  // Answer as if it worked so bots get no signal to adapt to.
  const elapsed = typeof body.elapsedMs === "number" ? body.elapsedMs : 0;
  if ((typeof body.company === "string" && body.company.length > 0) || elapsed < MIN_FILL_MS) {
    return reply("created", 201);
  }

  if (!isValidEmail(body.email)) return reply("invalid", 422);
  const email = body.email.trim();
  const source = typeof body.source === "string" && /^[a-z0-9_-]{1,64}$/i.test(body.source) ? body.source : null;

  try {
    const result = await getWaitlistStore().add({ email, emailNormalized: normalizeEmail(email), source });
    return result === "created" ? reply("created", 201) : reply("duplicate", 200);
  } catch (err) {
    console.error("[waitlist] failed to store signup:", err instanceof Error ? err.message : err);
    return reply("error", 500);
  }
}
