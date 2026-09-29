/**
 * Integration tests against a real Postgres with migrations applied.
 * Run with: TEST_DATABASE_URL=postgres://... npx vitest run verification.integration
 * Skipped when TEST_DATABASE_URL is unset. Deletes rows it creates (test-*.invalid).
 */
import postgres from "postgres";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { memoryProvider } from "@/lib/email/dev-providers";
import { createSharedRateLimiter } from "./shared-rate-limit";
import { requestSignup, resendVerification, verifyToken, type VerificationDeps } from "./verification";
import { hashToken } from "./verification-token";

const url = process.env.TEST_DATABASE_URL;
const sql = url ? postgres(url, { max: 4, onnotice: () => {} }) : (null as unknown as postgres.Sql);
const SITE = "https://build.test";

const tokenFrom = (text: string) => new URL(text.match(/https:\/\/build\.test\S+/)![0]).searchParams.get("token")!;
const row = async (email: string) =>
  (await sql`SELECT * FROM waitlist.signups WHERE email_normalized = ${email}`)[0] as Record<string, unknown> | undefined;

describe.skipIf(!url)("email verification (Postgres)", () => {
  let email: ReturnType<typeof memoryProvider>;
  let deps: VerificationDeps;
  let n = 0;
  const addr = () => `test-${Date.now()}-${n++}@verify.invalid`;
  const signup = (e: string) => requestSignup({ email: e, emailNormalized: e, source: "hero" }, deps);

  beforeEach(() => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    email = memoryProvider();
    deps = { sql, email, siteUrl: SITE };
  });

  afterAll(async () => {
    if (!url) return;
    await sql`DELETE FROM waitlist.signups WHERE email LIKE 'test-%@verify.invalid'`;
    await sql`DELETE FROM waitlist.rate_limits WHERE bucket LIKE '%'`;
    await sql.end();
  });

  it("new email → one pending row, one email, only the hash stored", async () => {
    const e = addr();
    expect(await signup(e)).toBe("verification_sent");
    const r = await row(e);
    expect(r?.verification_status).toBe("pending");
    expect(email.sent).toHaveLength(1);
    const token = tokenFrom(email.sent[0].text);
    expect(r?.verification_token_hash).toBe(hashToken(token));
    expect(JSON.stringify(r)).not.toContain(token);
  });

  it("pending → verified via the emailed link; link is single-use", async () => {
    const e = addr();
    await signup(e);
    const token = tokenFrom(email.sent[0].text);
    expect(await verifyToken(token, sql)).toBe("verified");
    const r = await row(e);
    expect(r?.verification_status).toBe("verified");
    expect(r?.verified_at).toBeInstanceOf(Date);
    expect(r?.verification_token_hash).toBeNull();
    expect(r?.verification_token_expires_at).toBeNull();
    expect(await verifyToken(token, sql)).toBe("invalid");
  });

  it("rejects missing, malformed, unknown and expired tokens", async () => {
    expect(await verifyToken(undefined, sql)).toBe("invalid");
    expect(await verifyToken("nope", sql)).toBe("invalid");
    expect(await verifyToken("a".repeat(43), sql)).toBe("invalid");

    const e = addr();
    await signup(e);
    const token = tokenFrom(email.sent[0].text);
    await sql`UPDATE waitlist.signups SET verification_token_expires_at = now() - interval '1 minute' WHERE email_normalized = ${e}`;
    expect(await verifyToken(token, sql)).toBe("expired");
    expect((await row(e))?.verification_status).toBe("pending");
  });

  it("same pending email again → no new row; cooldown suppresses a second email", async () => {
    const e = addr();
    await signup(e);
    expect(await signup(e)).toBe("verification_sent");
    const [{ count }] = await sql`SELECT count(*)::int AS count FROM waitlist.signups WHERE email_normalized = ${e}`;
    expect(count).toBe(1);
    expect(email.sent).toHaveLength(1);
  });

  it("after the cooldown, a new link replaces the old one", async () => {
    const e = addr();
    await signup(e);
    const first = tokenFrom(email.sent[0].text);
    await sql`UPDATE waitlist.signups SET verification_sent_at = now() - interval '2 minutes' WHERE email_normalized = ${e}`;
    await signup(e);
    expect(email.sent).toHaveLength(2);
    const second = tokenFrom(email.sent[1].text);
    expect(await verifyToken(first, sql)).toBe("invalid");
    expect(await verifyToken(second, sql)).toBe("verified");
  });

  it("verified email → duplicate, no email", async () => {
    const e = addr();
    await signup(e);
    await verifyToken(tokenFrom(email.sent[0].text), sql);
    expect(await signup(e)).toBe("already_verified");
    expect(email.sent).toHaveLength(1);
  });

  it("caps sends per address per day", async () => {
    const e = addr();
    for (let i = 0; i < 8; i++) {
      await signup(e);
      await sql`UPDATE waitlist.signups SET verification_sent_at = now() - interval '2 minutes' WHERE email_normalized = ${e}`;
    }
    expect(email.sent).toHaveLength(5);
  });

  it("concurrent requests for one address send exactly one email", async () => {
    const e = addr();
    await Promise.all(Array.from({ length: 5 }, () => signup(e)));
    expect(email.sent).toHaveLength(1);
    const [{ count }] = await sql`SELECT count(*)::int AS count FROM waitlist.signups WHERE email_normalized = ${e}`;
    expect(count).toBe(1);
  });

  it("delivery failure → send_failed, row kept, immediate retry allowed", async () => {
    const e = addr();
    email.failNext = "transient";
    expect(await signup(e)).toBe("send_failed");
    expect((await row(e))?.verification_status).toBe("pending");
    expect(await signup(e)).toBe("verification_sent");
    expect(email.sent).toHaveLength(1);
  });

  it("resend: emails pending addresses only, silently ignores others", async () => {
    const pending = addr();
    await signup(pending);
    await sql`UPDATE waitlist.signups SET verification_sent_at = now() - interval '2 minutes' WHERE email_normalized = ${pending}`;
    await resendVerification(pending, deps);
    expect(email.sent).toHaveLength(2);

    await resendVerification(addr(), deps); // unknown address
    const verified = addr();
    await signup(verified);
    await verifyToken(tokenFrom(email.sent[2].text), sql);
    await resendVerification(verified, deps); // already verified
    expect(email.sent).toHaveLength(3);
  });

  it("shared rate limiter enforces limits through the database", async () => {
    const check = createSharedRateLimiter(`itest-${Date.now()}`, [{ limit: 3, windowMs: 60_000 }], { sql: () => sql });
    const results = [];
    for (let i = 0; i < 5; i++) results.push((await check("1.2.3.4")).ok);
    expect(results).toEqual([true, true, true, false, false]);
    expect((await check("5.6.7.8")).ok).toBe(true);
    const stored = await sql`SELECT bucket FROM waitlist.rate_limits`;
    expect(stored.some((r) => String(r.bucket).includes("1.2.3.4"))).toBe(false);
  });
});
