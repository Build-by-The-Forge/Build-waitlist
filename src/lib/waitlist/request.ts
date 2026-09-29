import type { NextRequest } from "next/server";
import { site } from "@/lib/site";

/** Shared guards for the public waitlist endpoints. */

export const MAX_BODY_BYTES = 2_048;

const allowedOrigins = new Set(
  [site.url, ...(process.env.WAITLIST_ALLOWED_ORIGINS ?? "").split(",")]
    .map((o) => o.trim().replace(/\/$/, ""))
    .filter(Boolean),
);

export function clientKey(req: NextRequest) {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || req.headers.get("x-real-ip") || "unknown";
}

export function isAllowedOrigin(req: NextRequest) {
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

/**
 * Reads a small JSON object body. Refuses oversized bodies up front when the
 * client declares a length, and re-checks after reading in case it didn't.
 */
export async function readJsonBody(req: NextRequest): Promise<Record<string, unknown> | "too_large" | null> {
  if (Number(req.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) return "too_large";
  const text = await req.text();
  if (text.length > MAX_BODY_BYTES) return "too_large";
  try {
    const parsed: unknown = JSON.parse(text);
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}
