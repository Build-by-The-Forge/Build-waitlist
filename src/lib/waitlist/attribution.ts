/**
 * Remembers which "Join the Waitlist" button brought the visitor to the form,
 * so signups record where they came from (hero, navbar, ...) instead of only
 * the form's own location. Per tab, and never required: storage can be
 * unavailable (private mode, blocked site data), in which case we fall back.
 */
const KEY = "build:waitlist-cta";

export function rememberCta(location: string) {
  try {
    sessionStorage.setItem(KEY, location);
  } catch {
    // Attribution is best-effort.
  }
}

export function ctaSource(fallback: string): string {
  try {
    return sessionStorage.getItem(KEY) || fallback;
  } catch {
    return fallback;
  }
}
