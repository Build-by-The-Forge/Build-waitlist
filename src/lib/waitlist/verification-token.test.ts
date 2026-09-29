import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_TTL_HOURS,
  generateToken,
  hashToken,
  isWellFormedToken,
  tokenExpiry,
  tokenTtlHours,
  verificationUrl,
} from "./verification-token";

describe("generateToken", () => {
  it("produces 43-char base64url tokens", () => {
    const t = generateToken();
    expect(t).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(isWellFormedToken(t)).toBe(true);
  });

  it("does not repeat", () => {
    const seen = new Set(Array.from({ length: 1000 }, generateToken));
    expect(seen.size).toBe(1000);
  });
});

describe("hashToken", () => {
  it("is a deterministic SHA-256 hex digest that differs from the token", () => {
    const t = generateToken();
    expect(hashToken(t)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashToken(t)).toBe(hashToken(t));
    expect(hashToken(t)).not.toContain(t);
  });

  it("changes completely for a one-character difference", () => {
    const t = "a".repeat(43);
    expect(hashToken(t)).not.toBe(hashToken("a".repeat(42) + "b"));
  });
});

describe("isWellFormedToken", () => {
  it.each([undefined, null, 42, "", "short", "a".repeat(44), "a".repeat(42) + "=", "a".repeat(42) + "/", "a".repeat(42) + " "])(
    "rejects %j",
    (t) => {
      expect(isWellFormedToken(t)).toBe(false);
    },
  );
});

describe("token expiry", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("defaults to 24 hours", () => {
    expect(tokenTtlHours()).toBe(DEFAULT_TTL_HOURS);
    const from = new Date("2026-09-29T10:00:00Z");
    expect(tokenExpiry(from).toISOString()).toBe("2026-09-30T10:00:00.000Z");
  });

  it("honours a sane VERIFICATION_TOKEN_TTL_HOURS and ignores nonsense", () => {
    vi.stubEnv("VERIFICATION_TOKEN_TTL_HOURS", "2");
    expect(tokenTtlHours()).toBe(2);
    for (const bad of ["0", "-1", "abc", "10000"]) {
      vi.stubEnv("VERIFICATION_TOKEN_TTL_HOURS", bad);
      expect(tokenTtlHours()).toBe(DEFAULT_TTL_HOURS);
    }
  });
});

describe("verificationUrl", () => {
  it("points at the verify endpoint with only the token", () => {
    const url = new URL(verificationUrl("https://build.example", "tok_123"));
    expect(url.origin + url.pathname).toBe("https://build.example/api/waitlist/verify");
    expect([...url.searchParams.keys()]).toEqual(["token"]);
    expect(url.searchParams.get("token")).toBe("tok_123");
  });
});
