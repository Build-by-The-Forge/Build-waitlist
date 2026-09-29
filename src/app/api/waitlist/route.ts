import { NextResponse, type NextRequest } from "next/server";
import { site } from "@/lib/site";
import { isValidEmail, normalizeEmail } from "@/lib/waitlist/email";
import { createRateLimiter } from "@/lib/waitlist/rate-limit";
import { getWaitlistStore } from "@/lib/waitlist/store";
import type { WaitlistStatus } from "@/lib/waitlist/types";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 2_048;
/** Humans take longer than this to reach the form and type an email. */
const MIN_FILL_MS = 1_200;

const rateLimit = createRateLimiter([
  { limit: 5, windowMs: 60_000 },
  { limit: 20, windowMs: 60 * 60_000 },
]);

const allowedOrigins = new Set(
  [site.url, ...(process.env.WAITLIST_ALLOWED_ORIGINS ?? "").split(",")]
    .map((o) => o.trim().replace(/\/$/, ""))
    .filter(Boolean),
);

function reply(status: WaitlistStatus, httpStatus: number, headers?: Record<string, string>) {
  return NextResponse.json({ status }, { status: httpStatus, headers: { "Cache-Control": "no-store", ...headers } });
}

function clientKey(req: NextRequest) {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || req.headers.get("x-real-ip") || "unknown";
}

function isAllowedOrigin(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  if (allowedOrigins.has(origin)) return true;
  // Same-origin requests are fine on whatever domain the site is served from.
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try {
    return host !== null && new URL(origin).host === host;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  if (!isAllowedOrigin(req)) return reply("invalid", 403);
  if (!req.headers.get("content-type")?.includes("application/json")) return reply("invalid", 415);

  const limited = rateLimit(clientKey(req));
  if (!limited.ok) return reply("rate_limited", 429, { "Retry-After": String(limited.retryAfterSeconds) });

  // Refuse oversized bodies up front when the client declares a length, and
  // re-check after reading in case it didn't (or lied).
  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > MAX_BODY_BYTES) return reply("invalid", 413);

  const text = await req.text();
  if (text.length > MAX_BODY_BYTES) return reply("invalid", 413);

  let body: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(text);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return reply("invalid", 400);
    body = parsed as Record<string, unknown>;
  } catch {
    return reply("invalid", 400);
  }

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
