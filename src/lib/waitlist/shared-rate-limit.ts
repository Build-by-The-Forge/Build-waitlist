import { createHash } from "node:crypto";
import type postgres from "postgres";
import { getSql } from "@/lib/db";
import { createRateLimiter, type RateLimitRule } from "./rate-limit";

export type RateLimitResult = { ok: boolean; retryAfterSeconds: number };
export type SharedRateLimiter = (key: string) => Promise<RateLimitResult>;

/** Start of the fixed window containing `now`. */
export function windowStart(now: number, windowMs: number): number {
  return Math.floor(now / windowMs) * windowMs;
}

function bucketFor(name: string, key: string): string {
  // Salted so stored buckets can't be reversed to IPs or emails by dictionary.
  const salt = process.env.RATE_LIMIT_SALT || process.env.AUTH_SECRET || "build-waitlist";
  return createHash("sha256").update(`${salt}:${name}:${key}`).digest("hex");
}

/**
 * Fixed-window limiter backed by waitlist.rate_limits, so limits hold across
 * serverless instances. Every attempt counts, including blocked ones.
 * Without DATABASE_URL (local development) it falls back to the in-memory
 * limiter. Database errors fail open: a limiter hiccup must not block signups.
 */
export function createSharedRateLimiter(
  name: string,
  rules: RateLimitRule[],
  opts: { sql?: () => postgres.Sql | null; now?: () => number } = {},
): SharedRateLimiter {
  const getDb = opts.sql ?? getSql;
  const now = opts.now ?? Date.now;
  const memory = createRateLimiter(rules, now);

  return async (key: string) => {
    const sql = getDb();
    if (!sql) return memory(key);

    const t = now();
    const bucket = bucketFor(name, key);
    try {
      let retryAfter = 0;
      for (const rule of rules) {
        const start = windowStart(t, rule.windowMs);
        const [{ hits }] = await sql<{ hits: number }[]>`
          INSERT INTO waitlist.rate_limits (bucket, window_start, hits)
          VALUES (${`${bucket}:${rule.windowMs}`}, ${new Date(start)}, 1)
          ON CONFLICT (bucket, window_start) DO UPDATE SET hits = waitlist.rate_limits.hits + 1
          RETURNING hits`;
        if (hits > rule.limit) {
          retryAfter = Math.max(retryAfter, Math.ceil((start + rule.windowMs - t) / 1000), 1);
        }
      }
      if (Math.random() < 0.01) {
        await sql`DELETE FROM waitlist.rate_limits WHERE window_start < now() - interval '2 days'`.catch(() => {});
      }
      return retryAfter > 0 ? { ok: false, retryAfterSeconds: retryAfter } : { ok: true, retryAfterSeconds: 0 };
    } catch (err) {
      console.error(`[rate-limit:${name}] failing open:`, err instanceof Error ? err.message : err);
      return { ok: true, retryAfterSeconds: 0 };
    }
  };
}
