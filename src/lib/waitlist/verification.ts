import { randomUUID } from "node:crypto";
import type postgres from "postgres";
import type { DeliveryAttempt, EmailRouter } from "@/lib/email";
import { waitlistVerificationEmail } from "@/lib/email/templates/waitlist-verification";
import { generateToken, hashToken, isWellFormedToken, tokenTtlHours, verificationUrl } from "./verification-token";

/**
 * Email verification for waitlist signups.
 *
 * Invariant: a signup is a confirmed waitlist member only once the owner of
 * the address clicks the emailed link. Everything here is database-backed and
 * race-safe, so it behaves the same on one server or many serverless instances.
 */

export type VerificationDeps = {
  sql: postgres.Sql;
  /** Always the router, never a provider: the service doesn't know who delivers. */
  email: EmailRouter;
  siteUrl: string;
};

export type SignupOutcome = "verification_sent" | "already_verified" | "send_failed";
export type VerifyOutcome = "verified" | "expired" | "invalid";

const envInt = (name: string, fallback: number, min: number, max: number) => {
  const n = Number(process.env[name]);
  return Number.isInteger(n) && n >= min && n <= max ? n : fallback;
};

/** Minimum gap between verification emails to one address. */
export const resendCooldownSeconds = () => envInt("VERIFICATION_RESEND_COOLDOWN_SECONDS", 60, 10, 3600);
/** Maximum verification emails to one address per rolling 24 hours. */
export const maxSendsPerDay = () => envInt("VERIFICATION_MAX_SENDS_PER_DAY", 5, 1, 50);

/** Structured operational log. Never includes addresses or tokens. */
export function logEvent(event: string, fields: Record<string, string | number | boolean> = {}) {
  console.info(JSON.stringify({ event, ...fields }));
}

const MESSAGE_TYPE = "waitlist-verification";

/** Best effort: tracking must never block or fail a signup. */
async function recordDeliveries(sql: postgres.Sql, messageId: string, signupId: string, attempts: DeliveryAttempt[]) {
  for (const a of attempts) {
    await sql`
      INSERT INTO waitlist.email_deliveries
        (message_id, signup_id, message_type, provider, status, failure_class, error_code, provider_message_id)
      VALUES (${messageId}, ${signupId}, ${MESSAGE_TYPE}, ${a.provider}, ${a.ok ? "sent" : "failed"},
              ${a.ok ? null : (a.failure ?? "unknown")}, ${a.errorCode ?? null}, ${a.providerMessageId ?? null})
      ON CONFLICT (message_id, provider) DO NOTHING`.catch((err: unknown) =>
      console.error("[email] could not record delivery attempt:", err instanceof Error ? err.message : err),
    );
  }
}

type SignupRow = { id: string; email: string; verification_status: "pending" | "verified" };

/**
 * POST /api/waitlist: create the pending signup if new, then (re)send the
 * verification email. A pending address signing up again gets a fresh link,
 * never a second row.
 */
export async function requestSignup(
  input: { email: string; emailNormalized: string; source: string | null },
  deps: VerificationDeps,
): Promise<SignupOutcome> {
  const { sql } = deps;
  const inserted = await sql<SignupRow[]>`
    INSERT INTO waitlist.signups (email, email_normalized, source)
    VALUES (${input.email}, ${input.emailNormalized}, ${input.source})
    ON CONFLICT (email_normalized) DO NOTHING
    RETURNING id, email, verification_status`;
  const row =
    inserted[0] ??
    (
      await sql<SignupRow[]>`
        SELECT id, email, verification_status FROM waitlist.signups WHERE email_normalized = ${input.emailNormalized}`
    )[0];

  if (!row) throw new Error("signup row missing after upsert");
  if (row.verification_status === "verified") return "already_verified";

  logEvent("waitlist_verification_requested", { new_signup: inserted.length > 0 });
  return sendVerification(row, deps);
}

/**
 * POST /api/waitlist/verify/resend: only pending addresses get an email.
 * Callers must answer generically whatever this returns, so the endpoint
 * can't be used to discover who is on the waitlist.
 */
export async function resendVerification(emailNormalized: string, deps: VerificationDeps): Promise<void> {
  const [row] = await deps.sql<SignupRow[]>`
    SELECT id, email, verification_status FROM waitlist.signups
    WHERE email_normalized = ${emailNormalized} AND verification_status = 'pending'`;
  logEvent("waitlist_verification_resend_requested", { eligible: Boolean(row) });
  if (row) await sendVerification(row, deps);
}

