import { describe, expect, it } from "vitest";
import { createSharedRateLimiter, windowStart } from "./shared-rate-limit";

describe("windowStart", () => {
  it("floors to the window boundary", () => {
    expect(windowStart(125_000, 60_000)).toBe(120_000);
    expect(windowStart(120_000, 60_000)).toBe(120_000);
  });
});

describe("createSharedRateLimiter without a database", () => {
  it("falls back to the in-memory limiter", async () => {
    const check = createSharedRateLimiter("t", [{ limit: 2, windowMs: 60_000 }], { sql: () => null, now: () => 0 });
    expect((await check("ip")).ok).toBe(true);
    expect((await check("ip")).ok).toBe(true);
    expect((await check("ip")).ok).toBe(false);
    expect((await check("other")).ok).toBe(true);
  });
});
