import { describe, expect, it } from "vitest";
import { createRateLimiter } from "./rate-limit";

function clock(start = 0) {
  let t = start;
  return { now: () => t, advance: (ms: number) => (t += ms) };
}

describe("createRateLimiter", () => {
  it("allows up to the limit, then blocks with a retry hint", () => {
    const c = clock();
    const check = createRateLimiter([{ limit: 3, windowMs: 60_000 }], c.now);
    expect([check("a").ok, check("a").ok, check("a").ok]).toEqual([true, true, true]);
    const blocked = check("a");
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSeconds).toBe(60);
  });

  it("tracks keys independently", () => {
    const check = createRateLimiter([{ limit: 1, windowMs: 60_000 }], clock().now);
    expect(check("a").ok).toBe(true);
    expect(check("b").ok).toBe(true);
    expect(check("a").ok).toBe(false);
  });

  it("frees capacity as the window slides", () => {
    const c = clock();
    const check = createRateLimiter([{ limit: 2, windowMs: 1_000 }], c.now);
    check("a");
    c.advance(600);
    check("a");
    expect(check("a").ok).toBe(false);
    c.advance(401); // first hit is now outside the window
    expect(check("a").ok).toBe(true);
  });

  it("enforces every rule", () => {
    const c = clock();
    const check = createRateLimiter(
      [
        { limit: 5, windowMs: 1_000 },
        { limit: 6, windowMs: 60_000 },
      ],
      c.now,
    );
    for (let i = 0; i < 5; i++) check("a");
    c.advance(1_001);
    expect(check("a").ok).toBe(true); // 6th in the hour
    c.advance(1_001);
    const blocked = check("a"); // 7th in the hour
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(50);
  });

  it("does not count blocked attempts against the caller", () => {
    const c = clock();
    const check = createRateLimiter([{ limit: 1, windowMs: 1_000 }], c.now);
    check("a");
    for (let i = 0; i < 10; i++) check("a");
    c.advance(1_001);
    expect(check("a").ok).toBe(true);
  });
});
