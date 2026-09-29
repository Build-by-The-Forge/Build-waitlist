/**
 * Sign-in authorization policy for the admin dashboard.
 *
 * Authentication (Google says who you are) never grants access on its own.
 * Access requires an ACTIVE row in waitlist.admin_users. This module is the
 * pure decision; the database side lives in ./admins.ts.
 */

export type AdminRecord = {
  id: number;
  email: string;
  providerSubject: string | null;
  status: "active" | "disabled";
};

export type SignInAttempt = {
  /** OAuth "sub": Google's stable account id. */
  subject: string;
  email: string;
  emailVerified: boolean;
};

export type SignInContext = {
  /** Admin already bound to this Google account, if any. */
  bySubject: AdminRecord | null;
  /** Admin provisioned under this email, if any. */
  byEmail: AdminRecord | null;
  /** Rows in admin_users, any status. */
  adminCount: number;
  /** ADMIN_BOOTSTRAP_EMAIL, normalized; null when unset. */
  bootstrapEmail: string | null;
};

export type SignInDecision =
  | { kind: "allow"; adminId: number }
  | { kind: "bind"; adminId: number }
  | { kind: "bootstrap" }
  | { kind: "deny"; reason: DenyReason };

export type DenyReason = "disabled" | "unverified_email" | "subject_mismatch" | "not_authorized";

export const normalizeAdminEmail = (email: string) => email.trim().toLowerCase();

export function decideSignIn(attempt: SignInAttempt, ctx: SignInContext): SignInDecision {
  // 1. Known identity: the OAuth subject is authoritative, not the email.
  if (ctx.bySubject) {
    return ctx.bySubject.status === "active"
      ? { kind: "allow", adminId: ctx.bySubject.id }
      : { kind: "deny", reason: "disabled" };
  }

  // Everything below trusts the email address, so Google must have verified it.
  if (!attempt.emailVerified) return { kind: "deny", reason: "unverified_email" };
  const email = normalizeAdminEmail(attempt.email);

  // 2. Admin provisioned by email who hasn't signed in yet: bind this identity.
  if (ctx.byEmail) {
    if (ctx.byEmail.status !== "active") return { kind: "deny", reason: "disabled" };
    // Already bound to a different Google account (e.g. the address was
    // recycled or re-registered): never silently re-bind.
    if (ctx.byEmail.providerSubject) return { kind: "deny", reason: "subject_mismatch" };
    return { kind: "bind", adminId: ctx.byEmail.id };
  }

  // 3. First-ever sign-in: only the configured bootstrap email, only while the
  //    admin table is completely empty. Replacing an admin later is a deliberate
  //    database operation, not something a login can trigger.
  if (ctx.adminCount === 0 && ctx.bootstrapEmail && email === ctx.bootstrapEmail) {
    return { kind: "bootstrap" };
  }

  return { kind: "deny", reason: "not_authorized" };
}
