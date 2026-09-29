import "server-only";
import type postgres from "postgres";
import { getSql } from "@/lib/db";
import { decideSignIn, normalizeAdminEmail, type AdminRecord, type SignInAttempt, type SignInDecision } from "./authorize";

export const PROVIDER = "google";

type AdminRow = { id: string; email: string; provider_subject: string | null; status: "active" | "disabled" };

const toRecord = (r: AdminRow): AdminRecord => ({
  id: Number(r.id),
  email: r.email,
  providerSubject: r.provider_subject,
  status: r.status,
});

function requireSql(): postgres.Sql {
  const sql = getSql();
  if (!sql) throw new Error("The admin dashboard requires DATABASE_URL.");
  return sql;
}

export async function audit(adminId: number | null, action: string, detail: Record<string, unknown> = {}) {
  const sql = requireSql();
  await sql`INSERT INTO waitlist.admin_audit (admin_id, action, detail) VALUES (${adminId}, ${action}, ${sql.json(detail as postgres.JSONValue)})`;
}

/**
 * Runs the sign-in policy against the database and applies its outcome
 * (bind identity, bootstrap first admin, record login). Returns whether the
 * sign-in may proceed.
 */
export async function authorizeSignIn(attempt: SignInAttempt): Promise<SignInDecision> {
  const sql = requireSql();
  const email = normalizeAdminEmail(attempt.email);

  const [bySubject] = await sql<AdminRow[]>`
    SELECT id, email, provider_subject, status FROM waitlist.admin_users
    WHERE provider = ${PROVIDER} AND provider_subject = ${attempt.subject}`;
  const [byEmail] = await sql<AdminRow[]>`
    SELECT id, email, provider_subject, status FROM waitlist.admin_users WHERE email = ${email}`;
  const [{ count }] = await sql<{ count: string }[]>`SELECT count(*) FROM waitlist.admin_users`;

  const bootstrap = process.env.ADMIN_BOOTSTRAP_EMAIL;
  const decision = decideSignIn(attempt, {
    bySubject: bySubject ? toRecord(bySubject) : null,
    byEmail: byEmail ? toRecord(byEmail) : null,
    adminCount: Number(count),
    bootstrapEmail: bootstrap ? normalizeAdminEmail(bootstrap) : null,
  });

  switch (decision.kind) {
    case "allow":
      await sql`UPDATE waitlist.admin_users SET last_login_at = now() WHERE id = ${decision.adminId}`;
      await audit(decision.adminId, "sign_in");
      return decision;

    case "bind": {
      // Guarded so a concurrent bind can't overwrite an identity.
      const bound = await sql`
        UPDATE waitlist.admin_users SET provider_subject = ${attempt.subject}, last_login_at = now()
        WHERE id = ${decision.adminId} AND provider_subject IS NULL AND status = 'active'
        RETURNING id`;
      if (bound.length === 0) return { kind: "deny", reason: "not_authorized" };
      await audit(decision.adminId, "sign_in", { bound_identity: true });
      return decision;
    }

    case "bootstrap": {
      // Only inserts while the table is empty; the single-active-admin index
      // makes concurrent bootstrap attempts race-safe.
      const created = await sql<{ id: string }[]>`
        INSERT INTO waitlist.admin_users (email, provider, provider_subject, last_login_at)
        SELECT ${email}, ${PROVIDER}, ${attempt.subject}, now()
        WHERE NOT EXISTS (SELECT 1 FROM waitlist.admin_users)
        ON CONFLICT DO NOTHING
        RETURNING id`.catch(() => []);
      if (created.length === 0) return { kind: "deny", reason: "not_authorized" };
      await audit(Number(created[0].id), "bootstrap_admin");
      return decision;
    }

    case "deny":
      // Security trail for refused sign-ins. Stores the attempted address so
      // repeated probing is visible; nothing else about the person.
      await audit(null, "sign_in_denied", { reason: decision.reason, email });
      return decision;
  }
}

/** The active admin bound to this OAuth subject, or null. Checked on every admin request. */
export async function findActiveAdmin(subject: string): Promise<AdminRecord | null> {
  const sql = getSql();
  if (!sql) return null;
  const [row] = await sql<AdminRow[]>`
    SELECT id, email, provider_subject, status FROM waitlist.admin_users
    WHERE provider = ${PROVIDER} AND provider_subject = ${subject} AND status = 'active'`;
  return row ? toRecord(row) : null;
}
