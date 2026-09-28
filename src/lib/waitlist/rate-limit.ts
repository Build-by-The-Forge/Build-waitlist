/**
 * Sliding-window, in-memory rate limiter keyed by client identifier.
 * Per-instance only: on multi-instance or serverless hosting, pair it with a
 * platform/edge rate limit or swap it for a shared store (Redis, Postgres).
 */
export type RateLimitRule = { limit: number; windowMs: number };

export function createRateLimiter(rules: RateLimitRule[], now: () => number = Date.now) {
  const hits = new Map<string, number[]>();
  const longest = Math.max(...rules.map((r) => r.windowMs));
  let lastSweep = now();

  return function check(key: string): { ok: boolean; retryAfterSeconds: number } {
    const t = now();

    if (t - lastSweep > longest) {
      for (const [k, stamps] of hits) {
        if (stamps[stamps.length - 1] <= t - longest) hits.delete(k);
      }
      lastSweep = t;
    }

    const stamps = (hits.get(key) ?? []).filter((s) => s > t - longest);
    for (const rule of rules) {
      const inWindow = stamps.filter((s) => s > t - rule.windowMs);
      if (inWindow.length >= rule.limit) {
        hits.set(key, stamps);
        return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil((inWindow[0] + rule.windowMs - t) / 1000)) };
      }
    }
    stamps.push(t);
    hits.set(key, stamps);
    return { ok: true, retryAfterSeconds: 0 };
  };
}