/**
 * Issues a new token (invalidating the previous one) and emails it, subject to
 * the per-address cooldown and daily cap. When a limit applies, nothing is
 * sent but the outcome still reads "verification_sent", so a limited address
 * looks exactly like a successful one to the outside.
 */
async function sendVerification(row: SignupRow, deps: VerificationDeps): Promise<SignupOutcome> {
  const { sql } = deps;
  const token = generateToken();
  const ttl = tokenTtlHours();
  const cooldown = resendCooldownSeconds();
  const cap = maxSendsPerDay();

  // Atomic claim: only one concurrent request can pass the cooldown and cap
  // checks and install its token; the losers send nothing.
  const claimed = await sql<{ id: string }[]>`
    UPDATE waitlist.signups SET
      verification_token_hash       = ${hashToken(token)},
      verification_token_expires_at = now() + ${ttl}::float8 * interval '1 hour',
      verification_sent_at          = now(),
      verification_send_count       = CASE
        WHEN verification_window_start IS NULL OR verification_window_start < now() - interval '24 hours' THEN 1
        ELSE verification_send_count + 1 END,
      verification_window_start     = CASE
        WHEN verification_window_start IS NULL OR verification_window_start < now() - interval '24 hours' THEN now()
        ELSE verification_window_start END,
      updated_at                    = now()
    WHERE id = ${row.id}
      AND verification_status = 'pending'
      AND (verification_sent_at IS NULL OR verification_sent_at < now() - ${cooldown}::int * interval '1 second')
      AND (verification_window_start IS NULL
           OR verification_window_start < now() - interval '24 hours'
           OR verification_send_count < ${cap})
    RETURNING id`;

  if (claimed.length === 0) {
    logEvent("waitlist_verification_throttled");
    return "verification_sent";
  }

  // One logical email per claimed token. Both providers get the same id as
  // their idempotency key, and every attempt is recorded under it.
  const messageId = randomUUID();
  const message = {
    ...waitlistVerificationEmail({
      to: row.email,
      verifyUrl: verificationUrl(deps.siteUrl, token),
      siteUrl: deps.siteUrl,
      ttlHours: ttl,
      // Lets local development point the logo at a deployed copy of the site.
      assetBaseUrl: process.env.EMAIL_ASSET_BASE_URL || undefined,
    }),
    tag: MESSAGE_TYPE,
  };
  const result = await deps.email.send(message, { idempotencyKey: messageId }).catch(() => ({
    ok: false as const,
    provider: deps.email.name,
    failure: "unknown" as const,
    attempts: [] as DeliveryAttempt[],
  }));
  await recordDeliveries(sql, messageId, row.id, result.attempts);

  if (result.ok) {
    logEvent("waitlist_verification_sent", { provider: result.provider });
    return "verification_sent";
  }
  if (result.failure === "unknown") {
    // The provider may have accepted it. Treat as sent (keep the cooldown) so
    // we don't invite a duplicate; after the cooldown the person can resend.
    logEvent("waitlist_verification_send_unknown", { provider: result.provider });
    return "verification_sent";
  }
  // Definitely not sent. The pending row and token stay; clearing sent_at
  // lifts the cooldown so the person can retry straight away.
  await sql`UPDATE waitlist.signups SET verification_sent_at = NULL, updated_at = now() WHERE id = ${row.id}`.catch(() => {});
  logEvent("waitlist_verification_send_failed", { provider: result.provider, failure_class: result.failure });
  return "send_failed";
}

/**
 * GET /api/waitlist/verify: one atomic statement flips pending → verified and
 * clears the token, so a link works exactly once.
 */
export async function verifyToken(token: unknown, sql: postgres.Sql): Promise<VerifyOutcome> {
  if (!isWellFormedToken(token)) {
    logEvent("waitlist_verification_invalid", { reason: "malformed" });
    return "invalid";
  }
  const hash = hashToken(token);
  const verified = await sql`
    UPDATE waitlist.signups SET
      verification_status           = 'verified',
      verified_at                   = now(),
      verification_token_hash       = NULL,
      verification_token_expires_at = NULL,
      updated_at                    = now()
    WHERE verification_token_hash = ${hash}
      AND verification_status = 'pending'
      AND verification_token_expires_at > now()
    RETURNING id`;
  if (verified.length > 0) {
    logEvent("waitlist_verification_completed");
    return "verified";
  }

  // Still stored but not consumable: it can only have expired.
  const [stale] = await sql`SELECT 1 FROM waitlist.signups WHERE verification_token_hash = ${hash}`;
  logEvent("waitlist_verification_invalid", { reason: stale ? "expired" : "unknown_or_used" });
  return stale ? "expired" : "invalid";
}
