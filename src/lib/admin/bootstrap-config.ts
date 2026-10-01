import { normalizeAdminEmail } from "./authorize";

/**
 * Deployment-time admin seeds: up to three Google accounts, by email, that
 * may bootstrap themselves as administrators. This is not an admin-management
 * system: once an account has bootstrapped, the database (keyed by Google's
 * permanent account id) is the source of truth, and seeding closes for good
 * once three admin records exist.
 *
 *   ADMIN_BOOTSTRAP_EMAIL_1, ADMIN_BOOTSTRAP_EMAIL_2, ADMIN_BOOTSTRAP_EMAIL_3
 *
 * The legacy single ADMIN_BOOTSTRAP_EMAIL is still read when none of the
 * numbered variables is set, so existing deployments keep working.
 */
export const MAX_BOOTSTRAP_EMAILS = 3;

export type BootstrapConfig = {
  /** Normalized, de-duplicated, valid addresses. Never logged or sent to the browser. */
  emails: string[];
  /** Counts only, safe to log: what was dropped and why. */
  ignored: { duplicates: number; invalid: number };
};

const LOOKS_LIKE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseBootstrapConfig(env: Record<string, string | undefined> = process.env): BootstrapConfig {
  const numbered = Array.from({ length: MAX_BOOTSTRAP_EMAILS }, (_, i) => env[`ADMIN_BOOTSTRAP_EMAIL_${i + 1}`]);
  const raw = numbered.some((v) => v?.trim()) ? numbered : [env.ADMIN_BOOTSTRAP_EMAIL];

  const emails: string[] = [];
  const ignored = { duplicates: 0, invalid: 0 };
  for (const value of raw) {
    if (!value?.trim()) continue;
    const email = normalizeAdminEmail(value);
    if (!LOOKS_LIKE_EMAIL.test(email)) ignored.invalid++;
    else if (emails.includes(email)) ignored.duplicates++;
    else emails.push(email);
  }
  return { emails, ignored };
}
