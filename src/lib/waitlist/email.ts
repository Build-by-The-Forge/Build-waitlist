export const MAX_EMAIL_LENGTH = 254;

// Pragmatic check: one @, no whitespace, a dotted domain ending in a 2+ letter TLD.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[a-z]{2,}$/i;

/** Providers where dots in the local part are ignored and +tags reach the same inbox. */
const GMAIL_DOMAINS = new Set(["gmail.com", "googlemail.com"]);

export function isValidEmail(raw: unknown): raw is string {
  if (typeof raw !== "string") return false;
  const email = raw.trim();
  if (email.length === 0 || email.length > MAX_EMAIL_LENGTH) return false;
  if (!EMAIL_PATTERN.test(email)) return false;
  const local = email.slice(0, email.lastIndexOf("@"));
  return local.length <= 64 && !local.startsWith(".") && !local.endsWith(".") && !local.includes("..");
}

/**
 * Canonical form used for the uniqueness constraint.
 * Lowercases everything; for Gmail, also strips dots and +tags so
 * a.b+x@gmail.com and ab@gmail.com count as one signup.
 */
export function normalizeEmail(raw: string): string {
  const email = raw.trim().toLowerCase();
  const at = email.lastIndexOf("@");
  let local = email.slice(0, at);
  let domain = email.slice(at + 1);
  if (GMAIL_DOMAINS.has(domain)) {
    local = local.split("+")[0].replace(/\./g, "");
    domain = "gmail.com";
  }
  return `${local}@${domain}`;
}
